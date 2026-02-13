import type { FastifyPluginAsync } from 'fastify'

export const registryUiRoutes: FastifyPluginAsync = async (app) => {
  app.get('/registry', async (_request, reply) => {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agento Registry</title>
  <style>
    :root {
      --navy: #0B1220;
      --cyan: #19C2FF;
      --mint: #19D3A2;
      --surface: #F8FAFC;
      --white: #fff;
      --line: #E2E8F0;
      --text: #334155;
      --muted: #64748B;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      color: var(--text);
      background: linear-gradient(160deg, #f2f8ff 0%, #f8fafc 55%, #ecfdf5 100%);
    }
    .wrap { max-width: 1150px; margin: 20px auto; padding: 0 16px; }
    .hero {
      border-radius: 16px;
      background: linear-gradient(135deg, #0B1220 0%, #0E1E3A 45%, #19C2FF 100%);
      color: var(--white);
      padding: 20px;
      margin-bottom: 12px;
    }
    .hero h1 { margin: 0; font-size: 27px; }
    .hero p { margin: 6px 0 0; opacity: .9; }
    .hero a {
      color: #fff;
      border: 1px solid rgba(255,255,255,.4);
      border-radius: 999px;
      display: inline-block;
      margin-top: 10px;
      padding: 7px 10px;
      text-decoration: none;
      font-size: 13px;
    }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .card {
      background: var(--white);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
    }
    h2 { margin: 0 0 10px; color: var(--navy); font-size: 18px; }
    .field { margin-bottom: 8px; }
    .field label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 3px; }
    .field input {
      width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-size: 14px;
    }
    button {
      border: 0; border-radius: 8px; padding: 9px 12px; cursor: pointer; font-weight: 600;
      background: var(--navy); color: var(--white);
    }
    button.alt { background: var(--cyan); color: #062130; }
    .meta { color: var(--muted); font-size: 12px; margin-top: 8px; }
    pre {
      margin-top: 8px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      padding: 8px;
      font-size: 12px;
      overflow: auto;
      max-height: 250px;
      white-space: pre-wrap;
      font-family: "IBM Plex Mono", monospace;
    }
    .list { margin-top: 8px; display: grid; gap: 8px; }
    .item {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      font-size: 13px;
    }
    .tag { display: inline-block; padding: 2px 7px; border: 1px solid var(--line); border-radius: 999px; margin-right: 5px; margin-top: 5px; font-size: 11px; }
    .kpi { margin-top: 6px; font-size: 12px; color: var(--muted); }
    .ok { color: #16A34A; font-weight: 600; }
    .bad { color: #DC2626; font-weight: 600; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Agento Registry + Catalog</h1>
      <p>Register agents and services, then discover capabilities for agent-to-agent commerce.</p>
      <a href="/v1/app" target="_blank" rel="noreferrer">Open Demo Console</a>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Register Agent</h2>
        <form id="agent-form">
          <div class="field"><label>Agent ID</label><input name="id" value="agent-weather-1" required /></div>
          <div class="field"><label>Name</label><input name="name" value="Weather Provider Agent" required /></div>
          <div class="field"><label>Endpoint (optional)</label><input name="endpoint" value="http://localhost:3000/v1/internal/mock/execute" /></div>
          <div class="field"><label>Capabilities (comma-separated)</label><input name="capabilities" value="weather-forecast,pay-per-call" /></div>
          <button type="submit">Save Agent</button>
        </form>
        <pre id="agent-out">No response yet.</pre>
      </article>

      <article class="card">
        <h2>Register Service</h2>
        <form id="service-form">
          <div class="field"><label>Service ID</label><input name="id" value="weather-api" required /></div>
          <div class="field"><label>Name</label><input name="name" value="Weather API" required /></div>
          <div class="field"><label>Provider Wallet</label><input name="providerWallet" value="0x031891A61200FedDd622EbACC10734BC90093B2A" required /></div>
          <div class="field"><label>Token Address</label><input name="tokenAddress" value="0x20c0000000000000000000000000000000000001" required /></div>
          <div class="field"><label>Price Atomic</label><input name="priceAtomic" value="1000" required /></div>
          <div class="field"><label>Tags (comma-separated)</label><input name="tags" value="weather,api,agent-service" /></div>
          <button type="submit" class="alt">Save Service</button>
        </form>
        <pre id="service-out">No response yet.</pre>
      </article>

      <article class="card">
        <h2>Agent Directory</h2>
        <button id="refresh-agents" type="button">Refresh Agents</button>
        <div class="list" id="agents-list"></div>
      </article>

      <article class="card">
        <h2>Service Catalog</h2>
        <button id="refresh-services" type="button">Refresh Services</button>
        <div class="list" id="services-list"></div>
        <div class="meta">Catalog includes price/status/tags for discovery and matching.</div>
      </article>

      <article class="card">
        <h2>Service Reputation</h2>
        <button id="refresh-reputation" type="button">Refresh Reputation</button>
        <div class="list" id="reputation-list"></div>
        <div class="meta">Computed from execution outcomes and latency on recorded runs.</div>
      </article>
    </section>
  </div>

  <script>
    function pretty(x) { try { return JSON.stringify(x, null, 2) } catch { return String(x) } }
    function listTags(tags) { return (tags || []).map(t => '<span class="tag">' + t + '</span>').join('') }

    async function postJson(url, body) {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, data }
    }

    async function getJson(url) {
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      return { ok: res.ok, status: res.status, data }
    }

    document.getElementById('agent-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = {
        id: String(fd.get('id') || ''),
        name: String(fd.get('name') || ''),
        endpoint: String(fd.get('endpoint') || '') || undefined,
        active: true,
        capabilities: String(fd.get('capabilities') || '').split(',').map(s => s.trim()).filter(Boolean),
      }
      const out = await postJson('/v1/registry/agents', payload)
      document.getElementById('agent-out').textContent = pretty(out.data)
      if (out.ok) refreshAgents()
    })

    document.getElementById('service-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = {
        id: String(fd.get('id') || ''),
        name: String(fd.get('name') || ''),
        providerWallet: String(fd.get('providerWallet') || ''),
        tokenAddress: String(fd.get('tokenAddress') || ''),
        priceAtomic: String(fd.get('priceAtomic') || ''),
        memoPrefix: 'api',
        active: true,
        tags: String(fd.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean),
      }
      const out = await postJson('/v1/registry/services', payload)
      document.getElementById('service-out').textContent = pretty(out.data)
      if (out.ok) refreshServices()
    })

    async function refreshAgents() {
      const out = await getJson('/v1/registry/agents')
      const root = document.getElementById('agents-list')
      if (!out.ok || !Array.isArray(out.data.agents)) {
        root.innerHTML = '<div class="item">Failed to load agents</div>'
        return
      }
      root.innerHTML = out.data.agents.map((a) =>
        '<div class="item"><strong>' + a.name + '</strong> (' + a.id + ')<br/>Active: ' + a.active + '<br/>' + listTags(a.capabilities) + '</div>'
      ).join('') || '<div class="item">No agents found.</div>'
    }

    async function refreshServices() {
      const out = await getJson('/v1/registry/services')
      const root = document.getElementById('services-list')
      if (!out.ok || !Array.isArray(out.data.services)) {
        root.innerHTML = '<div class="item">Failed to load services</div>'
        return
      }
      root.innerHTML = out.data.services.map((s) =>
        '<div class="item"><strong>' + s.name + '</strong> (' + s.id + ')<br/>Price: ' + s.priceAtomic + ' | Active: ' + s.active + '<br/>Token: ' + s.tokenAddress + '<br/>' + listTags(s.tags) + '</div>'
      ).join('') || '<div class="item">No services found.</div>'
    }

    async function refreshReputation() {
      const out = await getJson('/v1/reputation/services')
      const root = document.getElementById('reputation-list')
      if (!out.ok || !Array.isArray(out.data.reputation)) {
        root.innerHTML = '<div class="item">Failed to load reputation data</div>'
        return
      }
      root.innerHTML = out.data.reputation.map((r) => {
        const latency = r.medianLatencyMs === null ? 'n/a' : r.medianLatencyMs + ' ms'
        const lastRun = r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : 'n/a'
        return '<div class="item"><strong>' + r.serviceName + '</strong> (' + r.serviceId + ')<br/>' +
          '<span class="kpi">Runs: ' + r.totalRuns + ' | <span class="ok">Success ' + r.successRatePct + '%</span> | <span class="bad">Fail ' + r.failureRatePct + '%</span></span><br/>' +
          '<span class="kpi">Median latency: ' + latency + ' | Last run: ' + lastRun + '</span></div>'
      }).join('') || '<div class="item">No reputation rows yet.</div>'
    }

    document.getElementById('refresh-agents').addEventListener('click', refreshAgents)
    document.getElementById('refresh-services').addEventListener('click', refreshServices)
    document.getElementById('refresh-reputation').addEventListener('click', refreshReputation)

    refreshAgents()
    refreshServices()
    refreshReputation()
  </script>
</body>
</html>`

    return reply.type('text/html; charset=utf-8').send(html)
  })
}
