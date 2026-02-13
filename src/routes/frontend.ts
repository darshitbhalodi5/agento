import type { FastifyPluginAsync } from 'fastify'

export const frontendRoutes: FastifyPluginAsync = async (app) => {
  app.get('/app', async (_request, reply) => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agento Demo App</title>
  <style>
    :root {
      --agento-navy: #0B1220;
      --agento-cyan: #19C2FF;
      --agento-mint: #19D3A2;
      --agento-surface: #F8FAFC;
      --agento-white: #FFFFFF;
      --agento-slate-700: #334155;
      --agento-slate-500: #64748B;
      --agento-slate-200: #E2E8F0;
      --agento-error: #DC2626;
      --agento-success: #16A34A;
      --agento-warning: #D97706;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--agento-slate-700);
      font-family: "IBM Plex Sans", system-ui, -apple-system, Segoe UI, sans-serif;
      background: linear-gradient(160deg, #f2f8ff 0%, #f8fafc 55%, #ecfdf5 100%);
    }
    .wrap {
      max-width: 1150px;
      margin: 20px auto;
      padding: 0 16px;
    }
    .hero {
      border-radius: 16px;
      background: linear-gradient(135deg, #0B1220 0%, #0E1E3A 45%, #19C2FF 100%);
      color: var(--agento-white);
      padding: 22px;
      margin-bottom: 12px;
    }
    .hero h1 { margin: 0; font-size: 28px; }
    .hero p { margin: 8px 0 0; opacity: .93; }
    .hero .links { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
    .hero a {
      color: var(--agento-white);
      text-decoration: none;
      border: 1px solid rgba(255, 255, 255, .4);
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
    }

    .guide {
      border: 1px solid var(--agento-slate-200);
      background: #fff;
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .guide h2 {
      margin: 0 0 10px;
      font-size: 17px;
      color: var(--agento-navy);
    }
    .guide-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .guide button {
      border: 1px solid var(--agento-slate-200);
      border-radius: 9px;
      background: #fff;
      color: var(--agento-navy);
      padding: 8px 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    .guide button.primary {
      background: var(--agento-navy);
      color: #fff;
      border-color: var(--agento-navy);
    }
    .guide button.warn {
      background: #fff7ed;
      border-color: #fed7aa;
      color: var(--agento-warning);
    }
    .guide .note {
      font-size: 12px;
      color: var(--agento-slate-500);
    }

    .layout {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .panel {
      border: 1px solid var(--agento-slate-200);
      background: var(--agento-white);
      border-radius: 14px;
      padding: 14px;
    }
    .panel h2 {
      margin: 0 0 10px;
      font-size: 18px;
      color: var(--agento-navy);
    }
    .field { margin-bottom: 10px; }
    .field label {
      display: block;
      font-size: 12px;
      color: var(--agento-slate-500);
      margin-bottom: 4px;
    }
    .field input, .field textarea {
      width: 100%;
      border: 1px solid var(--agento-slate-200);
      border-radius: 10px;
      padding: 10px;
      font-size: 14px;
      font-family: inherit;
      color: var(--agento-slate-700);
      background: #fff;
    }
    .field textarea { min-height: 88px; resize: vertical; font-family: "IBM Plex Mono", monospace; }
    button.main {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--agento-white);
      background: var(--agento-navy);
      cursor: pointer;
      font-weight: 600;
    }
    button.alt { background: var(--agento-cyan); color: #062130; }
    .result {
      margin-top: 10px;
      border: 1px solid var(--agento-slate-200);
      border-radius: 10px;
      background: #f8fafc;
      padding: 10px;
      overflow: auto;
      max-height: 240px;
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .row {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .tips {
      margin-top: 12px;
      color: var(--agento-slate-500);
      font-size: 12px;
      line-height: 1.5;
    }
    .status-ok { color: var(--agento-success); font-weight: 600; }
    .status-error { color: var(--agento-error); font-weight: 600; }
    @media (max-width: 920px) {
      .layout { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Agento Demo Console</h1>
      <p>Run quote, execute, and request-status flows without curl. Use dashboard for proof telemetry.</p>
      <div class="links">
        <a href="/v1/dashboard" target="_blank" rel="noreferrer">Open Telemetry Dashboard</a>
        <a href="/v1/health" target="_blank" rel="noreferrer">Health Check JSON</a>
      </div>
    </section>

    <section class="guide">
      <h2>Guided Demo Mode</h2>
      <div class="guide-row">
        <button id="preset-happy" type="button" class="primary">Preset: Happy Path Inputs</button>
        <button id="preset-error" type="button" class="warn">Preset: Error Path Inputs</button>
        <button id="run-quote" type="button">Run Quote</button>
        <button id="run-status" type="button">Run Status Lookup</button>
      </div>
      <div class="note">
        Happy path requires a real Tempo transaction hash with memo hash <code>keccak256(api:v1:{serviceId}:{requestId})</code>.
      </div>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>1) Get Quote</h2>
        <form id="quote-form">
          <div class="row">
            <div class="field">
              <label for="quote-service">Service ID</label>
              <input id="quote-service" name="serviceId" value="weather-api" required />
            </div>
            <div class="field">
              <label for="quote-endpoint">Endpoint</label>
              <input id="quote-endpoint" name="endpoint" value="/forecast/7d" required />
            </div>
          </div>
          <button type="submit" class="main">Request Quote</button>
        </form>
        <div id="quote-status" class="tips"></div>
        <pre id="quote-result" class="result">No quote yet.</pre>
      </article>

      <article class="panel">
        <h2>2) Execute Paid Request</h2>
        <form id="execute-form">
          <div class="row">
            <div class="field">
              <label for="exec-service">Service ID</label>
              <input id="exec-service" name="serviceId" value="weather-api" required />
            </div>
            <div class="field">
              <label for="exec-request">Request ID</label>
              <input id="exec-request" name="requestId" value="req_demo_001" required />
            </div>
          </div>
          <div class="field">
            <label for="exec-tx">Payment Tx Hash (Tempo)</label>
            <input id="exec-tx" name="paymentTxHash" value="0x1111111111111111111111111111111111111111111111111111111111111111" required />
          </div>
          <div class="field">
            <label for="exec-payload">Payload JSON</label>
            <textarea id="exec-payload" name="payload">{"location":"NYC"}</textarea>
          </div>
          <button type="submit" class="main alt">Verify + Execute</button>
        </form>
        <div id="execute-status" class="tips"></div>
        <pre id="execute-result" class="result">No execution yet.</pre>
      </article>

      <article class="panel">
        <h2>3) Request Status</h2>
        <form id="status-form">
          <div class="row">
            <div class="field">
              <label for="status-service">Service ID</label>
              <input id="status-service" name="serviceId" value="weather-api" required />
            </div>
            <div class="field">
              <label for="status-request">Request ID</label>
              <input id="status-request" name="requestId" value="req_demo_001" required />
            </div>
          </div>
          <button type="submit" class="main">Fetch Status</button>
        </form>
        <div id="status-status" class="tips"></div>
        <pre id="status-result" class="result">No status fetched.</pre>
      </article>

      <article class="panel">
        <h2>Pitch Notes</h2>
        <div class="tips">
          <div>1. Show Quote response and payment instructions.</div>
          <div>2. Show Execute response (valid or controlled failure).</div>
          <div>3. Show audit state from Request Status.</div>
          <div>4. Open Dashboard for system-level proof.</div>
        </div>
      </article>
    </section>
  </div>

  <script>
    function pretty(obj) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch (_) {
        return String(obj)
      }
    }

    async function postJson(url, payload) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, data }
    }

    function setStatus(el, ok, text) {
      el.innerHTML = '<span class="' + (ok ? 'status-ok' : 'status-error') + '">' + text + '</span>'
    }

    const quoteForm = document.getElementById('quote-form')
    const quoteResult = document.getElementById('quote-result')
    const quoteStatus = document.getElementById('quote-status')

    const executeForm = document.getElementById('execute-form')
    const executeResult = document.getElementById('execute-result')
    const executeStatus = document.getElementById('execute-status')

    const statusForm = document.getElementById('status-form')
    const statusResult = document.getElementById('status-result')
    const statusStatus = document.getElementById('status-status')

    function fillHappyPreset() {
      const requestId = 'req_demo_happy_' + Date.now()
      document.getElementById('quote-service').value = 'weather-api'
      document.getElementById('quote-endpoint').value = '/forecast/7d'
      document.getElementById('exec-service').value = 'weather-api'
      document.getElementById('exec-request').value = requestId
      document.getElementById('exec-tx').value = '0xREPLACE_WITH_REAL_TEMPO_TX_HASH'
      document.getElementById('exec-payload').value = JSON.stringify({ location: 'NYC' })
      document.getElementById('status-service').value = 'weather-api'
      document.getElementById('status-request').value = requestId
    }

    function fillErrorPreset() {
      const requestId = 'req_demo_error_' + Date.now()
      document.getElementById('quote-service').value = 'weather-api'
      document.getElementById('quote-endpoint').value = '/forecast/7d'
      document.getElementById('exec-service').value = 'weather-api'
      document.getElementById('exec-request').value = requestId
      document.getElementById('exec-tx').value = '0x1111111111111111111111111111111111111111111111111111111111111111'
      document.getElementById('exec-payload').value = JSON.stringify({ location: 'Nowhere' })
      document.getElementById('status-service').value = 'weather-api'
      document.getElementById('status-request').value = requestId
    }

    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(quoteForm)
      const payload = {
        serviceId: String(fd.get('serviceId') || ''),
        endpoint: String(fd.get('endpoint') || ''),
      }
      const out = await postJson('/v1/payments/quote', payload)
      setStatus(quoteStatus, out.ok, 'HTTP ' + out.status)
      quoteResult.textContent = pretty(out.data)
    })

    executeForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(executeForm)
      let parsedPayload = {}
      try {
        parsedPayload = JSON.parse(String(fd.get('payload') || '{}'))
      } catch (err) {
        setStatus(executeStatus, false, 'Invalid payload JSON')
        executeResult.textContent = String(err)
        return
      }

      const payload = {
        serviceId: String(fd.get('serviceId') || ''),
        requestId: String(fd.get('requestId') || ''),
        paymentTxHash: String(fd.get('paymentTxHash') || ''),
        payload: parsedPayload,
      }

      const out = await postJson('/v1/payments/execute', payload)
      setStatus(executeStatus, out.ok, 'HTTP ' + out.status)
      executeResult.textContent = pretty(out.data)

      document.getElementById('status-request').value = payload.requestId
      document.getElementById('status-service').value = payload.serviceId
    })

    statusForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(statusForm)
      const requestId = String(fd.get('requestId') || '')
      const serviceId = String(fd.get('serviceId') || '')
      const url = '/v1/requests/' + encodeURIComponent(requestId) + '?serviceId=' + encodeURIComponent(serviceId)

      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      setStatus(statusStatus, res.ok, 'HTTP ' + res.status)
      statusResult.textContent = pretty(data)
    })

    document.getElementById('preset-happy').addEventListener('click', fillHappyPreset)
    document.getElementById('preset-error').addEventListener('click', fillErrorPreset)
    document.getElementById('run-quote').addEventListener('click', () => quoteForm.requestSubmit())
    document.getElementById('run-status').addEventListener('click', () => statusForm.requestSubmit())

    fillErrorPreset()
  </script>
</body>
</html>`

    return reply.type('text/html; charset=utf-8').send(html)
  })
}
