import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRetryPolicy,
  getRetryDelayMs,
  shouldRetryAttempt,
} from '../dist/services/retry-policy.js'

test('buildRetryPolicy applies defaults', () => {
  const policy = buildRetryPolicy()

  assert.equal(policy.maxRetries, 1)
  assert.equal(policy.backoffMs, 250)
  assert.equal(policy.maxBackoffMs, 2000)
  assert.ok(policy.retryableStatusCodes.includes(503))
})

test('shouldRetryAttempt retries on configured status until max retries', () => {
  const policy = buildRetryPolicy({ maxRetries: 2, retryableStatusCodes: [503] })

  const first = shouldRetryAttempt({
    attempt: { ok: false, statusCode: 503, response: {} },
    retriesSoFar: 0,
    policy,
  })
  assert.equal(first, true)

  const second = shouldRetryAttempt({
    attempt: { ok: false, statusCode: 503, response: {} },
    retriesSoFar: 1,
    policy,
  })
  assert.equal(second, true)

  const exhausted = shouldRetryAttempt({
    attempt: { ok: false, statusCode: 503, response: {} },
    retriesSoFar: 2,
    policy,
  })
  assert.equal(exhausted, false)
})

test('shouldRetryAttempt retries on configured error code', () => {
  const policy = buildRetryPolicy({
    maxRetries: 1,
    retryableStatusCodes: [],
    retryableErrorCodes: ['DOWNSTREAM_ERROR'],
  })

  const retry = shouldRetryAttempt({
    attempt: {
      ok: false,
      statusCode: 400,
      response: {
        error: { code: 'DOWNSTREAM_ERROR' },
      },
    },
    retriesSoFar: 0,
    policy,
  })
  assert.equal(retry, true)
})

test('getRetryDelayMs applies capped exponential backoff', () => {
  const policy = buildRetryPolicy({
    backoffMs: 100,
    backoffMultiplier: 3,
    maxBackoffMs: 500,
  })

  assert.equal(getRetryDelayMs(policy, 1), 100)
  assert.equal(getRetryDelayMs(policy, 2), 300)
  assert.equal(getRetryDelayMs(policy, 3), 500)
})
