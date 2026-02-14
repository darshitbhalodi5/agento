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
  finalStatus?: 'completed' | 'failed' | 'cancelled'
  errorMessage?: string | null
}) {
  const { input, result } = params
  const finalStatus =
    params.finalStatus ?? (result.cancelled ? 'cancelled' : result.ok ? 'completed' : 'failed')
  const errorMessage = params.errorMessage ?? (finalStatus === 'cancelled' ? 'CANCELLED' : null)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `
        INSERT INTO orchestration_runs (
          run_id,
          workflow_id,
          ok,
          run_status,
          started_at,
          completed_at,
          error_message,
          run_output_json
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE((SELECT started_at FROM orchestration_runs WHERE run_id = $1), NOW()),
          NOW(),
          NULL,
          $6::jsonb
        )
        ON CONFLICT (run_id)
        DO UPDATE SET
          workflow_id = EXCLUDED.workflow_id,
          ok = EXCLUDED.ok,
          run_status = EXCLUDED.run_status,
          completed_at = NOW(),
          error_message = $5,
          run_output_json = $6::jsonb
      `,
      [input.runId, input.workflowId, result.ok, finalStatus, errorMessage, JSON.stringify(result.runOutput)],
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
  runStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  stepCount: number
  attemptCount: number
}

export async function listOrchestrationRuns(limit = 30): Promise<OrchestrationRunListItem[]> {
  const result = await pool.query<{
    run_id: string
    workflow_id: string
    ok: boolean
    run_status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    created_at: string
    started_at: string | null
    completed_at: string | null
    error_message: string | null
    step_count: string
    attempt_count: string
  }>(
    `
      SELECT
        r.run_id,
        r.workflow_id,
        r.ok,
        r.run_status,
        r.created_at,
        r.started_at,
        r.completed_at,
        r.error_message,
        COUNT(DISTINCT so.step_id)::text AS step_count,
        COUNT(sa.id)::text AS attempt_count
      FROM orchestration_runs r
      LEFT JOIN orchestration_step_outcomes so ON so.run_id = r.run_id
      LEFT JOIN orchestration_step_attempts sa ON sa.run_id = r.run_id
      GROUP BY
        r.run_id, r.workflow_id, r.ok, r.run_status, r.created_at, r.started_at, r.completed_at, r.error_message
      ORDER BY r.created_at DESC
      LIMIT $1
    `,
    [limit],
  )

  return result.rows.map((row) => ({
    runId: row.run_id,
    workflowId: row.workflow_id,
    ok: row.ok,
    runStatus: row.run_status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    stepCount: Number(row.step_count),
    attemptCount: Number(row.attempt_count),
  }))
}

export interface OrchestrationRunSummary {
  runId: string
  workflowId: string
  ok: boolean
  runStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  stepCount: number
  successfulStepCount: number
  attemptCount: number
  selectedProviders: string[]
  errorMessage: string | null
  runOutput: unknown
}

