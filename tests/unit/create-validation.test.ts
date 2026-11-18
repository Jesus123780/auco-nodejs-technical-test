import { describe, expect, it, vi } from 'vitest'
import { CreateValidationUseCase } from '../../src/application/use-cases/create-validation.use-case.js'
import { AppError } from '../../src/domain/errors/app-error.js'
import type { AuditEvent, CountryInfo, NewValidation, Validation } from '../../src/domain/entities/validation.js'

const createdAt = new Date('2026-11-18T21:20:00.000Z')
const saved: Validation = {
  id: '691e1c00aabbccddeeff0011',
  name: 'Ana Torres',
  document: '12345678',
  country: { code: 'CO', name: 'Colombia', capital: 'Bogotá', currencyCode: 'COP' },
  createdAt
}
const input = { name: 'Ana Torres', document: '12345678', countryCode: 'CO' }

function fixture() {
  const getByCode = vi.fn(async (_code: string): Promise<CountryInfo> => saved.country)
  const create = vi.fn(async (_value: NewValidation): Promise<Validation> => saved)
  const findById = vi.fn(async (_id: string): Promise<Validation | null> => saved)
  const deleteById = vi.fn(async (_id: string): Promise<void> => undefined)
  const append = vi.fn(async (_event: AuditEvent): Promise<void> => undefined)
  const useCase = new CreateValidationUseCase({
    countries: { getByCode },
    validations: { create, findById, deleteById },
    audit: { append },
    now: () => createdAt
  })
  return { useCase, getByCode, create, findById, deleteById, append }
}

describe('CreateValidationUseCase', () => {
  it('enriquece, guarda, audita y devuelve el ID', async () => {
    const f = fixture()
    await expect(f.useCase.execute(input)).resolves.toEqual({ id: saved.id })
    expect(f.getByCode).toHaveBeenCalledExactlyOnceWith('CO')
    expect(f.create).toHaveBeenCalledExactlyOnceWith({
      name: input.name,
      document: input.document,
      country: saved.country,
      createdAt
    })
    expect(f.append).toHaveBeenCalledExactlyOnceWith({
      document: '12345678',
      eventAt: `${createdAt.toISOString()}#${saved.id}`,
      validationId: saved.id,
      action: 'VALIDATION_CREATED',
      createdAt: createdAt.toISOString()
    })
    expect(f.deleteById).not.toHaveBeenCalled()
  })

  it('no persiste si la API externa falla', async () => {
    const f = fixture()
    f.getByCode.mockRejectedValueOnce(new AppError('COUNTRY_API_UNAVAILABLE', 502, 'No disponible'))
    await expect(f.useCase.execute(input)).rejects.toMatchObject({ code: 'COUNTRY_API_UNAVAILABLE' })
    expect(f.create).not.toHaveBeenCalled()
    expect(f.append).not.toHaveBeenCalled()
  })

  it('devuelve error seguro si Mongo falla, sin auditar', async () => {
    const f = fixture()
    f.create.mockRejectedValueOnce(new Error('Internal mongo credentials should not leak'))
    await expect(f.useCase.execute(input)).rejects.toMatchObject({ code: 'DATABASE_UNAVAILABLE', statusCode: 503 })
    expect(f.append).not.toHaveBeenCalled()
  })

  it('si la auditoría falla, compensa borrando Mongo y retorna 503', async () => {
    const f = fixture()
    f.append.mockRejectedValueOnce(new Error('Dynamo offline'))
    await expect(f.useCase.execute(input)).rejects.toMatchObject({ code: 'AUDIT_UNAVAILABLE', statusCode: 503 })
    expect(f.deleteById).toHaveBeenCalledExactlyOnceWith(saved.id)
  })

  it('si también falla la compensación, informa inconsistencia sin devolver éxito', async () => {
    const f = fixture()
    f.append.mockRejectedValueOnce(new Error('Dynamo offline'))
    f.deleteById.mockRejectedValueOnce(new Error('Mongo offline'))
    await expect(f.useCase.execute(input)).rejects.toMatchObject({
      code: 'PERSISTENCE_INCONSISTENT', statusCode: 503
    })
  })

  it('cada llamada produce un evento de auditoría, aun con el mismo documento', async () => {
    const f = fixture()
    f.create.mockResolvedValueOnce(saved).mockResolvedValueOnce({ ...saved, id: '691e1c00aabbccddeeff0022' })
    await f.useCase.execute(input)
    await f.useCase.execute(input)
    expect(f.append).toHaveBeenCalledTimes(2)
    expect(f.append.mock.calls[0]?.[0].eventAt).not.toEqual(f.append.mock.calls[1]?.[0].eventAt)
  })
})
