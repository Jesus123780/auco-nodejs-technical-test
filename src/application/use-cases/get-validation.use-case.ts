import type { Validation } from '../../domain/entities/validation.js'
import { AppError } from '../../domain/errors/app-error.js'
import type { ValidationRepository } from '../../domain/ports/validation-repository.js'

export class GetValidationUseCase {
  constructor(private readonly validations: ValidationRepository) {}

  async execute(id: string): Promise<Validation> {
    let validation: Validation | null
    try {
      validation = await this.validations.findById(id)
    } catch (cause) {
      throw new AppError('DATABASE_UNAVAILABLE', 503, 'No fue posible consultar la validación.', undefined, { cause })
    }

    if (!validation) {
      throw new AppError('VALIDATION_NOT_FOUND', 404, 'La validación solicitada no existe.')
    }
    return validation
  }
}
