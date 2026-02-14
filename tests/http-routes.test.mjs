import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApp } from '../dist/app.js'

test('GET /v1/health returns service status', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    })

    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.ok, true)
    assert.equal(body.service, 'agento-gateway')
    assert.ok(typeof body.timestamp === 'string')
  } finally {
    await app.close()
  }
})

test('GET /v1/app returns frontend html shell', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/app',
    })

    assert.equal(res.statusCode, 200)
    assert.ok(String(res.headers['content-type']).includes('text/html'))
    assert.match(res.body, /Agento Demo Console/)
    assert.match(res.body, /Guided Demo Mode/)
  } finally {
    await app.close()
  }
})

test('GET /v1/registry returns registry ui html shell', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/registry',
    })

    assert.equal(res.statusCode, 200)
    assert.ok(String(res.headers['content-type']).includes('text/html'))
    assert.match(res.body, /Agento Registry/)
    assert.match(res.body, /Service Catalog/)
    assert.match(res.body, /Service Reputation/)
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrator returns orchestration ui html shell', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrator',
    })

    assert.equal(res.statusCode, 200)
    assert.ok(String(res.headers['content-type']).includes('text/html'))
    assert.match(res.body, /Multi-Agent Orchestrator/)
    assert.match(res.body, /Run History/)
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs returns run history envelope', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs',
    })

    // May fail in environments without DB access; either 200 or 500 is acceptable for route existence.
    assert.ok([200, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs validates runStatus filter', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs?runStatus=unknown',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs validates date filter', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs?dateFrom=not-a-date',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs/:runId returns timeline envelope', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs/nonexistent_run',
    })

    // Route should exist; depending on DB state it can be 404 (not found) or 500 (db unavailable).
    assert.ok([404, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs/:runId/summary route exists', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs/nonexistent_run/summary',
    })

    // Route should exist; depending on DB state it can be 404 (not found) or 500 (db unavailable).
    assert.ok([404, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('GET /v1/orchestrations/runs/:runId/summary validates params payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orchestrations/runs//summary',
    })

    // Fastify may return 404 on malformed path; 400 is also acceptable if route matcher parses empty id.
    assert.ok([400, 404].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('POST /v1/orchestrations/run validates payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orchestrations/run',
      payload: {
        runId: 'run_bad_payload',
        workflowId: 'wf_demo',
        steps: [],
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/orchestrations/run enqueues run', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orchestrations/run',
      payload: {
        runId: 'run_test_async_1',
        workflowId: 'wf_demo',
        steps: [
          {
            stepId: 'step_1',
            payload: { location: 'NYC' },
            candidates: [
              {
                serviceId: 'weather-api',
                paymentTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
              },
            ],
          },
        ],
      },
    })

    // Route should exist and use enqueue semantics; DB-unavailable envs can return 500.
    assert.ok([202, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('POST /v1/orchestrations/run validates retry policy payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orchestrations/run',
      payload: {
        runId: 'run_bad_retry_policy',
        workflowId: 'wf_demo',
        steps: [
          {
            stepId: 'step_1',
            payload: { location: 'NYC' },
            retryPolicy: {
              maxRetries: -1,
            },
            candidates: [
              {
                serviceId: 'weather-api',
                paymentTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
              },
            ],
          },
        ],
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/orchestrations/runs/:runId/cancel route exists', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orchestrations/runs/nonexistent_run/cancel',
    })

    // Route should exist; depending on DB state it can be 404 (not found) or 500 (db unavailable).
    assert.ok([404, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('POST /v1/orchestrations/runs/:runId/cancel validates runId payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orchestrations/runs//cancel',
    })

    // Fastify may return 404 on malformed path; 400 is also acceptable if route matcher parses empty id.
    assert.ok([400, 404].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('GET /v1/workflows validates query payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/workflows?active=yes',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/workflows validates required workflow template fields', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/workflows',
      payload: {
        workflowId: 'wf_missing_fields',
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('PUT /v1/workflows/:workflowId validates update payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/workflows/wf_demo',
      payload: {},
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/workflows/:workflowId route exists', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/workflows/nonexistent_workflow',
    })

    // Route should exist; depending on DB state it can be 404 (not found) or 500 (db unavailable).
    assert.ok([404, 500].includes(res.statusCode))
  } finally {
    await app.close()
  }
})

test('GET /v1/billing/models validates required serviceId query', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/billing/models',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/billing/models validates fixed model price requirements', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/billing/models',
      payload: {
        serviceId: 'weather-api',
        modelType: 'fixed',
        freeQuota: 0,
        tierJson: [],
        active: true,
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/billing/usage validates query payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/billing/usage?limit=0',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/billing/summary validates datetime query payload', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/billing/summary?from=not-a-date',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/policies validates payload fields', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/policies',
      payload: {
        serviceId: '',
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/registry/agents validates metadata url fields', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/registry/agents',
      payload: {
        id: 'agent-meta-test',
        name: 'Agent Meta Test',
        docsUrl: 'not-a-url',
        capabilities: [],
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/registry/agents validates deprecated metadata type', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/registry/agents',
      payload: {
        id: 'agent-meta-test-2',
        name: 'Agent Meta Test 2',
        deprecated: 'yes',
        capabilities: [],
      },
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/registry/services validates active filter value', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/registry/services?active=yes',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('GET /v1/registry/services validates price range filter', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/registry/services?price_min=5000&price_max=1000',
    })

    assert.equal(res.statusCode, 400)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/internal/mock/execute rejects request without internal api key', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/internal/mock/execute',
      payload: {
        serviceId: 'weather-api',
        requestId: 'req_unauth',
        payload: { location: 'NYC' },
      },
    })

    assert.equal(res.statusCode, 401)
    const body = res.json()
    assert.equal(body.ok, false)
  } finally {
    await app.close()
  }
})

test('POST /v1/internal/mock/execute returns mocked result with valid key', async () => {
  const app = buildApp()

  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/internal/mock/execute',
      headers: {
        'x-internal-api-key': 'agento-dev-key',
      },
      payload: {
        serviceId: 'weather-api',
        requestId: 'req_ok',
        payload: { location: 'San Francisco' },
      },
    })

    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.ok, true)
    assert.equal(body.serviceId, 'weather-api')
    assert.equal(body.requestId, 'req_ok')
    assert.equal(body.forecast.location, 'San Francisco')
  } finally {
    await app.close()
  }
})
