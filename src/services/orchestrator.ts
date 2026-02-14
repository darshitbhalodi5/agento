import { env } from '../config/env.js'
import {
  buildRetryPolicy,
  getRetryDelayMs,
  sleepMs,
  type RetryPolicyInput,
  shouldRetryAttempt,
} from './retry-policy.js'

export interface OrchestrationCandidate {
  serviceId: string
  paymentTxHash: string
}

export interface OrchestrationStepInput {
  stepId: string
  payload: Record<string, unknown>
  candidates: OrchestrationCandidate[]
  retryPolicy?: RetryPolicyInput
}

export interface OrchestrationRunInput {
  runId: string
  workflowId: string
  steps: OrchestrationStepInput[]
}

export interface OrchestrationAttempt {
  serviceId: string
  requestId: string
  paymentTxHash: string
  ok: boolean
  statusCode: number
  response: unknown
}

export interface OrchestrationStepResult {
  stepId: string
  succeeded: boolean
  chosenServiceId: string | null
  attempts: OrchestrationAttempt[]
}

export interface OrchestrationRunResult {
  ok: boolean
  runId: string
  workflowId: string
  cancelled?: boolean
  steps: OrchestrationStepResult[]
}

export interface OrchestrationExecutionOptions {
  shouldContinue?: (state: { runId: string; stepId: string; attempts: number }) => Promise<boolean> | boolean
}

function baseUrl() {
  return env.APP_BASE_URL
}

async function executeCandidate(input: {
  serviceId: string
  requestId: string
  paymentTxHash: string
  payload: Record<string, unknown>
}): Promise<OrchestrationAttempt> {
  const body = {
    serviceId: input.serviceId,
    requestId: input.requestId,
    paymentTxHash: input.paymentTxHash,
    payload: input.payload,
  }

  const response = await fetch(`${baseUrl()}/v1/payments/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((error) => ({
    ok: false,
    status: 503,
    json: async () => ({ message: `Orchestrator execute call failed: ${String(error)}` }),
  } as Response))

  const parsed = await response.json().catch(() => ({}))

  return {
    serviceId: input.serviceId,
    requestId: input.requestId,
    paymentTxHash: input.paymentTxHash,
    ok: response.ok,
    statusCode: response.status,
    response: parsed,
  }
}

export async function runOrchestration(
  input: OrchestrationRunInput,
  options?: OrchestrationExecutionOptions,
): Promise<OrchestrationRunResult> {
  const steps: OrchestrationStepResult[] = []

  for (const step of input.steps) {
    const attempts: OrchestrationAttempt[] = []
    let chosenServiceId: string | null = null
    let succeeded = false
    const retryPolicy = buildRetryPolicy(step.retryPolicy)

    for (let i = 0; i < step.candidates.length; i += 1) {
      const candidate = step.candidates[i]
      let retriesSoFar = 0

      while (true) {
        const shouldContinue = options?.shouldContinue
          ? await options.shouldContinue({
              runId: input.runId,
              stepId: step.stepId,
              attempts: attempts.length,
            })
          : true
        if (!shouldContinue) {
          steps.push({
            stepId: step.stepId,
            succeeded: false,
            chosenServiceId: null,
            attempts,
          })

          return {
            ok: false,
            cancelled: true,
            runId: input.runId,
            workflowId: input.workflowId,
            steps,
          }
        }

        const requestId = `${input.runId}_${step.stepId}_${i + 1}_a${retriesSoFar + 1}`

        const attempt = await executeCandidate({
          serviceId: candidate.serviceId,
          requestId,
          paymentTxHash: candidate.paymentTxHash,
          payload: step.payload,
        })

        attempts.push(attempt)

        if (attempt.ok) {
          succeeded = true
          chosenServiceId = candidate.serviceId
          break
        }

        const retry = shouldRetryAttempt({
          attempt,
          retriesSoFar,
          policy: retryPolicy,
        })
        if (!retry) {
          break
        }

        retriesSoFar += 1
        const delayMs = getRetryDelayMs(retryPolicy, retriesSoFar)
        await sleepMs(delayMs)
      }

      if (succeeded) {
        break
      }
    }

    const stepResult: OrchestrationStepResult = {
      stepId: step.stepId,
      succeeded,
      chosenServiceId,
      attempts,
    }

    steps.push(stepResult)

    if (!succeeded) {
      return {
        ok: false,
        runId: input.runId,
        workflowId: input.workflowId,
        steps,
      }
    }
  }

  return {
    ok: true,
    runId: input.runId,
    workflowId: input.workflowId,
    steps,
  }
}
