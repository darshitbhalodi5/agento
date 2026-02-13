import { pool } from './pool.js'

export type BillingModelType = 'fixed' | 'tiered' | 'hybrid'

export interface BillingModelRecord {
  serviceId: string
  modelType: BillingModelType
  fixedPriceAtomic: string | null
  freeQuota: number
  tierJson: unknown
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertBillingModelInput {
  serviceId: string
  modelType: BillingModelType
  fixedPriceAtomic: string | null
  freeQuota: number
  tierJson: unknown
  active: boolean
}

export async function upsertBillingModel(input: UpsertBillingModelInput): Promise<BillingModelRecord> {
  const result = await pool.query<{
    service_id: string
    model_type: BillingModelType
    fixed_price_atomic: string | null
    free_quota: number
    tier_json: unknown
    active: boolean
    created_at: string
    updated_at: string
  }>(
    `
      INSERT INTO service_billing_models (
        service_id,
        model_type,
        fixed_price_atomic,
        free_quota,
        tier_json,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
      ON CONFLICT (service_id)
      DO UPDATE SET
        model_type = EXCLUDED.model_type,
        fixed_price_atomic = EXCLUDED.fixed_price_atomic,
        free_quota = EXCLUDED.free_quota,
        tier_json = EXCLUDED.tier_json,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING
        service_id,
        model_type,
        fixed_price_atomic,
        free_quota,
        tier_json,
        active,
        created_at,
        updated_at
    `,
    [
      input.serviceId,
      input.modelType,
      input.fixedPriceAtomic,
      input.freeQuota,
      JSON.stringify(input.tierJson ?? []),
      input.active,
    ],
  )

  const row = result.rows[0]
  return {
    serviceId: row.service_id,
    modelType: row.model_type,
    fixedPriceAtomic: row.fixed_price_atomic,
    freeQuota: row.free_quota,
    tierJson: row.tier_json,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getBillingModelByServiceId(serviceId: string): Promise<BillingModelRecord | null> {
  const result = await pool.query<{
    service_id: string
    model_type: BillingModelType
    fixed_price_atomic: string | null
    free_quota: number
    tier_json: unknown
    active: boolean
    created_at: string
    updated_at: string
  }>(
    `
      SELECT
        service_id,
        model_type,
        fixed_price_atomic,
        free_quota,
        tier_json,
        active,
        created_at,
        updated_at
      FROM service_billing_models
      WHERE service_id = $1
      LIMIT 1
    `,
    [serviceId],
  )

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    serviceId: row.service_id,
    modelType: row.model_type,
    fixedPriceAtomic: row.fixed_price_atomic,
    freeQuota: row.free_quota,
    tierJson: row.tier_json,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
