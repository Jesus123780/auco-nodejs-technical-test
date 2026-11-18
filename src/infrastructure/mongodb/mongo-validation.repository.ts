import { Schema, type Connection, type HydratedDocument, type Model } from 'mongoose'
import type { NewValidation, Validation } from '../../domain/entities/validation.js'
import type { ValidationRepository } from '../../domain/ports/validation-repository.js'

type StoredValidation = NewValidation

const schema = new Schema<StoredValidation>({
  name: { type: String, required: true },
  document: { type: String, required: true },
  country: {
    code: { type: String, required: true },
    name: { type: String, required: true },
    capital: { type: String, default: null },
    currencyCode: { type: String, default: null }
  },
  createdAt: { type: Date, required: true }
}, {
  collection: 'validations',
  versionKey: false,
  strict: 'throw'
})

// El diseño no impone unicidad por documento: múltiples validaciones crean múltiples auditorías.
schema.index({ document: 1, createdAt: -1 })

function toDomain(doc: HydratedDocument<StoredValidation>): Validation {
  return {
    id: String(doc._id),
    name: doc.name,
    document: doc.document,
    country: {
      code: doc.country.code,
      name: doc.country.name,
      capital: doc.country.capital ?? null,
      currencyCode: doc.country.currencyCode ?? null
    },
    createdAt: doc.createdAt
  }
}

export class MongoValidationRepository implements ValidationRepository {
  private readonly model: Model<StoredValidation>

  constructor(connection: Connection) {
    this.model = connection.model<StoredValidation>('Validation', schema)
  }

  async create(record: NewValidation): Promise<Validation> {
    const saved = await this.model.create(record)
    return toDomain(saved)
  }

  async findById(id: string): Promise<Validation | null> {
    const found = await this.model.findById(id).exec()
    return found ? toDomain(found) : null
  }

  async deleteById(id: string): Promise<void> {
    const removed = await this.model.findByIdAndDelete(id).exec()
    if (!removed) {
      throw new Error('La validación que debía revertirse ya no existe.')
    }
  }
}
