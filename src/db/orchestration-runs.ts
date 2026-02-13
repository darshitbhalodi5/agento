import { pool } from './pool.js'
import type { OrchestrationRunInput, OrchestrationRunResult } from '../services/orchestrator.js'

interface ErrorShape {
  error?: { code?: unknown }
}

function extractErrorCode(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null
  }

  const maybe = response as ErrorShape
  return typeof maybe.error?.code === 'string' ? maybe.error.code : null
}

export async function persistOrchestrationRun(params: {
  input: OrchestrationRunInput
  result: OrchestrationRunResult
}) {
  const { input, result } = params

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO orchestration_runs (run_id, workflow_id, ok, started_at, completed_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (run_id)
        DO UPDATE SET
          workflow_id = EXCLUDED.workflow_id,
          ok = EXCLUDED.ok,
          completed_at = NOW()
      `,
      [input.runId, input.workflowId, result.ok],
    )

    await client.query('DELETE FROM orchestration_step_outcomes WHERE run_id = $1', [input.runId])
    await client.query('DELETE FROM orchestration_step_attempts WHERE run_id = $1', [input.runId])

    for (const step of result.steps) {
      await client.query(
        `
          INSERT INTO orchestration_step_outcomes (
            run_id,
            step_id,
            succeeded,
            chosen_service_id,
            attempts_count
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [input.runId, step.stepId, step.succeeded, step.chosenServiceId, step.attempts.length],
      )

      for (let i = 0; i < step.attempts.length; i += 1) {
        const attempt = step.attempts[i]

        await client.query(
          `
            INSERT INTO orchestration_step_attempts (
              run_id,
              step_id,
              attempt_index,
              service_id,
              request_id,
              payment_tx_hash,
              ok,
              status_code,
              error_code,
              response_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
          `,
          [
            input.runId,
            step.stepId,
            i + 1,
            attempt.serviceId,
            attempt.requestId,
            attempt.paymentTxHash,
            attempt.ok,
            attempt.statusCode,
            extractErrorCode(attempt.response),
            JSON.stringify(attempt.response ?? {}),
          ],
        )
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export interface OrchestrationRunListItem {
  runId: string
  workflowId: string
  ok: boolean
  createdAt: string
  completedAt: string
  stepCount: number
  attemptCount: number
}

export async function listOrchestrationRuns(limit = 30): Promise<OrchestrationRunListItem[]> {
  const result = await pool.query<{
    run_id: string
    workflow_id: string
    ok: boolean
    created_at: string
    completed_at: string
    step_count: string
    attempt_count: string
  }>(
    `
      SELECT
        r.run_id,
        r.workflow_id,
        r.ok,
        r.created_at,
        r.completed_at,
        COUNT(DISTINCT so.step_id)::text AS step_count,
        COUNT(sa.id)::text AS attempt_count
      FROM orchestration_runs r
      LEFT JOIN orchestration_step_outcomes so ON so.run_id = r.run_id
      LEFT JOIN orchestration_step_attempts sa ON sa.run_id = r.run_id
      GROUP BY r.run_id, r.workflow_id, r.ok, r.created_at, r.completed_at
      ORDER BY r.created_at DESC
      LIMIT $1
    `,
    [limit],
  )

  return result.rows.map((row) => ({
    runId: row.run_id,
    workflowId: row.workflow_id,
    ok: row.ok,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    stepCount: Number(row.step_count),
    attemptCount: Number(row.attempt_count),
  }))
}

export interface OrchestrationTimelineRow {
  stepId: string
  succeeded: boolean
  chosenServiceId: string | null
  attemptIndex: number
  serviceId: string
  requestId: string
  paymentTxHash: string
  ok: boolean
  statusCode: number
  errorCode: string | null
  createdAt: string
}

export async function getOrchestrationTimeline(runId: string): Promise<OrchestrationTimelineRow[]> {
  const result = await pool.query<{
    step_id: string
    succeeded: boolean
    chosen_service_id: string | null
    attempt_index: number
    service_id: string
    request_id: string
    payment_tx_hash: string
    ok: boolean
    status_code: number
    error_code: string | null
    created_at: string
  }>(
    `
      SELECT
        so.step_id,
        so.succeeded,
        so.chosen_service_id,
        sa.attempt_index,
        sa.service_id,
        sa.request_id,
        sa.payment_tx_hash,
        sa.ok,
        sa.status_code,
        sa.error_code,
        sa.created_at
      FROM orchestration_step_outcomes so
      JOIN orchestration_step_attempts sa
        ON sa.run_id = so.run_id
       AND sa.step_id = so.step_id
      WHERE so.run_id = $1
      ORDER BY so.step_id ASC, sa.attempt_index ASC
    `,
    [runId],
  )

  return result.rows.map((row) => ({
    stepId: row.step_id,
    succeeded: row.succeeded,
    chosenServiceId: row.chosen_service_id,
    attemptIndex: row.attempt_index,
    serviceId: row.service_id,
    requestId: row.request_id,
    paymentTxHash: row.payment_tx_hash,
    ok: row.ok,
    statusCode: row.status_code,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }))
}
