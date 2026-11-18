import type { CreateValidationInput, Validation } from '../../domain/entities/validation.js'
import { AppError } from '../../domain/errors/app-error.js'
import type { CountryGateway } from '../../domain/ports/country-gateway.js'
import type { ValidationRepository } from '../../domain/ports/validation-repository.js'
import type { AuditRepository } from '../../domain/ports/audit-repository.js'

export interface CreateValidationDependencies {
  countries: CountryGateway
  validations: ValidationRepository
  audit: AuditRepository
  now?: () => Date
}

export class CreateValidationUseCase {
  constructor(private readonly deps: CreateValidationDependencies) {}

  async execute(input: CreateValidationInput): Promise<Pick<Validation, 'id'>> {
    // No enviamos nombre ni documento a la API pública: solo el código del país.
    const country = await this.deps.countries.getByCode(input.countryCode)
    const createdAt = (this.deps.now ?? (() => new Date()))()

    let saved: Validation
    try {
      saved = await this.deps.validations.create({
        name: input.name,
        document: input.document,
        country,
        createdAt
      })
    } catch (cause) {
      throw new AppError('DATABASE_UNAVAILABLE', 503, 'No fue posible guardar la validación.', undefined, { cause })
    }

    try {
      await this.deps.audit.append({
        document: saved.document,
        eventAt: `${saved.createdAt.toISOString()}#${saved.id}`,
        validationId: saved.id,
        action: 'VALIDATION_CREATED',
        createdAt: saved.createdAt.toISOString()
      })
    } catch (auditCause) {
      // Compensación de mejor esfuerzo, NO transacción distribuida.
      try {
        await this.deps.validations.deleteById(saved.id)
      } catch (rollbackCause) {
        throw new AppError(
          'PERSISTENCE_INCONSISTENT',
          503,
          'No se completó la auditoría y falló la reversión. Se requiere conciliación.',
          undefined,
          { cause: new AggregateError([auditCause, rollbackCause], 'Audit and rollback failed') }
        )
      }
      throw new AppError('AUDIT_UNAVAILABLE', 503, 'No se pudo registrar la auditoría; se revirtió la validación.', undefined, { cause: auditCause })
    }

    return { id: saved.id }
  }
}
