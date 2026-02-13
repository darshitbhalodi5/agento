import { Pool } from 'pg'
import { env } from '../config/env.js'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

export async function verifyDatabaseConnection() {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}
