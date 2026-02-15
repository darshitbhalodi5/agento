'use client'

import { useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../../lib/session-store'

interface QuoteFormState {
  serviceId: string
  endpoint: string
}

interface ExecuteFormState {
  serviceId: string
  requestId: string
  consumerId: string
  paymentTxHash: string
  payloadText: string
}

interface StatusFormState {
  serviceId: string
  requestId: string
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function PaymentsConsole() {
  const { session } = useSessionStore()
  const headers = useMemo(() => buildAuthHeaders(session), [session])

  const [quoteForm, setQuoteForm] = useState<QuoteFormState>({
    serviceId: 'weather-api',
    endpoint: '/forecast/7d',
  })
  const [executeForm, setExecuteForm] = useState<ExecuteFormState>({
    serviceId: 'weather-api',
    requestId: 'req_demo_001',
    consumerId: '',
    paymentTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    payloadText: '{"location":"NYC"}',
  })
  const [statusForm, setStatusForm] = useState<StatusFormState>({
    serviceId: 'weather-api',
    requestId: 'req_demo_001',
  })

  const [quoteOut, setQuoteOut] = useState('No quote yet.')
  const [executeOut, setExecuteOut] = useState('No execute response yet.')
  const [statusOut, setStatusOut] = useState('No status response yet.')
  const [simulateOut, setSimulateOut] = useState('No simulated payment yet.')

  async function runQuote() {
    const result = await apiPost('/v1/payments/quote', quoteForm, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setQuoteOut(pretty(result.ok ? result.data : result))
  }

  async function runExecute() {
    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(executeForm.payloadText)
    } catch (error) {
      setExecuteOut(
        pretty({
          ok: false,
          error: {
            code: 'PAYLOAD_JSON_INVALID',
            message: `Payload JSON parse failed: ${String(error)}`,
          },
        }),
      )
      return
    }

    const body: Record<string, unknown> = {
      serviceId: executeForm.serviceId,
      requestId: executeForm.requestId,
      paymentTxHash: executeForm.paymentTxHash,
      payload: parsedPayload,
    }
    if (executeForm.consumerId.trim().length > 0) {
      body.consumerId = executeForm.consumerId.trim()
    }

    const result = await apiPost('/v1/payments/execute', body, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setExecuteOut(pretty(result.ok ? result.data : result))
  }

  async function runSimulatePayment() {
    const result = await apiPost<{
      simulation?: {
        paymentTxHash?: string
      }
    }>(
      '/v1/payments/simulate',
      {
        serviceId: executeForm.serviceId,
        requestId: executeForm.requestId,
      },
      {
        baseUrl: session.apiBaseUrl,
        headers,
      },
    )

    setSimulateOut(pretty(result.ok ? result.data : result))

    if (result.ok && result.data.simulation?.paymentTxHash) {
      const txHash = result.data.simulation.paymentTxHash
      setExecuteForm((prev) => ({ ...prev, paymentTxHash: txHash }))
      setStatusForm((prev) => ({
        ...prev,
        serviceId: executeForm.serviceId,
        requestId: executeForm.requestId,
      }))
    }
  }

  async function runStatus() {
    const path = `/v1/requests/${encodeURIComponent(statusForm.requestId)}?serviceId=${encodeURIComponent(statusForm.serviceId)}`
    const result = await apiGet(path, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setStatusOut(pretty(result.ok ? result.data : result))
  }

  function applyHappyPreset() {
    const requestId = `req_happy_${Date.now()}`
    setExecuteForm((prev) => ({
      ...prev,
      serviceId: 'weather-api',
      requestId,
      paymentTxHash: '0xREPLACE_WITH_REAL_TEMPO_TX_HASH',
      payloadText: '{"location":"NYC"}',
    }))
    setStatusForm((prev) => ({
      ...prev,
      serviceId: 'weather-api',
      requestId,
    }))
  }

  function applyErrorPreset() {
    const requestId = `req_error_${Date.now()}`
    setExecuteForm((prev) => ({
      ...prev,
      serviceId: 'weather-api',
      requestId,
      paymentTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      payloadText: '{"location":"NYC"}',
    }))
    setStatusForm((prev) => ({
      ...prev,
      serviceId: 'weather-api',
      requestId,
    }))
  }

  return (
    <section className="card">
      <h2>Payments Console</h2>
      <p className="subtitle">
        Uses shared session controls for <code>x-agent-api-key</code>, <code>x-user-role</code>, and API base URL.
      </p>

      <div className="actions-row">
        <button type="button" className="btn" onClick={applyHappyPreset}>
          Happy Path Preset
        </button>
        <button type="button" className="btn" onClick={applyErrorPreset}>
          Error Path Preset
        </button>
      </div>

      <div className="payments-grid">
        <article className="panel">
          <h3>Quote</h3>
          <div className="form-grid">
            <label>
              Service ID
              <input
                value={quoteForm.serviceId}
                onChange={(event) => setQuoteForm((prev) => ({ ...prev, serviceId: event.target.value }))}
              />
            </label>
            <label>
              Endpoint
              <input
                value={quoteForm.endpoint}
                onChange={(event) => setQuoteForm((prev) => ({ ...prev, endpoint: event.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={runQuote}>
            Run Quote
          </button>
          <pre className="result">{quoteOut}</pre>
        </article>

        <article className="panel">
          <h3>Execute</h3>
          <div className="form-grid">
            <label>
              Service ID
              <input
                value={executeForm.serviceId}
                onChange={(event) => setExecuteForm((prev) => ({ ...prev, serviceId: event.target.value }))}
              />
            </label>
            <label>
              Request ID
              <input
                value={executeForm.requestId}
                onChange={(event) => setExecuteForm((prev) => ({ ...prev, requestId: event.target.value }))}
              />
            </label>
            <label>
              Consumer ID (optional)
              <input
                value={executeForm.consumerId}
                onChange={(event) => setExecuteForm((prev) => ({ ...prev, consumerId: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Payment Tx Hash
              <input
                value={executeForm.paymentTxHash}
                onChange={(event) => setExecuteForm((prev) => ({ ...prev, paymentTxHash: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Payload JSON
              <textarea
                rows={6}
                value={executeForm.payloadText}
                onChange={(event) => setExecuteForm((prev) => ({ ...prev, payloadText: event.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={runExecute}>
            Verify + Execute
          </button>
          <button type="button" className="btn" onClick={runSimulatePayment}>
            Simulate On-chain Payment
          </button>
          <pre className="result">{simulateOut}</pre>
          <pre className="result">{executeOut}</pre>
        </article>

        <article className="panel">
          <h3>Status</h3>
          <div className="form-grid">
            <label>
              Service ID
              <input
                value={statusForm.serviceId}
                onChange={(event) => setStatusForm((prev) => ({ ...prev, serviceId: event.target.value }))}
              />
            </label>
            <label>
              Request ID
              <input
                value={statusForm.requestId}
                onChange={(event) => setStatusForm((prev) => ({ ...prev, requestId: event.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={runStatus}>
            Fetch Status
          </button>
          <pre className="result">{statusOut}</pre>
        </article>
      </div>
    </section>
  )
}
