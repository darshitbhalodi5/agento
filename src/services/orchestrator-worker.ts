import type { FastifyBaseLogger } from 'fastify'
import {
  isOrchestrationRunCancellationRequested,
  persistOrchestrationRun,
} from '../db/orchestration-runs.js'
import {
  claimNextQueuedRun,
  markQueuedRunCancelled,
  markQueuedRunCompleted,
  markQueuedRunFailed,
} from './orchestration-queue.js'
import { runOrchestration } from './orchestrator.js'

export interface OrchestratorWorkerOptions {
  pollIntervalMs?: number
  logger?: FastifyBaseLogger
}

export interface OrchestratorWorkerHandle {
  stop: () => void
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function startOrchestratorWorker(options: OrchestratorWorkerOptions = {}): OrchestratorWorkerHandle {
  const pollIntervalMs = Math.max(100, options.pollIntervalMs ?? 500)
  const logger = options.logger
  let inFlight = false

  const tick = async () => {
    if (inFlight) {
      return
    }

    inFlight = true
    try {
      const job = await claimNextQueuedRun()
      if (!job) {
        return
      }

      try {
        const result = await runOrchestration(job.payload, {
          shouldContinue: async () => {
            const cancellationRequested = await isOrchestrationRunCancellationRequested(job.runId)
            return !cancellationRequested
          },
        })
        await persistOrchestrationRun({
          input: job.payload,
          result,
          finalStatus: result.cancelled ? 'cancelled' : undefined,
        })
        if (result.cancelled) {
          await markQueuedRunCancelled(job.runId)
        } else if (result.ok) {
          await markQueuedRunCompleted(job.runId)
        } else {
          await markQueuedRunFailed(job.runId, 'ORCHESTRATION_FAILED')
        }
      } catch (error) {
        const errorMessage = toErrorMessage(error)
        await markQueuedRunFailed(job.runId, errorMessage)
        logger?.error({ runId: job.runId, error: errorMessage }, 'orchestrator worker job failed')
      }
    } catch (error) {
      logger?.error({ error: toErrorMessage(error) }, 'orchestrator worker tick failed')
    } finally {
      inFlight = false
    }
  }

  const timer = setInterval(() => {
    void tick()
  }, pollIntervalMs)

  return {
    stop: () => clearInterval(timer),
  }
}
