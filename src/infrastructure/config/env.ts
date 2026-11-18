import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/auco_validations'),
  DYNAMODB_ENDPOINT: z.string().url().default('http://localhost:8000'),
  DYNAMODB_TABLE: z.string().min(3).default('validation_audit'),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1).default('local'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).default('local'),
  COUNTRY_API_BASE_URL: z.string().url().default('https://countries.dev'),
  COUNTRY_API_TIMEOUT_MS: z.coerce.number().int().min(100).max(15000).default(4000)
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Configuración inválida: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`)
  }
  return parsed.data
}
