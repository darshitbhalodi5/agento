export interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  backoffMultiplier: number
  maxBackoffMs: number
  retryableStatusCodes: number[]
  retryableErrorCodes: string[]
}

export interface RetryPolicyInput {
  maxRetries?: number
  backoffMs?: number
  backoffMultiplier?: number
  maxBackoffMs?: number
  retryableStatusCodes?: number[]
  retryableErrorCodes?: string[]
}

interface AttemptLike {
  ok: boolean
  statusCode: number
  response: unknown
}

interface ErrorEnvelope {
  error?: { code?: unknown }
}

const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 1,
  backoffMs: 250,
  backoffMultiplier: 2,
  maxBackoffMs: 2_000,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
  retryableErrorCodes: ['DOWNSTREAM_ERROR', 'PAYMENT_NOT_FOUND'],
}

export function buildRetryPolicy(input?: RetryPolicyInput): RetryPolicy {
  if (!input) {
    return { ...defaultRetryPolicy }
  }

  return {
    maxRetries: Math.max(0, Math.floor(input.maxRetries ?? defaultRetryPolicy.maxRetries)),
    backoffMs: Math.max(0, Math.floor(input.backoffMs ?? defaultRetryPolicy.backoffMs)),
    backoffMultiplier: Math.max(1, input.backoffMultiplier ?? defaultRetryPolicy.backoffMultiplier),
    maxBackoffMs: Math.max(0, Math.floor(input.maxBackoffMs ?? defaultRetryPolicy.maxBackoffMs)),
    retryableStatusCodes: input.retryableStatusCodes ?? defaultRetryPolicy.retryableStatusCodes,
    retryableErrorCodes: input.retryableErrorCodes ?? defaultRetryPolicy.retryableErrorCodes,
  }
}

export function getAttemptErrorCode(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null
  }

  const envelope = response as ErrorEnvelope
  return typeof envelope.error?.code === 'string' ? envelope.error.code : null
}

export function shouldRetryAttempt(params: {
  attempt: AttemptLike
  retriesSoFar: number
  policy: RetryPolicy
}): boolean {
  const { attempt, retriesSoFar, policy } = params
  if (attempt.ok) {
    return false
  }

  if (retriesSoFar >= policy.maxRetries) {
    return false
  }

  if (policy.retryableStatusCodes.includes(attempt.statusCode)) {
    return true
  }

  const errorCode = getAttemptErrorCode(attempt.response)
  return errorCode ? policy.retryableErrorCodes.includes(errorCode) : false
}

export function getRetryDelayMs(policy: RetryPolicy, retryAttemptNumber: number): number {
  const exponent = Math.max(0, retryAttemptNumber - 1)
  const delay = Math.round(policy.backoffMs * Math.pow(policy.backoffMultiplier, exponent))
  return Math.min(policy.maxBackoffMs, Math.max(0, delay))
}

export async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}
