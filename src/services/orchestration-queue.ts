import { pool } from '../db/pool.js'
import {
  markOrchestrationRunFailed,
  markOrchestrationRunRunning,
} from '../db/orchestration-runs.js'
import type { OrchestrationRunInput } from './orchestrator.js'

export interface QueuedRunJob {
  runId: string
  workflowId: string
  payload: OrchestrationRunInput
}

export async function enqueueOrchestrationRun(input: OrchestrationRunInput): Promise<boolean> {
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
          error_message
        )
        VALUES ($1, $2, FALSE, 'queued', NULL, NULL, NULL)
        ON CONFLICT (run_id) DO NOTHING
      `,
      [input.runId, input.workflowId],
    )

    const result = await client.query(
      `
        INSERT INTO orchestration_run_queue (
          run_id,
          workflow_id,
          payload_json,
          queue_status,
          attempts,
          available_at,
          updated_at
        )
        VALUES ($1, $2, $3::jsonb, 'queued', 0, NOW(), NOW())
        ON CONFLICT (run_id) DO NOTHING
      `,
      [input.runId, input.workflowId, JSON.stringify(input)],
    )

    await client.query('COMMIT')
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function claimNextQueuedRun(): Promise<QueuedRunJob | null> {
  const result = await pool.query<{
    run_id: string
    workflow_id: string
    payload_json: OrchestrationRunInput
  }>(
    `
      WITH next_job AS (
        SELECT id
        FROM orchestration_run_queue
        WHERE queue_status = 'queued'
          AND available_at <= NOW()
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE orchestration_run_queue q
      SET
        queue_status = 'running',
        attempts = q.attempts + 1,
        locked_at = NOW(),
        updated_at = NOW()
      FROM next_job
      WHERE q.id = next_job.id
      RETURNING q.run_id, q.workflow_id, q.payload_json
    `,
  )

  if ((result.rowCount ?? 0) === 0) {
    return null
  }

  const row = result.rows[0]
  await markOrchestrationRunRunning(row.run_id)
  return {
    runId: row.run_id,
    workflowId: row.workflow_id,
    payload: row.payload_json,
  }
}

export async function markQueuedRunCompleted(runId: string) {
  await pool.query(
    `
      UPDATE orchestration_run_queue
      SET
        queue_status = 'completed',
        locked_at = NULL,
        updated_at = NOW()
      WHERE run_id = $1
    `,
    [runId],
  )
}

export async function markQueuedRunFailed(runId: string, errorMessage: string) {
  await pool.query(
    `
      UPDATE orchestration_run_queue
      SET
        queue_status = 'failed',
        last_error = $2,
        locked_at = NULL,
        updated_at = NOW()
      WHERE run_id = $1
    `,
    [runId, errorMessage],
  )

  await markOrchestrationRunFailed(runId, errorMessage)
}
