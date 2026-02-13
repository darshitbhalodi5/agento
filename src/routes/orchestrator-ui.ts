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
      <textarea id="payload"></textarea>
      <div class="actions">
        <button id="load-template" type="button">Load Template</button>
        <button id="run" type="button" class="alt">Run Workflow</button>
      </div>
      <div id="status" class="status">Template not loaded.</div>
      <pre id="result" class="result">No run yet.</pre>
    </section>
  </div>

  <script>
    const payloadEl = document.getElementById('payload')
    const resultEl = document.getElementById('result')
    const statusEl = document.getElementById('status')

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
    }

    document.getElementById('load-template').addEventListener('click', loadTemplate)
    document.getElementById('run').addEventListener('click', runWorkflow)

    loadTemplate()
  </script>
</body>
</html>`

    return reply.type('text/html; charset=utf-8').send(html)
  })
}
