export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_ID'
  | 'VALIDATION_NOT_FOUND'
  | 'COUNTRY_NOT_FOUND'
  | 'COUNTRY_API_TIMEOUT'
  | 'COUNTRY_API_UNAVAILABLE'
  | 'COUNTRY_API_INVALID_RESPONSE'
  | 'DATABASE_UNAVAILABLE'
  | 'AUDIT_UNAVAILABLE'
  | 'PERSISTENCE_INCONSISTENT'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'AppError'
  }
}
