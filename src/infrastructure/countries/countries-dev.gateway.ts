import { z } from 'zod'
import type { CountryInfo } from '../../domain/entities/validation.js'
import { AppError } from '../../domain/errors/app-error.js'
import type { CountryGateway } from '../../domain/ports/country-gateway.js'

const apiCountrySchema = z.object({
  alpha2Code: z.string().length(2),
  name: z.string().min(1),
  capital: z.string().nullable().optional(),
  currencies: z.array(z.object({ code: z.string().min(1) })).nullable().optional()
})

export class CountriesDevGateway implements CountryGateway {
  constructor(
    private readonly baseUrl = 'https://countries.dev',
    private readonly timeoutMs = 4000,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async getByCode(code: string): Promise<CountryInfo> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/alpha/${encodeURIComponent(code)}`
    let response: Response
    try {
      response = await this.fetcher(url, { signal: AbortSignal.timeout(this.timeoutMs) })
    } catch (cause) {
      const errorName = cause instanceof Error ? cause.name : ''
      if (errorName === 'TimeoutError' || errorName === 'AbortError') {
        throw new AppError('COUNTRY_API_TIMEOUT', 504, 'La consulta del país agotó el tiempo de espera.', undefined, { cause })
      }
      throw new AppError('COUNTRY_API_UNAVAILABLE', 502, 'No se pudo contactar la API de países.', undefined, { cause })
    }

    if (response.status === 404) {
      throw new AppError('COUNTRY_NOT_FOUND', 422, 'El código de país no existe.')
    }
    if (!response.ok) {
      throw new AppError('COUNTRY_API_UNAVAILABLE', 502, 'La API de países no está disponible.')
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (cause) {
      throw new AppError('COUNTRY_API_INVALID_RESPONSE', 502, 'La API de países devolvió JSON inválido.', undefined, { cause })
    }

    const parsed = apiCountrySchema.safeParse(payload)
    if (!parsed.success || parsed.data.alpha2Code.toUpperCase() !== code.toUpperCase()) {
      throw new AppError('COUNTRY_API_INVALID_RESPONSE', 502, 'La API de países devolvió una respuesta inesperada.')
    }

    return {
      code: parsed.data.alpha2Code.toUpperCase(),
      name: parsed.data.name,
      capital: parsed.data.capital ?? null,
      currencyCode: parsed.data.currencies?.[0]?.code ?? null
    }
  }
}
