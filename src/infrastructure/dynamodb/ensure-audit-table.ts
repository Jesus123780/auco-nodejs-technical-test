import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitUntilTableExists
} from '@aws-sdk/client-dynamodb'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** Se ejecuta al arrancar: el evaluador no necesita AWS CLI ni crear tablas manualmente. */
export async function ensureAuditTable(
  client: DynamoDBClient,
  tableName: string,
  attempts = 20
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }))
      await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName: tableName })
      return
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'ResourceNotFoundException') {
        try {
          await client.send(new CreateTableCommand({
            TableName: tableName,
            AttributeDefinitions: [
              { AttributeName: 'document', AttributeType: 'S' },
              { AttributeName: 'eventAt', AttributeType: 'S' }
            ],
            KeySchema: [
              { AttributeName: 'document', KeyType: 'HASH' },
              { AttributeName: 'eventAt', KeyType: 'RANGE' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
          }))
        } catch (createCause) {
          if (!(createCause instanceof Error && createCause.name === 'ResourceInUseException')) {
            if (attempt === attempts) throw createCause
            await sleep(750)
            continue
          }
        }
        await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName: tableName })
        return
      }
      if (attempt === attempts) throw cause
      await sleep(750)
    }
  }
}
