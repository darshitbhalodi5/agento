import { randomUUID } from 'node:crypto'
import { pool } from './pool.js'

export interface CreateRequestInput {
  serviceId: string
  requestId: string
  paymentTxHash: string
}

export interface CreateRequestResult {
  ok: boolean
  replayReason?: 'DUPLICATE_REQUEST_ID' | 'DUPLICATE_PAYMENT_TX'
}

export async function createPendingApiRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  const { serviceId, requestId, paymentTxHash } = input

  try {
    await pool.query(
      `
        INSERT INTO api_requests (
          id,
          service_id,
          request_id,
          payment_tx_hash,
          verification_status,
          execution_status,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'PENDING', 'NOT_STARTED', NOW())
      `,
      [randomUUID(), serviceId, requestId, paymentTxHash],
    )

    return { ok: true }
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === '23505') {
      const detail = 'detail' in (error as object) ? String((error as { detail?: string }).detail ?? '') : ''

      if (detail.includes('(service_id, request_id)')) {
        return { ok: false, replayReason: 'DUPLICATE_REQUEST_ID' }
      }

      if (detail.includes('(payment_tx_hash)')) {
        return { ok: false, replayReason: 'DUPLICATE_PAYMENT_TX' }
      }

      return { ok: false, replayReason: 'DUPLICATE_REQUEST_ID' }
    }

    throw error
  }
}

export async function markApiRequestVerificationFailed(input: {
  serviceId: string
  requestId: string
  errorCode: string
}) {
  const { serviceId, requestId, errorCode } = input

  await pool.query(
    `
      UPDATE api_requests
      SET verification_status = 'FAILED',
          execution_status = 'FAILED',
          error_code = $3,
          verified_at = NOW(),
          completed_at = NOW()
      WHERE service_id = $1
        AND request_id = $2
    `,
    [serviceId, requestId, errorCode],
  )
}

export async function markApiRequestVerified(input: {
  serviceId: string
  requestId: string
  payerAddress: string
  amountAtomic: string
  memoRaw: string
}) {
  const { serviceId, requestId, payerAddress, amountAtomic, memoRaw } = input

  await pool.query(
    `
      UPDATE api_requests
      SET verification_status = 'VERIFIED',
          execution_status = 'NOT_STARTED',
          payer_address = $3,
          amount_atomic = $4,
          memo_raw = $5,
          error_code = NULL,
          verified_at = NOW()
      WHERE service_id = $1
        AND request_id = $2
    `,
    [serviceId, requestId, payerAddress, amountAtomic, memoRaw],
  )
}

export async function markApiRequestExecutionFailed(input: {
  serviceId: string
  requestId: string
  errorCode: string
}) {
  const { serviceId, requestId, errorCode } = input

  await pool.query(
    `
      UPDATE api_requests
      SET execution_status = 'FAILED',
          error_code = $3,
          completed_at = NOW()
      WHERE service_id = $1
        AND request_id = $2
    `,
    [serviceId, requestId, errorCode],
  )
}

export async function markApiRequestExecutionSucceeded(input: {
  serviceId: string
  requestId: string
  responseHash: string
}) {
  const { serviceId, requestId, responseHash } = input

  await pool.query(
    `
      UPDATE api_requests
      SET execution_status = 'SUCCEEDED',
          response_hash = $3,
          error_code = NULL,
          completed_at = NOW()
      WHERE service_id = $1
        AND request_id = $2
    `,
    [serviceId, requestId, responseHash],
  )
}

export interface ApiRequestAuditRecord {
  serviceId: string
  requestId: string
  paymentTxHash: string
  payerAddress: string | null
  amountAtomic: string | null
  memoRaw: string | null
  verificationStatus: string
  executionStatus: string
  errorCode: string | null
  createdAt: string
  verifiedAt: string | null
  completedAt: string | null
}

export async function getApiRequestAuditRecord(input: {
  serviceId: string
  requestId: string
}): Promise<ApiRequestAuditRecord | null> {
  const { serviceId, requestId } = input

  const result = await pool.query<{
    service_id: string
    request_id: string
    payment_tx_hash: string
    payer_address: string | null
    amount_atomic: string | null
    memo_raw: string | null
    verification_status: string
    execution_status: string
    error_code: string | null
    created_at: string
    verified_at: string | null
    completed_at: string | null
  }>(
    `
      SELECT
        service_id,
        request_id,
        payment_tx_hash,
        payer_address,
        amount_atomic,
        memo_raw,
        verification_status,
        execution_status,
        error_code,
        created_at,
        verified_at,
        completed_at
      FROM api_requests
      WHERE service_id = $1
        AND request_id = $2
      LIMIT 1
    `,
    [serviceId, requestId],
  )

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    serviceId: row.service_id,
    requestId: row.request_id,
    paymentTxHash: row.payment_tx_hash,
    payerAddress: row.payer_address,
    amountAtomic: row.amount_atomic,
    memoRaw: row.memo_raw,
    verificationStatus: row.verification_status,
    executionStatus: row.execution_status,
    errorCode: row.error_code,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
    completedAt: row.completed_at,
  }
}

export interface DashboardStats {
  totalRequests: number
  verifiedPayments: number
  replayBlocks: number
  executionSucceeded: number
  executionFailed: number
}

export interface RecentRequestRow {
  serviceId: string
  requestId: string
  paymentTxHash: string
  verificationStatus: string
  executionStatus: string
  errorCode: string | null
  createdAt: string
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await pool.query<{
    total_requests: string
    verified_payments: string
    replay_blocks: string
    execution_succeeded: string
    execution_failed: string
  }>(`
    SELECT
      COUNT(*)::text AS total_requests,
      COUNT(*) FILTER (WHERE verification_status = 'VERIFIED')::text AS verified_payments,
      COUNT(*) FILTER (WHERE error_code = 'REPLAY_DETECTED')::text AS replay_blocks,
      COUNT(*) FILTER (WHERE execution_status = 'SUCCEEDED')::text AS execution_succeeded,
      COUNT(*) FILTER (WHERE execution_status = 'FAILED')::text AS execution_failed
    FROM api_requests
  `)

  const row = result.rows[0]
  return {
    totalRequests: Number(row.total_requests),
    verifiedPayments: Number(row.verified_payments),
    replayBlocks: Number(row.replay_blocks),
    executionSucceeded: Number(row.execution_succeeded),
    executionFailed: Number(row.execution_failed),
  }
}

export async function getRecentRequests(limit = 20): Promise<RecentRequestRow[]> {
  const result = await pool.query<{
    service_id: string
    request_id: string
    payment_tx_hash: string
    verification_status: string
    execution_status: string
    error_code: string | null
    created_at: string
  }>(
    `
      SELECT
        service_id,
        request_id,
        payment_tx_hash,
        verification_status,
        execution_status,
        error_code,
        created_at
      FROM api_requests
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit],
  )

  return result.rows.map((row) => ({
    serviceId: row.service_id,
    requestId: row.request_id,
    paymentTxHash: row.payment_tx_hash,
    verificationStatus: row.verification_status,
    executionStatus: row.execution_status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }))
}
