import { describe, expect, it, vi } from 'vitest'
import { CountriesDevGateway } from '../../src/infrastructure/countries/countries-dev.gateway.js'

const country = {
  alpha2Code: 'CO',
  name: 'Colombia',
  capital: 'Bogotá',
  currencies: [{ code: 'COP', name: 'Colombian peso' }]
}

const mockResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

function gateway(fetchMock: ReturnType<typeof vi.fn>) {
  return new CountriesDevGateway('https://countries.dev', 4000, fetchMock as typeof fetch)
}

describe('CountriesDevGateway', () => {
  it('lee y normaliza la respuesta sin enviar datos personales', async () => {
    const fetchMock = vi.fn(async () => mockResponse(country))
    const result = await gateway(fetchMock).getByCode('CO')
    expect(result).toEqual({ code: 'CO', name: 'Colombia', capital: 'Bogotá', currencyCode: 'COP' })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/alpha/CO')
  })

  it('admite países que no tienen capital ni moneda', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ alpha2Code: 'AQ', name: 'Antarctica' }))
    await expect(gateway(fetchMock).getByCode('AQ')).resolves.toEqual({
      code: 'AQ', name: 'Antarctica', capital: null, currencyCode: null
    })
  })

  it('404 de país se convierte en 422', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ message: 'Not found' }, 404))
    await expect(gateway(fetchMock).getByCode('ZZ')).rejects.toMatchObject({
      code: 'COUNTRY_NOT_FOUND', statusCode: 422
    })
  })

  it.each([429, 500, 503])('HTTP %i del proveedor se convierte en 502', async (status) => {
    const fetchMock = vi.fn(async () => mockResponse({ error: 'provider error' }, status))
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_UNAVAILABLE', statusCode: 502
    })
  })

  it('distingue un timeout', async () => {
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' })
    const fetchMock = vi.fn(async () => { throw timeout })
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_TIMEOUT', statusCode: 504
    })
  })

  it('convierte un error de red en 502', async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('network down') })
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_UNAVAILABLE', statusCode: 502
    })
  })

  it('rechaza un JSON con estructura inesperada', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ name: 'Colombia' }))
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_INVALID_RESPONSE', statusCode: 502
    })
  })

  it('rechaza un país distinto al solicitado', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ ...country, alpha2Code: 'BR' }))
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_INVALID_RESPONSE', statusCode: 502
    })
  })

  it('rechaza JSON ilegible', async () => {
    const fetchMock = vi.fn(async () => new Response('not json', { status: 200 }))
    await expect(gateway(fetchMock).getByCode('CO')).rejects.toMatchObject({
      code: 'COUNTRY_API_INVALID_RESPONSE', statusCode: 502
    })
  })
})
