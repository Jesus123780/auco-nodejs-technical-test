import type { NewValidation, Validation } from '../entities/validation.js'

export interface ValidationRepository {
  create(record: NewValidation): Promise<Validation>
  findById(id: string): Promise<Validation | null>
  deleteById(id: string): Promise<void>
}
