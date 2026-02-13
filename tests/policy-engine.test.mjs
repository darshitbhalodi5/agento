import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePolicyDecision } from '../dist/services/policy-engine.js'

test('policy engine passes when no limits are exceeded', () => {
  const result = evaluatePolicyDecision({
    consumerId: 'agent-alpha',
    servicePriceAtomic: '1000',
    policy: {
      maxCallsPerMinute: 10,
      maxSpendPerHourAtomic: '50000',
      maxSpendPerDayAtomic: '200000',
      allowlistConsumerIds: [],
      blocklistConsumerIds: [],
    },
    usage: {
      callsLastMinute: 2,
      spendLastHourAtomic: '1000',
      spendLastDayAtomic: '5000',
    },
  })

  assert.equal(result.allowed, true)
})

test('policy engine blocks blocklisted consumer', () => {
  const result = evaluatePolicyDecision({
    consumerId: 'agent-bad',
    servicePriceAtomic: '1000',
    policy: {
      maxCallsPerMinute: null,
      maxSpendPerHourAtomic: null,
      maxSpendPerDayAtomic: null,
      allowlistConsumerIds: [],
      blocklistConsumerIds: ['agent-bad'],
    },
    usage: {
      callsLastMinute: 0,
      spendLastHourAtomic: '0',
      spendLastDayAtomic: '0',
    },
  })

  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.policyCode, 'POLICY_CONSUMER_BLOCKLISTED')
})

test('policy engine blocks calls-per-minute overflow', () => {
  const result = evaluatePolicyDecision({
    servicePriceAtomic: '1000',
    policy: {
      maxCallsPerMinute: 3,
      maxSpendPerHourAtomic: null,
      maxSpendPerDayAtomic: null,
      allowlistConsumerIds: [],
      blocklistConsumerIds: [],
    },
    usage: {
      callsLastMinute: 3,
      spendLastHourAtomic: '0',
      spendLastDayAtomic: '0',
    },
  })

  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.policyCode, 'POLICY_MAX_CALLS_PER_MINUTE_EXCEEDED')
})

test('policy engine blocks projected hourly spend overflow', () => {
  const result = evaluatePolicyDecision({
    servicePriceAtomic: '2000',
    policy: {
      maxCallsPerMinute: null,
      maxSpendPerHourAtomic: '5000',
      maxSpendPerDayAtomic: null,
      allowlistConsumerIds: [],
      blocklistConsumerIds: [],
    },
    usage: {
      callsLastMinute: 0,
      spendLastHourAtomic: '4000',
      spendLastDayAtomic: '4000',
    },
  })

  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.policyCode, 'POLICY_MAX_SPEND_PER_HOUR_EXCEEDED')
})

