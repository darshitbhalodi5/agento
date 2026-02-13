import { pool } from './pool.js'

export interface ServicePolicyRecord {
  serviceId: string
  active: boolean
  maxCallsPerMinute: number | null
  maxSpendPerHourAtomic: string | null
  maxSpendPerDayAtomic: string | null
  allowlistConsumerIds: string[]
  blocklistConsumerIds: string[]
}

export interface PolicyUsageSnapshot {
  callsLastMinute: number
  spendLastHourAtomic: string
  spendLastDayAtomic: string
}

export async function getActiveServicePolicy(serviceId: string): Promise<ServicePolicyRecord | null> {
  const result = await pool.query<{
    service_id: string
    active: boolean
    max_calls_per_minute: number | null
    max_spend_per_hour_atomic: string | null
    max_spend_per_day_atomic: string | null
    allowlist_consumer_ids: string[] | null
    blocklist_consumer_ids: string[] | null
  }>(
    `
      SELECT
        service_id,
        active,
        max_calls_per_minute,
        max_spend_per_hour_atomic,
        max_spend_per_day_atomic,
        allowlist_consumer_ids,
        blocklist_consumer_ids
      FROM service_policies
      WHERE service_id = $1
        AND active = TRUE
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
    active: row.active,
    maxCallsPerMinute: row.max_calls_per_minute,
    maxSpendPerHourAtomic: row.max_spend_per_hour_atomic,
    maxSpendPerDayAtomic: row.max_spend_per_day_atomic,
    allowlistConsumerIds: row.allowlist_consumer_ids ?? [],
    blocklistConsumerIds: row.blocklist_consumer_ids ?? [],
  }
}

export async function getPolicyUsageSnapshot(serviceId: string): Promise<PolicyUsageSnapshot> {
  const result = await pool.query<{
    calls_last_minute: string
    spend_last_hour_atomic: string
    spend_last_day_atomic: string
  }>(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '1 minute'
            AND status IN ('VERIFICATION_FAILED', 'EXECUTION_FAILED', 'EXECUTION_SUCCEEDED', 'REPLAY_BLOCKED')
        )::text AS calls_last_minute,
        COALESCE(
          SUM(amount_atomic) FILTER (
            WHERE created_at >= NOW() - INTERVAL '1 hour'
              AND status IN ('EXECUTION_FAILED', 'EXECUTION_SUCCEEDED')
          ),
          0
        )::text AS spend_last_hour_atomic,
        COALESCE(
          SUM(amount_atomic) FILTER (
            WHERE created_at >= NOW() - INTERVAL '1 day'
              AND status IN ('EXECUTION_FAILED', 'EXECUTION_SUCCEEDED')
          ),
          0
        )::text AS spend_last_day_atomic
      FROM usage_ledger
      WHERE service_id = $1
    `,
    [serviceId],
  )

  const row = result.rows[0]
  return {
    callsLastMinute: Number(row.calls_last_minute),
    spendLastHourAtomic: row.spend_last_hour_atomic,
    spendLastDayAtomic: row.spend_last_day_atomic,
  }
}

