import { pool } from './pool.js'
import type { UsageLedgerStatus } from './usage-ledger.js'

export interface BillingUsageFilters {
  serviceId?: string
  status?: UsageLedgerStatus
  from?: string
  to?: string
  limit: number
}

export interface BillingUsageRow {
  id: number
  requestId: string | null
  serviceId: string | null
  paymentTxHash: string | null
  status: UsageLedgerStatus
  errorCode: string | null
  amountAtomic: string | null
  payerAddress: string | null
  metaJson: unknown
  createdAt: string
}

export interface BillingSummaryFilters {
  serviceId?: string
  from?: string
  to?: string
}

export interface BillingSummaryRow {
  serviceId: string | null
  totalRequests: number
  totalSuccess: number
  totalFailed: number
  totalPolicyBlocked: number
  totalSpendAtomic: string
}

function buildWhereClause(filters: { serviceId?: string; status?: string; from?: string; to?: string }) {
  const where: string[] = []
  const values: unknown[] = []

  if (filters.serviceId) {
    values.push(filters.serviceId)
    where.push(`service_id = $${values.length}`)
  }

  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }

  if (filters.from) {
    values.push(filters.from)
    where.push(`created_at >= $${values.length}::timestamptz`)
  }

  if (filters.to) {
    values.push(filters.to)
    where.push(`created_at <= $${values.length}::timestamptz`)
  }

  return {
    values,
    clause: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
  }
}

export async function listBillingUsage(filters: BillingUsageFilters): Promise<BillingUsageRow[]> {
  const where = buildWhereClause(filters)
  const values = [...where.values, filters.limit]

  const result = await pool.query<{
    id: string
    request_id: string | null
    service_id: string | null
    payment_tx_hash: string | null
    status: UsageLedgerStatus
    error_code: string | null
    amount_atomic: string | null
    payer_address: string | null
    meta_json: unknown
    created_at: string
  }>(
    `
      SELECT
        id,
        request_id,
        service_id,
        payment_tx_hash,
        status,
        error_code,
        amount_atomic,
        payer_address,
        meta_json,
        created_at
      FROM usage_ledger
      ${where.clause}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    requestId: row.request_id,
    serviceId: row.service_id,
    paymentTxHash: row.payment_tx_hash,
    status: row.status,
    errorCode: row.error_code,
    amountAtomic: row.amount_atomic,
    payerAddress: row.payer_address,
    metaJson: row.meta_json,
    createdAt: row.created_at,
  }))
}

export async function getBillingSummary(filters: BillingSummaryFilters): Promise<BillingSummaryRow[]> {
  const where = buildWhereClause(filters)

  const result = await pool.query<{
    service_id: string | null
    total_requests: string
    total_success: string
    total_failed: string
    total_policy_blocked: string
    total_spend_atomic: string
  }>(
    `
      SELECT
        service_id,
        COUNT(*)::text AS total_requests,
        COUNT(*) FILTER (WHERE status = 'EXECUTION_SUCCEEDED')::text AS total_success,
        COUNT(*) FILTER (WHERE status IN ('VALIDATION_FAILED', 'SERVICE_NOT_FOUND', 'SERVICE_INACTIVE', 'REPLAY_BLOCKED', 'VERIFICATION_FAILED', 'EXECUTION_FAILED', 'POLICY_BLOCKED'))::text AS total_failed,
        COUNT(*) FILTER (WHERE status = 'POLICY_BLOCKED')::text AS total_policy_blocked,
        COALESCE(SUM(amount_atomic), 0)::text AS total_spend_atomic
      FROM usage_ledger
      ${where.clause}
      GROUP BY service_id
      ORDER BY service_id ASC NULLS LAST
    `,
    where.values,
  )

  return result.rows.map((row) => ({
    serviceId: row.service_id,
    totalRequests: Number(row.total_requests),
    totalSuccess: Number(row.total_success),
    totalFailed: Number(row.total_failed),
    totalPolicyBlocked: Number(row.total_policy_blocked),
    totalSpendAtomic: row.total_spend_atomic,
  }))
}

