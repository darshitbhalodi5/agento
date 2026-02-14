import { pool } from './pool.js'
import { computeMarketplaceRankings } from '../services/marketplace-ranking.js'

export interface AgentRecord {
  id: string
  name: string
  endpoint: string | null
  ownerId: string | null
  description: string | null
  docsUrl: string | null
  websiteUrl: string | null
  version: string | null
  deprecated: boolean
  active: boolean
  capabilities: string[]
}

export interface RegistryServiceRecord {
  id: string
  name: string
  ownerId: string | null
  providerWallet: string
  tokenAddress: string
  priceAtomic: string
  memoPrefix: string
  active: boolean
  tags: string[]
  totalRuns: number
  successRuns: number
  medianLatencyMs: number | null
  rankScore: number
  rankBreakdown: {
    successScore: number
    latencyScore: number
    priceScore: number
  }
}

export interface RegistryServiceFilters {
  tag?: string
  capability?: string
  active?: boolean
  priceMin?: string
  priceMax?: string
  sort?: 'created_desc' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'rank_desc'
}

export async function upsertAgent(input: {
  id: string
  name: string
  endpoint?: string
  ownerId?: string
  description?: string
  docsUrl?: string
  websiteUrl?: string
  version?: string
  deprecated?: boolean
  active: boolean
  capabilities: string[]
}) {
  const { id, name, endpoint, ownerId, description, docsUrl, websiteUrl, version, deprecated, active, capabilities } =
    input
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO agents (
          id,
          name,
          endpoint,
          owner_id,
          description,
          docs_url,
          website_url,
          version,
          deprecated,
          active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          endpoint = EXCLUDED.endpoint,
          owner_id = EXCLUDED.owner_id,
          description = EXCLUDED.description,
          docs_url = EXCLUDED.docs_url,
          website_url = EXCLUDED.website_url,
          version = EXCLUDED.version,
          deprecated = EXCLUDED.deprecated,
          active = EXCLUDED.active
      `,
      [
        id,
        name,
        endpoint ?? null,
        ownerId ?? null,
        description ?? null,
        docsUrl ?? null,
        websiteUrl ?? null,
        version ?? null,
        deprecated ?? false,
        active,
      ],
    )

    await client.query('DELETE FROM agent_capabilities WHERE agent_id = $1', [id])

    for (const capability of capabilities) {
      await client.query(
        `
          INSERT INTO agent_capabilities (agent_id, capability)
          VALUES ($1, $2)
          ON CONFLICT (agent_id, capability) DO NOTHING
        `,
        [id, capability],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listAgents(): Promise<AgentRecord[]> {
  const result = await pool.query<{
    id: string
    name: string
    endpoint: string | null
    owner_id: string | null
    description: string | null
    docs_url: string | null
    website_url: string | null
    version: string | null
    deprecated: boolean
    active: boolean
    capabilities: string[]
  }>(`
    SELECT
      a.id,
      a.name,
      a.endpoint,
      a.owner_id,
      a.description,
      a.docs_url,
      a.website_url,
      a.version,
      a.deprecated,
      a.active,
      COALESCE(array_agg(ac.capability ORDER BY ac.capability) FILTER (WHERE ac.capability IS NOT NULL), '{}') AS capabilities
    FROM agents a
    LEFT JOIN agent_capabilities ac ON ac.agent_id = a.id
    GROUP BY a.id, a.name, a.endpoint, a.owner_id, a.description, a.docs_url, a.website_url, a.version, a.deprecated, a.active
    ORDER BY a.created_at DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    ownerId: row.owner_id,
    description: row.description,
    docsUrl: row.docs_url,
    websiteUrl: row.website_url,
    version: row.version,
    deprecated: row.deprecated,
    active: row.active,
    capabilities: row.capabilities,
  }))
}

export async function getAgentOwnerId(agentId: string): Promise<string | null | undefined> {
  const result = await pool.query<{ owner_id: string | null }>(
    `
      SELECT owner_id
      FROM agents
      WHERE id = $1
      LIMIT 1
    `,
    [agentId],
  )

  if (result.rowCount === 0) {
    return undefined
  }

  return result.rows[0].owner_id
}

