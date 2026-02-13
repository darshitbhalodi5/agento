import { pool } from './pool.js'

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
  providerWallet: string
  tokenAddress: string
  priceAtomic: string
  memoPrefix: string
  active: boolean
  tags: string[]
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

export async function upsertRegistryService(input: {
  id: string
  name: string
  providerWallet: string
  tokenAddress: string
  priceAtomic: string
  memoPrefix: string
  active: boolean
  tags: string[]
}) {
  const { id, name, providerWallet, tokenAddress, priceAtomic, memoPrefix, active, tags } = input
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO services (id, name, provider_wallet, token_address, price_atomic, memo_prefix, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          provider_wallet = EXCLUDED.provider_wallet,
          token_address = EXCLUDED.token_address,
          price_atomic = EXCLUDED.price_atomic,
          memo_prefix = EXCLUDED.memo_prefix,
          active = EXCLUDED.active
      `,
      [id, name, providerWallet, tokenAddress, priceAtomic, memoPrefix, active],
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

export async function listRegistryServices(): Promise<RegistryServiceRecord[]> {
  const result = await pool.query<{
    id: string
    name: string
    provider_wallet: string
    token_address: string
    price_atomic: string
    memo_prefix: string
    active: boolean
    tags: string[]
  }>(`
    SELECT
      s.id,
      s.name,
      s.provider_wallet,
      s.token_address,
      s.price_atomic,
      s.memo_prefix,
      s.active,
      COALESCE(array_agg(st.tag ORDER BY st.tag) FILTER (WHERE st.tag IS NOT NULL), '{}') AS tags
    FROM services s
    LEFT JOIN service_tags st ON st.service_id = s.id
    GROUP BY s.id, s.name, s.provider_wallet, s.token_address, s.price_atomic, s.memo_prefix, s.active
    ORDER BY s.created_at DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    providerWallet: row.provider_wallet,
    tokenAddress: row.token_address,
    priceAtomic: row.price_atomic,
    memoPrefix: row.memo_prefix,
    active: row.active,
    tags: row.tags,
  }))
}
