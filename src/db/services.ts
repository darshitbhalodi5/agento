import { pool } from './pool.js'

export interface ServiceRecord {
  id: string
  name: string
  providerWallet: string
  tokenAddress: string
  priceAtomic: string
  memoPrefix: string
  active: boolean
  ownerId: string | null
}

export async function getActiveServiceById(serviceId: string): Promise<ServiceRecord | null> {
  const result = await pool.query<{
    id: string
    name: string
    provider_wallet: string
    token_address: string
    price_atomic: string
    memo_prefix: string
    active: boolean
    owner_id: string | null
  }>(
    `
      SELECT id, name, provider_wallet, token_address, price_atomic, memo_prefix, active, owner_id
      FROM services
      WHERE id = $1
      LIMIT 1
    `,
    [serviceId],
  )

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    providerWallet: row.provider_wallet,
    tokenAddress: row.token_address,
    priceAtomic: row.price_atomic,
    memoPrefix: row.memo_prefix,
    active: row.active,
    ownerId: row.owner_id,
  }
}

export async function getServiceOwnerId(serviceId: string): Promise<string | null | undefined> {
  const result = await pool.query<{ owner_id: string | null }>(
    `
      SELECT owner_id
      FROM services
      WHERE id = $1
      LIMIT 1
    `,
    [serviceId],
  )

  if (result.rowCount === 0) {
    return undefined
  }

  return result.rows[0].owner_id
}
