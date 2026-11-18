import type { CountryInfo } from '../entities/validation.js'

export interface CountryGateway {
  getByCode(code: string): Promise<CountryInfo>
}
