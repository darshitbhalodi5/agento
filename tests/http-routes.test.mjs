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
