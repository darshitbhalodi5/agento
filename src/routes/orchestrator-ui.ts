import type { FastifyPluginAsync } from 'fastify'

export const orchestratorUiRoutes: FastifyPluginAsync = async (app) => {
  app.get('/orchestrator', async (_request, reply) => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agento Orchestrator</title>
  <style>
    :root {
      --navy: #0B1220;
      --cyan: #19C2FF;
      --line: #E2E8F0;
      --text: #334155;
      --muted: #64748B;
      --ok: #16A34A;
      --bad: #DC2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      color: var(--text);
      background: linear-gradient(160deg, #f2f8ff 0%, #f8fafc 55%, #ecfdf5 100%);
    }
    .wrap { max-width: 1100px; margin: 20px auto; padding: 0 16px; }
    .hero {
      border-radius: 16px;
      background: linear-gradient(135deg, #0B1220 0%, #0E1E3A 45%, #19C2FF 100%);
      color: #fff;
      padding: 20px;
      margin-bottom: 12px;
    }
    .hero h1 { margin: 0; }
    .hero p { margin: 7px 0 0; opacity: .9; }
    .hero a { color: #fff; margin-right: 10px; font-size: 13px; }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    h2 { margin: 0 0 8px; color: var(--navy); }
    textarea {
      width: 100%;
      min-height: 260px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      color: var(--text);
      background: #f8fafc;
    }
    .actions { margin: 10px 0; display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      border: 0;
      border-radius: 8px;
      padding: 9px 12px;
      cursor: pointer;
      font-weight: 600;
      background: var(--navy);
      color: #fff;
    }
    button.alt { background: var(--cyan); color: #04283a; }
    .status { font-size: 13px; margin: 8px 0; color: var(--muted); }
    .result {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #f8fafc;
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      white-space: pre-wrap;
      overflow: auto;
      max-height: 300px;
    }
    .ok { color: var(--ok); font-weight: 600; }
    .bad { color: var(--bad); font-weight: 600; }
    .grid {
      margin-top: 12px;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .filters {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 10px;
    }
    .filters label {
      font-size: 12px;
      color: var(--muted);
      display: grid;
      gap: 4px;
    }
    .filters input, .filters select {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 7px 8px;
      font-size: 13px;
      background: #fff;
      color: var(--text);
    }
    .metrics {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      background: #f8fafc;
    }
    .metric .k { font-size: 11px; color: var(--muted); }
    .metric .v { font-size: 20px; font-weight: 700; color: var(--navy); }
    .list { display: grid; gap: 8px; }
    .item {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      font-size: 13px;
    }
    @media (max-width: 920px) {
      .grid { grid-template-columns: 1fr; }
      .filters { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Agento Multi-Agent Orchestrator</h1>
      <p>Run multi-step workflows with service fallback and step-level payment execution.</p>
      <div>
        <a href="/v1/registry" target="_blank" rel="noreferrer">Open Registry</a>
        <a href="/v1/dashboard" target="_blank" rel="noreferrer">Open Dashboard</a>
      </div>
    </section>

    <section class="card">
      <h2>Workflow Runner</h2>
      <textarea id="payload"></textarea>
      <div class="actions">
        <button id="load-template" type="button">Load Template</button>
        <button id="run" type="button" class="alt">Run Workflow</button>
      </div>
      <div id="status" class="status">Template not loaded.</div>
      <pre id="result" class="result">No run yet.</pre>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Run History</h2>
        <div class="filters">
          <label>Workflow
            <input id="filter-workflow" placeholder="wf_agent_commerce_demo" />
          </label>
          <label>Status
            <select id="filter-status">
              <option value="">Any</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label>Provider
            <input id="filter-provider" placeholder="weather-api" />
          </label>
          <label>Date From (ISO)
            <input id="filter-date-from" placeholder="2026-02-14T00:00:00.000Z" />
          </label>
          <label>Date To (ISO)
            <input id="filter-date-to" placeholder="2026-02-14T23:59:59.999Z" />
          </label>
        </div>
        <div class="metrics">
          <div class="metric"><div class="k">Runs</div><div id="metric-runs" class="v">0</div></div>
          <div class="metric"><div class="k">Avg Run Duration (ms)</div><div id="metric-duration" class="v">-</div></div>
          <div class="metric"><div class="k">Avg Fallback Depth</div><div id="metric-fallback" class="v">-</div></div>
        </div>
        <div class="actions">
          <button id="refresh-runs" type="button">Refresh Runs</button>
          <button id="apply-filters" type="button" class="alt">Apply Filters</button>
        </div>
        <div id="runs-list" class="list"></div>
      </article>

      <article class="card">
        <h2>Run Timeline</h2>
        <div class="actions">
          <button id="load-selected" type="button" class="alt">Load Selected Timeline</button>
        </div>
        <pre id="timeline" class="result">No timeline loaded.</pre>
      </article>
    </section>
  </div>

  <script>
    const payloadEl = document.getElementById('payload')
    const resultEl = document.getElementById('result')
    const statusEl = document.getElementById('status')
    const runsListEl = document.getElementById('runs-list')
    const timelineEl = document.getElementById('timeline')
    const filterWorkflowEl = document.getElementById('filter-workflow')
    const filterStatusEl = document.getElementById('filter-status')
    const filterProviderEl = document.getElementById('filter-provider')
    const filterDateFromEl = document.getElementById('filter-date-from')
    const filterDateToEl = document.getElementById('filter-date-to')
    const metricRunsEl = document.getElementById('metric-runs')
    const metricDurationEl = document.getElementById('metric-duration')
    const metricFallbackEl = document.getElementById('metric-fallback')
    let selectedRunId = ''

    function pretty(obj) {
      try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
    }

    async function loadTemplate() {
      const res = await fetch('/v1/orchestrations/template')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.template) {
        statusEl.innerHTML = '<span class="bad">Failed to load template</span>'
        resultEl.textContent = pretty(data)
        return
      }
      payloadEl.value = pretty(data.template)
      statusEl.innerHTML = '<span class="ok">Template loaded</span>'
      resultEl.textContent = 'Ready to run.'
    }

    async function runWorkflow() {
      let payload
      try {
        payload = JSON.parse(payloadEl.value)
      } catch (error) {
        statusEl.innerHTML = '<span class="bad">Invalid JSON payload</span>'
        resultEl.textContent = String(error)
        return
      }

      const res = await fetch('/v1/orchestrations/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      statusEl.innerHTML = '<span class="' + (res.ok && data.ok ? 'ok' : 'bad') + '">HTTP ' + res.status + ' | workflow ' + (data.ok ? 'succeeded' : 'partial/failed') + '</span>'
      resultEl.textContent = pretty(data)

      if (data && typeof data.runId === 'string') {
        selectedRunId = data.runId
      }

      await refreshRuns()
    }

    async function refreshRuns() {
      const params = new URLSearchParams({ limit: '20' })
      if (filterWorkflowEl.value.trim()) params.set('workflowId', filterWorkflowEl.value.trim())
      if (filterStatusEl.value.trim()) params.set('runStatus', filterStatusEl.value.trim())
      if (filterProviderEl.value.trim()) params.set('provider', filterProviderEl.value.trim())
      if (filterDateFromEl.value.trim()) params.set('dateFrom', filterDateFromEl.value.trim())
      if (filterDateToEl.value.trim()) params.set('dateTo', filterDateToEl.value.trim())

      const res = await fetch('/v1/orchestrations/runs?' + params.toString())
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(data.runs)) {
        runsListEl.innerHTML = '<div class="item">Failed to load run history.</div>'
        metricRunsEl.textContent = '0'
        metricDurationEl.textContent = '-'
        metricFallbackEl.textContent = '-'
        return
      }

      metricRunsEl.textContent = String(data.metrics?.runCount ?? data.runs.length)
      metricDurationEl.textContent = data.metrics?.avgRunDurationMs == null ? '-' : String(Math.round(data.metrics.avgRunDurationMs))
      metricFallbackEl.textContent = data.metrics?.avgFallbackDepth == null ? '-' : String(Number(data.metrics.avgFallbackDepth).toFixed(2))

      if (!selectedRunId && data.runs[0]) {
        selectedRunId = data.runs[0].runId
      }

      runsListEl.innerHTML = data.runs.map((r) => {
        const checked = selectedRunId === r.runId ? 'checked' : ''
        const cls = r.ok ? 'ok' : 'bad'
        return '<label class="item">' +
          '<input type="radio" name="run-select" value="' + r.runId + '" ' + checked + '/> ' +
          '<strong>' + r.runId + '</strong> | workflow: ' + r.workflowId + '<br/>' +
          '<span class="' + cls + '">' + String(r.runStatus || (r.ok ? 'completed' : 'failed')).toUpperCase() + '</span>' +
          ' | steps: ' + r.stepCount + ' | attempts: ' + r.attemptCount + '<br/>' +
          'created: ' + new Date(r.createdAt).toLocaleString() +
          '</label>'
      }).join('') || '<div class="item">No runs yet.</div>'

      runsListEl.querySelectorAll('input[name="run-select"]').forEach((el) => {
        el.addEventListener('change', (e) => {
          selectedRunId = e.target.value
        })
      })
    }

    async function loadSelectedTimeline() {
      if (!selectedRunId) {
        timelineEl.textContent = 'No run selected.'
        return
      }
      const res = await fetch('/v1/orchestrations/runs/' + encodeURIComponent(selectedRunId))
      const data = await res.json().catch(() => ({}))
      timelineEl.textContent = pretty(data)
    }

    document.getElementById('load-template').addEventListener('click', loadTemplate)
    document.getElementById('run').addEventListener('click', runWorkflow)
    document.getElementById('refresh-runs').addEventListener('click', refreshRuns)
    document.getElementById('apply-filters').addEventListener('click', refreshRuns)
    document.getElementById('load-selected').addEventListener('click', loadSelectedTimeline)

    loadTemplate()
    refreshRuns()
  </script>
</body>
</html>`

    return reply.type('text/html; charset=utf-8').send(html)
  })
}
