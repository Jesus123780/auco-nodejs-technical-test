import { describe, expect, it, vi } from 'vitest'
import { GetValidationUseCase } from '../../src/application/use-cases/get-validation.use-case.js'
import type { ValidationRepository } from '../../src/domain/ports/validation-repository.js'

const validation = {
  id: '691e1c00aabbccddeeff0011',
  name: 'Ana Torres',
  document: '12345678',
  country: { code: 'CO', name: 'Colombia', capital: 'Bogotá', currencyCode: 'COP' },
  createdAt: new Date('2026-11-18T21:20:00.000Z')
}

function useCaseWith(findById: ValidationRepository['findById']) {
  return new GetValidationUseCase({
    findById,
    create: vi.fn(),
    deleteById: vi.fn()
  })
}

describe('GetValidationUseCase', () => {
  it('devuelve el registro cuando existe', async () => {
    const findById = vi.fn(async () => validation)
    await expect(useCaseWith(findById).execute(validation.id)).resolves.toEqual(validation)
    expect(findById).toHaveBeenCalledWith(validation.id)
  })

  it('devuelve 404 cuando no existe', async () => {
    await expect(useCaseWith(async () => null).execute(validation.id)).rejects.toMatchObject({
      code: 'VALIDATION_NOT_FOUND', statusCode: 404
    })
  })

  it('devuelve 503 cuando falla Mongo', async () => {
    await expect(useCaseWith(async () => { throw new Error('offline') }).execute(validation.id))
      .rejects.toMatchObject({ code: 'DATABASE_UNAVAILABLE', statusCode: 503 })
  })
})