export async function upsertRegistryService(input: {
  id: string
  name: string
  ownerId?: string
  providerWallet: string
  tokenAddress: string
  priceAtomic: string
  memoPrefix: string
  active: boolean
  tags: string[]
}) {
  const { id, name, ownerId, providerWallet, tokenAddress, priceAtomic, memoPrefix, active, tags } = input
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO services (id, name, owner_id, provider_wallet, token_address, price_atomic, memo_prefix, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          owner_id = COALESCE(EXCLUDED.owner_id, services.owner_id),
          provider_wallet = EXCLUDED.provider_wallet,
          token_address = EXCLUDED.token_address,
          price_atomic = EXCLUDED.price_atomic,
          memo_prefix = EXCLUDED.memo_prefix,
          active = EXCLUDED.active
      `,
      [id, name, ownerId ?? null, providerWallet, tokenAddress, priceAtomic, memoPrefix, active],
    )

    await client.query('DELETE FROM service_tags WHERE service_id = $1', [id])

    for (const tag of tags) {
      await client.query(
        `
          INSERT INTO service_tags (service_id, tag)
          VALUES ($1, $2)
          ON CONFLICT (service_id, tag) DO NOTHING
        `,
        [id, tag],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listRegistryServices(filters: RegistryServiceFilters = {}): Promise<RegistryServiceRecord[]> {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.tag) {
    params.push(filters.tag)
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM service_tags stf
        WHERE stf.service_id = s.id
          AND stf.tag = $${params.length}
      )`,
    )
  }

  if (filters.capability) {
    params.push(filters.capability)
    const capabilityParamIdx = params.length
    params.push(`capability:${filters.capability}`)
    const prefixedParamIdx = params.length

    conditions.push(
      `EXISTS (
        SELECT 1
        FROM service_tags stc
        WHERE stc.service_id = s.id
          AND (stc.tag = $${capabilityParamIdx} OR stc.tag = $${prefixedParamIdx})
      )`,
    )
  }

  if (filters.active !== undefined) {
    params.push(filters.active)
    conditions.push(`s.active = $${params.length}`)
  }

  if (filters.priceMin) {
    params.push(filters.priceMin)
    conditions.push(`s.price_atomic >= $${params.length}::numeric`)
  }

  if (filters.priceMax) {
    params.push(filters.priceMax)
    conditions.push(`s.price_atomic <= $${params.length}::numeric`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  let orderClause = 'ORDER BY s.created_at DESC, s.id ASC'
  switch (filters.sort) {
    case 'price_asc':
      orderClause = 'ORDER BY s.price_atomic ASC, s.id ASC'
      break
    case 'price_desc':
      orderClause = 'ORDER BY s.price_atomic DESC, s.id ASC'
      break
    case 'name_asc':
      orderClause = 'ORDER BY s.name ASC, s.id ASC'
      break
    case 'name_desc':
      orderClause = 'ORDER BY s.name DESC, s.id ASC'
      break
    case 'rank_desc':
      // Ranking is computed in application code; fallback SQL order stays deterministic.
      orderClause = 'ORDER BY s.created_at DESC, s.id ASC'
      break
    case 'created_desc':
    default:
      orderClause = 'ORDER BY s.created_at DESC, s.id ASC'
      break
  }

  const result = await pool.query<{
    id: string
    name: string
    provider_wallet: string
    token_address: string
    price_atomic: string
    memo_prefix: string
    active: boolean
    owner_id: string | null
    tags: string[]
    total_runs: string
    success_runs: string
    median_latency_ms: string | null
  }>(`
    SELECT
      s.id,
      s.name,
      s.owner_id,
      s.provider_wallet,
      s.token_address,
      s.price_atomic,
      s.memo_prefix,
      s.active,
      COALESCE(array_agg(st.tag ORDER BY st.tag) FILTER (WHERE st.tag IS NOT NULL), '{}') AS tags,
      COALESCE(ars.total_runs, '0') AS total_runs,
      COALESCE(ars.success_runs, '0') AS success_runs,
      ars.median_latency_ms
    FROM services s
    LEFT JOIN service_tags st ON st.service_id = s.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::text AS total_runs,
        COUNT(*) FILTER (WHERE execution_status = 'SUCCEEDED')::text AS success_runs,
        CASE
          WHEN COUNT(*) FILTER (WHERE completed_at IS NOT NULL) = 0 THEN NULL
          ELSE ROUND(
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000
            )::numeric,
            2
          )::text
        END AS median_latency_ms
      FROM api_requests
      WHERE service_id = s.id
    ) ars ON TRUE
    ${whereClause}
    GROUP BY
      s.id,
      s.name,
      s.owner_id,
      s.provider_wallet,
      s.token_address,
      s.price_atomic,
      s.memo_prefix,
      s.active,
      ars.total_runs,
      ars.success_runs,
      ars.median_latency_ms
    ${orderClause}
  `, params)

  const baseRows = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    providerWallet: row.provider_wallet,
    tokenAddress: row.token_address,
    priceAtomic: row.price_atomic,
    memoPrefix: row.memo_prefix,
    active: row.active,
    tags: row.tags,
    totalRuns: Number(row.total_runs),
    successRuns: Number(row.success_runs),
    medianLatencyMs: row.median_latency_ms === null ? null : Number(row.median_latency_ms),
  }))

  const rankings = computeMarketplaceRankings(
    baseRows.map((row) => ({
      id: row.id,
      priceAtomic: row.priceAtomic,
      totalRuns: row.totalRuns,
      successRuns: row.successRuns,
      medianLatencyMs: row.medianLatencyMs,
    })),
  )

  const enrichedRows = baseRows.map((row) => {
    const ranking = rankings.get(row.id)
    return {
      ...row,
      rankScore: ranking?.rankScore ?? 0,
      rankBreakdown: ranking?.breakdown ?? {
        successScore: 0,
        latencyScore: 0,
        priceScore: 0,
      },
    }
  })

  if (filters.sort === 'rank_desc') {
    enrichedRows.sort((a, b) => {
      if (b.rankScore !== a.rankScore) {
        return b.rankScore - a.rankScore
      }
      return a.id.localeCompare(b.id)
    })
  }

  return enrichedRows
}
