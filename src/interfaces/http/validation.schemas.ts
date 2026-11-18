import { z } from 'zod'
import { AppError } from '../../domain/errors/app-error.js'
import type { CreateValidationInput } from '../../domain/entities/validation.js'

const createValidationSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  document: z.string().trim().regex(/^[A-Za-z0-9-]{4,30}$/, 'El documento debe tener de 4 a 30 caracteres alfanuméricos o guiones.'),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'countryCode debe ser un código ISO de dos letras.').default('CO')
})

export function parseCreateBody(value: unknown): CreateValidationInput {
  const result = createValidationSchema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      'Los datos de entrada no son válidos.',
      result.error.issues.flatMap(issue =>
        issue.code === 'unrecognized_keys'
          ? issue.keys.map(field => ({ field, message: 'Campo no permitido.' }))
          : [{ field: issue.path.join('.') || 'body', message: issue.message }]
      )
    )
  }
  return result.data
}

export function parseId(value: string): string {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    throw new AppError('INVALID_ID', 400, 'El ID debe tener 24 caracteres hexadecimales.')
  }
  return value
}
