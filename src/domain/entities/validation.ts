/** Entidades del negocio: sin dependencias de HTTP, MongoDB o DynamoDB. */
export interface CountryInfo {
  code: string
  name: string
  capital: string | null
  currencyCode: string | null
}

export interface CreateValidationInput {
  name: string
  document: string
  countryCode: string
}

export interface NewValidation {
  name: string
  document: string
  country: CountryInfo
  createdAt: Date
}

export interface Validation extends NewValidation {
  id: string
}

export interface AuditEvent {
  document: string
  eventAt: string
  validationId: string
  action: 'VALIDATION_CREATED'
  createdAt: string
}
