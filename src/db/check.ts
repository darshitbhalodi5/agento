import { pool, verifyDatabaseConnection } from './pool.js'

verifyDatabaseConnection()
  .then(async () => {
    console.log('Database connection OK')
    await pool.end()
  })
  .catch(async (error) => {
    console.error('Database connection failed:', error)
    await pool.end()
    process.exit(1)
  })
