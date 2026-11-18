import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/interfaces/http/build-app.js'
import { AppError } from '../../src/domain/errors/app-error.js'

const VALID_ID = '691e1c00aabbccddeeff0011'
const record = {
  id: VALID_ID,
  name: 'Ana Torres',
  document: '12345678',
  country: { code: 'CO', name: 'Colombia', capital: 'Bogotá', currencyCode: 'COP' },
  createdAt: new Date('2026-11-18T21:20:00.000Z')
}

const apps: FastifyInstance[] = []
function fixture() {
  const create = vi.fn(async () => ({ id: VALID_ID }))
  const get = vi.fn(async () => record)
  const app = buildApp({
    createValidation: { execute: create },
    getValidation: { execute: get }
  })
  apps.push(app)
  return { app, create, get }
}

afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())) })

describe('HTTP contracts', () => {
  it('GET /health devuelve ok', async () => {
    const { app } = fixture()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('POST /validations válido devuelve 201 e ID', async () => {
    const { app, create } = fixture()
    const res = await app.inject({ method: 'POST', url: '/validations', payload: {
      name: '  Ana Torres  ', document: '12345678'
    } })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ id: VALID_ID })
    expect(create).toHaveBeenCalledWith({ name: 'Ana Torres', document: '12345678', countryCode: 'CO' })
  })

  it.each([
    [{ document: '12345678' }, 'name'],
    [{ name: 'A', document: '12345678' }, 'name'],
    [{ name: 'Ana', document: '***' }, 'document'],
    [{ name: 'Ana', document: '12345678', countryCode: 'X1' }, 'countryCode'],
    [{ name: 'Ana', document: '12345678', unexpected: true }, 'unexpected'],
    [{ name: 7, document: '12345678' }, 'name']
  ])('POST con datos inválidos devuelve 400', async (payload, field) => {
    const { app, create } = fixture()
    const res = await app.inject({ method: 'POST', url: '/validations', payload })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
    expect(res.json().error.details.some((d: { field: string }) => d.field === field)).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('convierte countryCode a mayúsculas', async () => {
    const { app, create } = fixture()
    await app.inject({ method: 'POST', url: '/validations', payload: {
      name: 'Ana Torres', document: '12345678', countryCode: 'co'
    } })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'CO' }))
  })

  it('rechaza JSON mal formado', async () => {
    const { app } = fixture()
    const res = await app.inject({ method: 'POST', url: '/validations', headers: { 'content-type': 'application/json' }, payload: '{broken' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('BAD_REQUEST')
  })

  it('GET devuelve 200 y campos guardados', async () => {
    const { app, get } = fixture()
    const res = await app.inject({ method: 'GET', url: `/validations/${VALID_ID}` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ...record, createdAt: record.createdAt.toISOString() })
    expect(get).toHaveBeenCalledWith(VALID_ID)
  })

  it('GET con id de Mongo inválido devuelve 400 sin tocar Mongo', async () => {
    const { app, get } = fixture()
    const res = await app.inject({ method: 'GET', url: '/validations/not-an-id' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('INVALID_ID')
    expect(get).not.toHaveBeenCalled()
  })

  it('GET inexistente devuelve 404', async () => {
    const { app, get } = fixture()
    get.mockRejectedValueOnce(new AppError('VALIDATION_NOT_FOUND', 404, 'No existe'))
    const res = await app.inject({ method: 'GET', url: `/validations/${VALID_ID}` })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('VALIDATION_NOT_FOUND')
  })

  it('error auditado devuelve 503 sin filtrar detalles internos', async () => {
    const { app, create } = fixture()
    create.mockRejectedValueOnce(new AppError('AUDIT_UNAVAILABLE', 503, 'Auditoría no disponible', undefined, { cause: new Error('AWS secret') }))
    const res = await app.inject({ method: 'POST', url: '/validations', payload: { name: 'Ana', document: '12345678' } })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('AUDIT_UNAVAILABLE')
    expect(res.body).not.toContain('AWS secret')
  })

  it('errores internos no exponen la causa', async () => {
    const { app, get } = fixture()
    get.mockRejectedValueOnce(new Error('private connection string'))
    const res = await app.inject({ method: 'GET', url: `/validations/${VALID_ID}` })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('private connection string')
  })

  it('ruta desconocida devuelve 404 consistente', async () => {
    const { app } = fixture()
    const res = await app.inject({ method: 'GET', url: '/unknown' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('ROUTE_NOT_FOUND')
  })
})
