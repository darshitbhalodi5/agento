'use client'

import { useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../../lib/session-store'
import { orchestrationDemoPresets } from '../../lib/demo-presets'

interface RunRecord {
  runId: string
  workflowId: string
  runStatus?: string
  createdAt?: string
  startedAt?: string | null
  completedAt?: string | null
}

interface RunFilters {
  limit: string
  workflowId: string
  runStatus: string
  provider: string
  dateFrom: string
  dateTo: string
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function OrchestrationsConsole() {
  const { session } = useSessionStore()
  const headers = useMemo(() => buildAuthHeaders(session), [session])

  const [runForm, setRunForm] = useState({
    runId: 'run_demo_001',
    workflowId: 'wf_demo',
    stepsText:
      '[{"stepId":"step_1","payload":{"location":"NYC"},"candidates":[{"serviceId":"weather-api","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}]}]',
  })
  const [filters, setFilters] = useState<RunFilters>({
    limit: '10',
    workflowId: '',
    runStatus: '',
    provider: '',
    dateFrom: '',
    dateTo: '',
  })

  const [runs, setRuns] = useState<RunRecord[]>([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [runOut, setRunOut] = useState('No run action yet.')
  const [runsOut, setRunsOut] = useState('No run history query yet.')
  const [summaryOut, setSummaryOut] = useState('No summary loaded.')
  const [timelineOut, setTimelineOut] = useState('No timeline loaded.')

  async function enqueueRun() {
    let parsedSteps: unknown
    try {
      parsedSteps = JSON.parse(runForm.stepsText)
    } catch (error) {
      setRunOut(
        pretty({
          ok: false,
          error: {
            code: 'RUN_STEPS_JSON_INVALID',
            message: `Run steps JSON parse failed: ${String(error)}`,
          },
        }),
      )
      return
    }

    const result = await apiPost(
      '/v1/orchestrations/run',
      {
        runId: runForm.runId,
        workflowId: runForm.workflowId,
        steps: parsedSteps,
      },
      {
        baseUrl: session.apiBaseUrl,
        headers,
      },
    )
    setRunOut(pretty(result.ok ? result.data : result))
  }

  async function loadTemplate() {
    const result = await apiGet('/v1/orchestrations/template', {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    if (!result.ok) {
      setRunOut(pretty(result))
      return
    }

    const template = (result.data as { template?: unknown }).template
    if (!template || typeof template !== 'object') {
      setRunOut(pretty(result.data))
      return
    }

    const run = template as { runId?: unknown; workflowId?: unknown; steps?: unknown }
    setRunForm((prev) => ({
      ...prev,
      runId: typeof run.runId === 'string' ? run.runId : prev.runId,
      workflowId: typeof run.workflowId === 'string' ? run.workflowId : prev.workflowId,
      stepsText: Array.isArray(run.steps) ? pretty(run.steps) : prev.stepsText,
    }))
    setRunOut(pretty(result.data))
  }

  async function loadRuns() {
    const params = new URLSearchParams()
    if (filters.limit) params.set('limit', filters.limit)
    if (filters.workflowId) params.set('workflowId', filters.workflowId)
    if (filters.runStatus) params.set('runStatus', filters.runStatus)
    if (filters.provider) params.set('provider', filters.provider)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)

    const path = `/v1/orchestrations/runs${params.size > 0 ? `?${params.toString()}` : ''}`
    const result = await apiGet<{ runs?: RunRecord[] }>(path, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setRunsOut(pretty(result.ok ? result.data : result))
    if (result.ok && Array.isArray(result.data.runs)) {
      setRuns(result.data.runs)
    }
  }

  async function loadSummary() {
    if (!selectedRunId) {
      setSummaryOut('Select a run first.')
      return
    }
    const result = await apiGet(`/v1/orchestrations/runs/${encodeURIComponent(selectedRunId)}/summary`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setSummaryOut(pretty(result.ok ? result.data : result))
  }

  async function loadTimeline() {
    if (!selectedRunId) {
      setTimelineOut('Select a run first.')
      return
    }
    const result = await apiGet(`/v1/orchestrations/runs/${encodeURIComponent(selectedRunId)}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setTimelineOut(pretty(result.ok ? result.data : result))
  }

  async function cancelRun() {
    if (!selectedRunId) {
      setRunOut('Select a run first.')
      return
    }
    const result = await apiPost(`/v1/orchestrations/runs/${encodeURIComponent(selectedRunId)}/cancel`, {}, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setRunOut(pretty(result.ok ? result.data : result))
  }

  function applyHappyPreset() {
    const runId = `${orchestrationDemoPresets.happy.runIdPrefix}_${Date.now()}`
    setRunForm({
      runId,
      workflowId: orchestrationDemoPresets.happy.workflowId,
      stepsText:
        '[{"stepId":"step_1","payload":{"location":"NYC"},"candidates":[{"serviceId":"weather-api","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}]},{"stepId":"step_2","payload":{"mode":"confirm"},"candidates":[{"serviceId":"weather-api","paymentTxHash":"0x2222222222222222222222222222222222222222222222222222222222222222"}]}]',
    })
  }

  function applyErrorPreset() {
    const runId = `${orchestrationDemoPresets.error.runIdPrefix}_${Date.now()}`
    setRunForm({
      runId,
      workflowId: orchestrationDemoPresets.error.workflowId,
      stepsText:
        '[{"stepId":"step_fail","payload":{"location":"NYC"},"candidates":[{"serviceId":"weather-api","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}],"retryPolicy":{"maxRetries":1,"backoffMs":100}}]',
    })
  }

  return (
    <section className="card">
      <h2>Orchestrations Console</h2>
      <p className="subtitle">
        Requires <code>x-agent-api-key</code> for run enqueue. Use session controls to set the key and API base URL.
      </p>
      <div className="actions-row">
        <button type="button" className="btn" onClick={applyHappyPreset}>
          Preset: Happy Path Run
        </button>
        <button type="button" className="btn" onClick={applyErrorPreset}>
          Preset: Error Path Run
        </button>
      </div>

      <div className="orchestration-grid">
        <article className="panel">
          <h3>Run Enqueue</h3>
          <div className="form-grid">
            <label>
              Run ID
              <input value={runForm.runId} onChange={(event) => setRunForm((prev) => ({ ...prev, runId: event.target.value }))} />
            </label>
            <label>
              Workflow ID
              <input
                value={runForm.workflowId}
                onChange={(event) => setRunForm((prev) => ({ ...prev, workflowId: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Steps JSON
              <textarea
                rows={8}
                value={runForm.stepsText}
                onChange={(event) => setRunForm((prev) => ({ ...prev, stepsText: event.target.value }))}
              />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={loadTemplate}>
              Load Template
            </button>
            <button type="button" className="btn" onClick={enqueueRun}>
              POST /v1/orchestrations/run
            </button>
            <button type="button" className="btn" onClick={cancelRun}>
              Cancel Selected Run
            </button>
          </div>
          <pre className="result">{runOut}</pre>
        </article>

        <article className="panel">
          <h3>Run History Filters</h3>
          <div className="form-grid">
            <label>
              Limit
              <input value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, limit: event.target.value }))} />
            </label>
            <label>
              Workflow ID
              <input
                value={filters.workflowId}
                onChange={(event) => setFilters((prev) => ({ ...prev, workflowId: event.target.value }))}
              />
            </label>
            <label>
              Run Status
              <select
                value={filters.runStatus}
                onChange={(event) => setFilters((prev) => ({ ...prev, runStatus: event.target.value }))}
              >
                <option value="">any</option>
                <option value="queued">queued</option>
                <option value="running">running</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label>
              Provider
              <input value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))} />
            </label>
            <label>
              Date From (ISO)
              <input value={filters.dateFrom} onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))} />
            </label>
            <label>
              Date To (ISO)
              <input value={filters.dateTo} onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))} />
            </label>
          </div>
          <button type="button" className="btn" onClick={loadRuns}>
            GET /v1/orchestrations/runs
          </button>
          <pre className="result">{runsOut}</pre>
        </article>
      </div>

      <div className="registry-lists">
        <section className="panel">
          <h3>Runs ({runs.length})</h3>
          <div className="list">
            {runs.map((run) => (
              <button key={run.runId} type="button" className="item item-button" onClick={() => setSelectedRunId(run.runId)}>
                <strong>{run.runId}</strong> | {run.workflowId} | {run.runStatus || 'unknown'}
              </button>
            ))}
            {runs.length === 0 ? <div className="item">No runs loaded.</div> : null}
          </div>
          <p className="subtitle">
            Selected Run: <code>{selectedRunId || 'none'}</code>
          </p>
          <div className="actions-row">
            <button type="button" className="btn" onClick={loadSummary}>
              GET Summary
            </button>
            <button type="button" className="btn" onClick={loadTimeline}>
              GET Timeline
            </button>
          </div>
        </section>

        <section className="panel">
          <h3>Summary Output</h3>
          <pre className="result">{summaryOut}</pre>
        </section>

        <section className="panel">
          <h3>Timeline Output</h3>
          <pre className="result">{timelineOut}</pre>
        </section>
      </div>
    </section>
  )
}
