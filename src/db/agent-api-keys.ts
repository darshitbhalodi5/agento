import { pool } from './pool.js'

export async function isActiveAgentApiKey(apiKey: string): Promise<boolean> {
  const result = await pool.query<{ found: boolean }>(
    `
      WITH matched AS (
        UPDATE agent_api_keys
        SET last_used_at = NOW(), updated_at = NOW()
        WHERE api_key = $1
          AND active = TRUE
        RETURNING 1
      )
      SELECT EXISTS(SELECT 1 FROM matched) AS found
    `,
    [apiKey],
  )

  return result.rows[0]?.found === true
}
