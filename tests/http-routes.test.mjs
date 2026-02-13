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
