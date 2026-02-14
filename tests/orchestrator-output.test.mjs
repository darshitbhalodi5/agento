import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRunOutput } from '../dist/services/orchestrator.js'

test('buildRunOutput aggregates successful step outputs and final output', () => {
  const runOutput = buildRunOutput([
    {
      stepId: 'step_1',
      succeeded: true,
      chosenServiceId: 'weather-api',
      attempts: [
        { serviceId: 'weather-api', requestId: 'r1', paymentTxHash: '0x1', ok: true, statusCode: 200, response: { a: 1 } },
      ],
    },
    {
      stepId: 'step_2',
      succeeded: true,
      chosenServiceId: 'travel-api',
      attempts: [
        { serviceId: 'travel-api', requestId: 'r2', paymentTxHash: '0x2', ok: false, statusCode: 503, response: {} },
        { serviceId: 'travel-api', requestId: 'r3', paymentTxHash: '0x3', ok: true, statusCode: 200, response: { b: 2 } },
      ],
    },
  ])

  assert.equal(runOutput.steps.length, 2)
  assert.equal(runOutput.steps[0].attemptCount, 1)
  assert.deepEqual(runOutput.steps[1].output, { b: 2 })
  assert.equal(runOutput.finalStepId, 'step_2')
  assert.deepEqual(runOutput.finalOutput, { b: 2 })
})

test('buildRunOutput returns null final output when no successful steps', () => {
  const runOutput = buildRunOutput([
    {
      stepId: 'step_fail',
      succeeded: false,
      chosenServiceId: null,
      attempts: [{ serviceId: 'x', requestId: 'r', paymentTxHash: '0x4', ok: false, statusCode: 400, response: {} }],
    },
  ])

  assert.equal(runOutput.finalStepId, null)
  assert.equal(runOutput.finalOutput, null)
  assert.equal(runOutput.steps[0].output, null)
})
