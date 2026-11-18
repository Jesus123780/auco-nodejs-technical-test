import type { AuditEvent } from '../entities/validation.js'

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>
}
