import mongoose, { type Connection } from 'mongoose'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function connectMongoWithRetry(uri: string, attempts = 15): Promise<Connection> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const connection = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500
    })
    try {
      return await connection.asPromise()
    } catch (error) {
      await connection.close().catch(() => undefined)
      if (attempt === attempts) throw error
      await sleep(800)
    }
  }
  throw new Error('MongoDB no disponible.')
}
