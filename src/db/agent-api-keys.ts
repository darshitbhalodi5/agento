import { randomBytes } from 'node:crypto'
import { pool } from './pool.js'

interface AgentApiKeyRow {
  id: string
  agent_id: string
  api_key: string
  active: boolean
  created_at: string
  updated_at: string
  last_used_at: string | null
}

interface AgentApiKeyOwnerRow extends AgentApiKeyRow {
  owner_id: string | null
}

export interface AgentApiKeyRecord {
  id: number
  agentId: string
  apiKeyMasked: string
  active: boolean
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
}

function maskApiKey(value: string): string {
  if (value.length <= 8) {
    return '****'
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function toRecord(row: AgentApiKeyRow): AgentApiKeyRecord {
  return {
    id: Number(row.id),
    agentId: row.agent_id,
    apiKeyMasked: maskApiKey(row.api_key),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  }
}

function generateApiKey(): string {
  return `agk_${randomBytes(24).toString('hex')}`
}

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

export async function listAgentApiKeys(params: {
  agentId?: string
  active?: boolean
  limit: number
}): Promise<AgentApiKeyRecord[]> {
  const { agentId, active, limit } = params

  const clauses: string[] = []
  const values: unknown[] = []

  if (agentId) {
    values.push(agentId)
    clauses.push(`agent_id = $${values.length}`)
  }

  if (typeof active === 'boolean') {
    values.push(active)
    clauses.push(`active = $${values.length}`)
  }

  values.push(limit)
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  const result = await pool.query<AgentApiKeyRow>(
    `
      SELECT id, agent_id, api_key, active, created_at, updated_at, last_used_at
      FROM agent_api_keys
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows.map(toRecord)
}

export async function listAgentApiKeysByOwner(params: {
  ownerId: string
  agentId?: string
  active?: boolean
  limit: number
}): Promise<AgentApiKeyRecord[]> {
  const { ownerId, agentId, active, limit } = params

  const clauses: string[] = ['a.owner_id = $1']
  const values: unknown[] = [ownerId]

  if (agentId) {
    values.push(agentId)
    clauses.push(`k.agent_id = $${values.length}`)
  }

  if (typeof active === 'boolean') {
    values.push(active)
    clauses.push(`k.active = $${values.length}`)
  }

  values.push(limit)

  const result = await pool.query<AgentApiKeyOwnerRow>(
    `
      SELECT k.id, k.agent_id, k.api_key, k.active, k.created_at, k.updated_at, k.last_used_at, a.owner_id
      FROM agent_api_keys k
      JOIN agents a ON a.id = k.agent_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY k.created_at DESC, k.id DESC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows.map(toRecord)
}

export async function createAgentApiKey(input: {
  agentId: string
  apiKey?: string
}): Promise<{ record: AgentApiKeyRecord; apiKey: string }> {
  const apiKey = input.apiKey ?? generateApiKey()

  const result = await pool.query<AgentApiKeyRow>(
    `
      INSERT INTO agent_api_keys (agent_id, api_key, active, updated_at)
      VALUES ($1, $2, TRUE, NOW())
      RETURNING id, agent_id, api_key, active, created_at, updated_at, last_used_at
    `,
    [input.agentId, apiKey],
  )

  return {
    record: toRecord(result.rows[0]),
    apiKey,
  }
}

export async function revokeAgentApiKeyById(id: number): Promise<AgentApiKeyRecord | null> {
  const result = await pool.query<AgentApiKeyRow>(
    `
      UPDATE agent_api_keys
      SET active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, agent_id, api_key, active, created_at, updated_at, last_used_at
    `,
    [id],
  )

  if (result.rowCount === 0) {
    return null
  }

  return toRecord(result.rows[0])
}

export async function getAgentApiKeyOwnerById(id: number): Promise<string | null | undefined> {
  const result = await pool.query<{ owner_id: string | null }>(
    `
      SELECT a.owner_id
      FROM agent_api_keys k
      JOIN agents a ON a.id = k.agent_id
      WHERE k.id = $1
      LIMIT 1
    `,
    [id],
  )

  if (result.rowCount === 0) {
    return undefined
  }

  return result.rows[0].owner_id
}

export async function rotateAgentApiKeyById(id: number): Promise<{
  revoked: AgentApiKeyRecord
  created: AgentApiKeyRecord
  apiKey: string
} | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query<AgentApiKeyRow>(
      `
        SELECT id, agent_id, api_key, active, created_at, updated_at, last_used_at
        FROM agent_api_keys
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )

    if (existing.rowCount === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const revokedResult = await client.query<AgentApiKeyRow>(
      `
        UPDATE agent_api_keys
        SET active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, agent_id, api_key, active, created_at, updated_at, last_used_at
      `,
      [id],
    )

    const newApiKey = generateApiKey()
    const createdResult = await client.query<AgentApiKeyRow>(
      `
        INSERT INTO agent_api_keys (agent_id, api_key, active, updated_at)
        VALUES ($1, $2, TRUE, NOW())
        RETURNING id, agent_id, api_key, active, created_at, updated_at, last_used_at
      `,
      [existing.rows[0].agent_id, newApiKey],
    )

    await client.query('COMMIT')

    return {
      revoked: toRecord(revokedResult.rows[0]),
      created: toRecord(createdResult.rows[0]),
      apiKey: newApiKey,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
