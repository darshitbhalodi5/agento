'use client'

import { useMemo, useState } from 'react'
import { apiGet } from '../../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../../lib/session-store'

interface RunMetrics {
  runCount?: number
  avgRunDurationMs?: number | null
  avgFallbackDepth?: number | null
}

interface RunRecord {
  runId: string
  workflowId: string
  runStatus?: string
  createdAt?: string
}

interface ReputationRow {
  serviceId: string
  successRate?: number | null
  medianLatencyMs?: number | null
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ObservabilityConsole() {
  const { session } = useSessionStore()
  const headers = useMemo(() => buildAuthHeaders(session), [session])

  const [metrics, setMetrics] = useState<RunMetrics>({})
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [reputation, setReputation] = useState<ReputationRow[]>([])
  const [billingOut, setBillingOut] = useState('No billing summary query yet.')
  const [rawOut, setRawOut] = useState('No observability query yet.')

  async function refreshObservability() {
    const runsResult = await apiGet<{ runs?: RunRecord[]; metrics?: RunMetrics }>('/v1/orchestrations/runs?limit=10', {
      baseUrl: session.apiBaseUrl,
      headers,
    })

    const reputationResult = await apiGet<{ reputation?: ReputationRow[] }>('/v1/reputation/services?limit=10', {
      baseUrl: session.apiBaseUrl,
      headers,
    })

    const combined = {
      runs: runsResult.ok ? runsResult.data : runsResult,
      reputation: reputationResult.ok ? reputationResult.data : reputationResult,
    }
    setRawOut(pretty(combined))

    if (runsResult.ok) {
      setRuns(Array.isArray(runsResult.data.runs) ? runsResult.data.runs : [])
      setMetrics(runsResult.data.metrics ?? {})
    }
    if (reputationResult.ok) {
      setReputation(Array.isArray(reputationResult.data.reputation) ? reputationResult.data.reputation : [])
    }
  }

  async function loadBillingSummary() {
    const now = new Date()
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()

    const result = await apiGet(`/v1/billing/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setBillingOut(pretty(result.ok ? result.data : result))
  }

  async function runWalkthroughSnapshot() {
    await refreshObservability()
    await loadBillingSummary()
  }

  const dashboardHref = `${session.apiBaseUrl}/v1/dashboard`
  const healthHref = `${session.apiBaseUrl}/v1/health`

  return (
    <section className="card">
      <h2>Observability Console</h2>
      <p className="subtitle">Frontend evidence view for operator metrics, recent runs, and reputation read models.</p>

      <div className="actions-row">
        <button type="button" className="btn" onClick={refreshObservability}>
          Refresh Observability
        </button>
        <button type="button" className="btn" onClick={loadBillingSummary}>
          Load Billing Summary (24h)
        </button>
        <button type="button" className="btn" onClick={runWalkthroughSnapshot}>
          Preset: Judge Snapshot
        </button>
        <a className="btn link-btn" href={dashboardHref} target="_blank" rel="noreferrer">
          Open Backend Dashboard
        </a>
        <a className="btn link-btn" href={healthHref} target="_blank" rel="noreferrer">
          Open Health JSON
        </a>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <p className="metric-key">Run Count</p>
          <p className="metric-value">{metrics.runCount ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="metric-key">Avg Run Duration (ms)</p>
          <p className="metric-value">{typeof metrics.avgRunDurationMs === 'number' ? metrics.avgRunDurationMs.toFixed(1) : '-'}</p>
        </article>
        <article className="metric-card">
          <p className="metric-key">Avg Fallback Depth</p>
          <p className="metric-value">{typeof metrics.avgFallbackDepth === 'number' ? metrics.avgFallbackDepth.toFixed(2) : '-'}</p>
        </article>
      </div>

      <div className="registry-lists">
        <section className="panel">
          <h3>Recent Runs ({runs.length})</h3>
          <div className="list">
            {runs.map((run) => (
              <div key={run.runId} className="item">
                <strong>{run.runId}</strong> | {run.workflowId} | {run.runStatus || 'unknown'}
              </div>
            ))}
            {runs.length === 0 ? <div className="item">No runs loaded.</div> : null}
          </div>
        </section>

        <section className="panel">
          <h3>Reputation Snapshot ({reputation.length})</h3>
          <div className="list">
            {reputation.map((row) => (
              <div key={row.serviceId} className="item">
                <strong>{row.serviceId}</strong> | success {typeof row.successRate === 'number' ? row.successRate.toFixed(2) : 'n/a'} | median{' '}
                {typeof row.medianLatencyMs === 'number' ? `${row.medianLatencyMs}ms` : 'n/a'}
              </div>
            ))}
            {reputation.length === 0 ? <div className="item">No reputation rows loaded.</div> : null}
          </div>
        </section>
      </div>

      <div className="registry-lists">
        <section className="panel">
          <h3>Billing Summary Output</h3>
          <pre className="result">{billingOut}</pre>
        </section>
        <section className="panel">
          <h3>Raw Observability Output</h3>
          <pre className="result">{rawOut}</pre>
        </section>
      </div>
    </section>
  )
}
