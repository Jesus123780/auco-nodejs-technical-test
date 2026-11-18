import 'dotenv/config'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { CreateValidationUseCase } from './application/use-cases/create-validation.use-case.js'
import { GetValidationUseCase } from './application/use-cases/get-validation.use-case.js'
import { loadConfig } from './infrastructure/config/env.js'
import { CountriesDevGateway } from './infrastructure/countries/countries-dev.gateway.js'
import { DynamoAuditRepository } from './infrastructure/dynamodb/dynamo-audit.repository.js'
import { ensureAuditTable } from './infrastructure/dynamodb/ensure-audit-table.js'
import { connectMongoWithRetry } from './infrastructure/mongodb/mongo.connection.js'
import { MongoValidationRepository } from './infrastructure/mongodb/mongo-validation.repository.js'
import { buildApp } from './interfaces/http/build-app.js'

async function main() {
  const config = loadConfig()
  const mongo = await connectMongoWithRetry(config.MONGO_URI)
  const dynamo = new DynamoDBClient({
    region: config.AWS_REGION,
    endpoint: config.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    }
  })

  try {
    await ensureAuditTable(dynamo, config.DYNAMODB_TABLE)
    const validations = new MongoValidationRepository(mongo)
    const countries = new CountriesDevGateway(config.COUNTRY_API_BASE_URL, config.COUNTRY_API_TIMEOUT_MS)
    const audit = new DynamoAuditRepository(DynamoDBDocumentClient.from(dynamo), config.DYNAMODB_TABLE)

    const app = buildApp({
      createValidation: new CreateValidationUseCase({ countries, validations, audit }),
      getValidation: new GetValidationUseCase(validations)
    }, config.NODE_ENV !== 'test')

    let closing = false
    const shutdown = async () => {
      if (closing) return
      closing = true
      await app.close()
      await mongo.close()
      dynamo.destroy()
    }
    process.once('SIGTERM', () => { void shutdown().finally(() => process.exit(0)) })
    process.once('SIGINT', () => { void shutdown().finally(() => process.exit(0)) })

    await app.listen({ port: config.PORT, host: config.HOST })
  } catch (error) {
    await mongo.close()
    dynamo.destroy()
    throw error
  }
}

main().catch(error => {
  console.error('Error al iniciar la aplicación:', error)
  process.exitCode = 1
})
