import { PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { AuditEvent } from '../../domain/entities/validation.js'
import type { AuditRepository } from '../../domain/ports/audit-repository.js'

export class DynamoAuditRepository implements AuditRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async append(event: AuditEvent): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: event,
      // Protege contra una sobrescritura silenciosa de la misma llave.
      ConditionExpression: 'attribute_not_exists(#document) AND attribute_not_exists(#eventAt)',
      ExpressionAttributeNames: { '#document': 'document', '#eventAt': 'eventAt' }
    }))
  }
}
