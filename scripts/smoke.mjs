#!/usr/bin/env node
/** Prueba de punta a punta: requiere API, Mongo, Dynamo y acceso a countries.dev. */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

const baseUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const document = `TEST${Date.now()}`
const request = async (method, path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000)
  })
  const json = await res.json()
  return { status: res.status, json }
}

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' }
})

try {
  const health = await request('GET', '/health')
  assert.equal(health.status, 200)
  console.log('✓ GET /health')

  const invalid = await request('POST', '/validations', { name: '', document: '???' })
  assert.equal(invalid.status, 400)
  console.log('✓ POST inválido: 400')

  const created = await request('POST', '/validations', { name: 'Prueba Técnica Local', document, countryCode: 'CO' })
  assert.equal(created.status, 201, `POST no creó registro: ${JSON.stringify(created.json)}`)
  assert.match(created.json.id, /^[a-f0-9]{24}$/i)
  console.log(`✓ POST válido: 201 (${created.json.id})`)

  const found = await request('GET', `/validations/${created.json.id}`)
  assert.equal(found.status, 200)
  assert.equal(found.json.document, document)
  assert.equal(found.json.country.code, 'CO')
  console.log('✓ GET existente: 200, país enriquecido')

  const invalidId = await request('GET', '/validations/bad-id')
  assert.equal(invalidId.status, 400)
  console.log('✓ GET ID inválido: 400')

  const missing = await request('GET', `/validations/${randomBytes(12).toString('hex')}`)
  assert.equal(missing.status, 404)
  console.log('✓ GET inexistente: 404')

  const client = DynamoDBDocumentClient.from(dynamo)
  const audit = await client.send(new QueryCommand({
    TableName: process.env.DYNAMODB_TABLE ?? 'validation_audit',
    KeyConditionExpression: '#doc = :doc',
    ExpressionAttributeNames: { '#doc': 'document' },
    ExpressionAttributeValues: { ':doc': document }
  }))
  assert.ok(audit.Items?.some(item => item.validationId === created.json.id && item.action === 'VALIDATION_CREATED'))
  console.log('✓ Auditoría encontrada en DynamoDB Local')
  console.log('\nTodas las verificaciones de punta a punta finalizaron correctamente.')
} catch (error) {
  console.error('\nFalló la prueba de punta a punta:', error)
  process.exitCode = 1
} finally {
  dynamo.destroy()
}
