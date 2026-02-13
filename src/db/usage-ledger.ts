import { pool } from './pool.js'

export type UsageLedgerStatus =
  | 'VALIDATION_FAILED'
  | 'SERVICE_NOT_FOUND'
  | 'SERVICE_INACTIVE'
  | 'REPLAY_BLOCKED'
  | 'VERIFICATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_SUCCEEDED'
  | 'POLICY_BLOCKED'

export interface UsageLedgerEntryInput {
  requestId?: string
  serviceId?: string
  paymentTxHash?: string
  status: UsageLedgerStatus
  errorCode?: string
  amountAtomic?: string
  payerAddress?: string
  metaJson?: unknown
}

export async function insertUsageLedgerEntry(input: UsageLedgerEntryInput) {
  await pool.query(
    `
      INSERT INTO usage_ledger (
        request_id,
        service_id,
        payment_tx_hash,
        status,
        error_code,
        amount_atomic,
        payer_address,
        meta_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      input.requestId ?? null,
      input.serviceId ?? null,
      input.paymentTxHash ?? null,
      input.status,
      input.errorCode ?? null,
      input.amountAtomic ?? null,
      input.payerAddress ?? null,
      JSON.stringify(input.metaJson ?? {}),
    ],
  )
}
