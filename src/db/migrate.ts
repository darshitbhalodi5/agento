import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations')
  return new Set(result.rows.map((row) => row.filename))
}

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../migrations')
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }

    const fullPath = path.join(migrationsDir, file)
    const sql = await readFile(fullPath, 'utf8')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Applied migration: ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

runMigrations()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error('Migration failed:', error)
    await pool.end()
    process.exit(1)
  })