export async function getOrchestrationRunSummary(runId: string): Promise<OrchestrationRunSummary | null> {
  const result = await pool.query<{
    run_id: string
    workflow_id: string
    ok: boolean
    run_status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    created_at: string
    started_at: string | null
    completed_at: string | null
    duration_ms: string | null
    step_count: string
    successful_step_count: string
    attempt_count: string
    selected_providers: string[] | null
    error_message: string | null
    run_output_json: unknown
  }>(
    `
      SELECT
        r.run_id,
        r.workflow_id,
        r.ok,
        r.run_status,
        r.created_at,
        r.started_at,
        r.completed_at,
        CASE
          WHEN r.started_at IS NULL OR r.completed_at IS NULL THEN NULL
          ELSE (EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) * 1000)::text
        END AS duration_ms,
        COUNT(DISTINCT so.step_id)::text AS step_count,
        COUNT(DISTINCT so.step_id) FILTER (WHERE so.succeeded)::text AS successful_step_count,
        COUNT(sa.id)::text AS attempt_count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT so.chosen_service_id), NULL) AS selected_providers,
        r.error_message,
        r.run_output_json
      FROM orchestration_runs r
      LEFT JOIN orchestration_step_outcomes so ON so.run_id = r.run_id
      LEFT JOIN orchestration_step_attempts sa ON sa.run_id = r.run_id
      WHERE r.run_id = $1
      GROUP BY
        r.run_id, r.workflow_id, r.ok, r.run_status, r.created_at, r.started_at, r.completed_at, r.error_message
      LIMIT 1
    `,
    [runId],
  )

  if ((result.rowCount ?? 0) === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    runId: row.run_id,
    workflowId: row.workflow_id,
    ok: row.ok,
    runStatus: row.run_status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    stepCount: Number(row.step_count),
    successfulStepCount: Number(row.successful_step_count),
    attemptCount: Number(row.attempt_count),
    selectedProviders: row.selected_providers ?? [],
    errorMessage: row.error_message,
    runOutput: row.run_output_json ?? null,
  }
}

export async function markOrchestrationRunRunning(runId: string) {
  await pool.query(
    `
      UPDATE orchestration_runs
      SET
        run_status = CASE
          WHEN run_status = 'cancelled' THEN run_status
          ELSE 'running'
        END,
        started_at = CASE
          WHEN run_status = 'cancelled' THEN started_at
          ELSE COALESCE(started_at, NOW())
        END,
        error_message = CASE
          WHEN run_status = 'cancelled' THEN error_message
          ELSE NULL
        END
      WHERE run_id = $1
    `,
    [runId],
  )
}

export async function markOrchestrationRunFailed(runId: string, errorMessage: string) {
  await pool.query(
    `
      UPDATE orchestration_runs
      SET
        ok = FALSE,
        run_status = 'failed',
        completed_at = NOW(),
        error_message = $2
      WHERE run_id = $1
        AND run_status <> 'cancelled'
    `,
    [runId, errorMessage],
  )
}

export async function isOrchestrationRunCancellationRequested(runId: string): Promise<boolean> {
  const result = await pool.query<{ cancel_requested: boolean }>(
    `
      SELECT cancel_requested
      FROM orchestration_runs
      WHERE run_id = $1
      LIMIT 1
    `,
    [runId],
  )

  if ((result.rowCount ?? 0) === 0) {
    return false
  }

  return result.rows[0].cancel_requested
}

export interface OrchestrationCancellationRecord {
  runId: string
  runStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  cancelRequested: boolean
}

export async function requestOrchestrationRunCancellation(
  runId: string,
): Promise<OrchestrationCancellationRecord | null> {
  const existing = await pool.query<{
    run_id: string
    run_status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  }>(
    `
      SELECT run_id, run_status
      FROM orchestration_runs
      WHERE run_id = $1
      LIMIT 1
    `,
    [runId],
  )

  if ((existing.rowCount ?? 0) === 0) {
    return null
  }

  const status = existing.rows[0].run_status
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    return {
      runId,
      runStatus: status,
      cancelRequested: status === 'cancelled',
    }
  }

  const result = await pool.query<{
    run_id: string
    run_status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
    cancel_requested: boolean
  }>(
    `
      UPDATE orchestration_runs
      SET
        cancel_requested = TRUE,
        run_status = CASE
          WHEN run_status = 'queued' THEN 'cancelled'
          ELSE run_status
        END,
        completed_at = CASE
          WHEN run_status = 'queued' THEN NOW()
          ELSE completed_at
        END,
        error_message = CASE
          WHEN run_status = 'queued' THEN 'CANCELLED'
          ELSE error_message
        END
      WHERE run_id = $1
      RETURNING run_id, run_status, cancel_requested
    `,
    [runId],
  )

  const row = result.rows[0]
  return {
    runId: row.run_id,
    runStatus: row.run_status,
    cancelRequested: row.cancel_requested,
  }
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
