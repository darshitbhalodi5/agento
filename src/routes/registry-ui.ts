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
      --good: #16A34A;
      --bad: #DC2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      color: var(--text);
      background: linear-gradient(160deg, #f2f8ff 0%, #f8fafc 55%, #ecfdf5 100%);
    }
    .wrap { max-width: 1240px; margin: 20px auto; padding: 0 16px; }
    .hero {
      border-radius: 16px;
      background: linear-gradient(135deg, #0B1220 0%, #0E1E3A 45%, #19C2FF 100%);
      color: var(--white);
      padding: 20px;
      margin-bottom: 12px;
    }
    .hero h1 { margin: 0; font-size: 28px; }
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
    h3 { margin: 0 0 8px; color: var(--navy); font-size: 16px; }

    .field { margin-bottom: 8px; }
    .field label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 3px; }
    .field input, .field select {
      width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-size: 14px;
      font-family: inherit;
    }
    .row { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }

    button {
      border: 0; border-radius: 8px; padding: 9px 12px; cursor: pointer; font-weight: 600;
      background: var(--navy); color: var(--white);
    }
    button.alt { background: var(--cyan); color: #062130; }
    button.ghost { border: 1px solid var(--line); background: #fff; color: var(--navy); }

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
      cursor: pointer;
    }
    .item.active { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(25,194,255,.2); }
    .tag { display: inline-block; padding: 2px 7px; border: 1px solid var(--line); border-radius: 999px; margin-right: 5px; margin-top: 5px; font-size: 11px; }
    .kpi { margin-top: 6px; font-size: 12px; color: var(--muted); }
    .ok { color: var(--good); font-weight: 600; }
    .bad { color: var(--bad); font-weight: 600; }

    .details {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .detail-box {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      padding: 10px;
      min-height: 140px;
    }
    .detail-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 8px;
    }
    .detail-value {
      font-size: 13px;
      color: var(--text);
      word-break: break-word;
    }

    @media (max-width: 1080px) {
      .grid { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr 1fr; }
      .details { grid-template-columns: 1fr; }
    }
    @media (max-width: 680px) {
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Agento Registry + Catalog</h1>
      <p>Agent registration, service discovery, ranking, and provider detail panels for marketplace demos.</p>
      <a href="/v1/app" target="_blank" rel="noreferrer">Open Demo Console</a>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Register Agent</h2>
        <form id="agent-form">
          <div class="row">
            <div class="field"><label>Agent ID</label><input name="id" value="agent-weather-1" required /></div>
            <div class="field"><label>Name</label><input name="name" value="Weather Provider Agent" required /></div>
            <div class="field"><label>Version</label><input name="version" value="v1.0.0" /></div>
          </div>
          <div class="row">
            <div class="field"><label>Owner ID</label><input name="ownerId" value="team-agento" /></div>
            <div class="field"><label>Docs URL</label><input name="docsUrl" value="https://example.com/docs" /></div>
            <div class="field"><label>Website URL</label><input name="websiteUrl" value="https://example.com" /></div>
          </div>
          <div class="field"><label>Endpoint (optional)</label><input name="endpoint" value="http://localhost:3000/v1/internal/mock/execute" /></div>
          <div class="field"><label>Description</label><input name="description" value="Provider agent serving weather forecasts" /></div>
          <div class="field"><label>Capabilities (comma-separated)</label><input name="capabilities" value="weather-forecast,pay-per-call" /></div>
          <button type="submit">Save Agent</button>
        </form>
        <pre id="agent-out">No response yet.</pre>
      </article>

      <article class="card">
        <h2>Register Service</h2>
        <form id="service-form">
          <div class="row">
            <div class="field"><label>Service ID</label><input name="id" value="weather-api" required /></div>
            <div class="field"><label>Name</label><input name="name" value="Weather API" required /></div>
            <div class="field"><label>Price Atomic</label><input name="priceAtomic" value="1000" required /></div>
          </div>
          <div class="row">
            <div class="field"><label>Provider Wallet</label><input name="providerWallet" value="0x031891A61200FedDd622EbACC10734BC90093B2A" required /></div>
            <div class="field"><label>Token Address</label><input name="tokenAddress" value="0x20c0000000000000000000000000000000000001" required /></div>
            <div class="field"><label>Memo Prefix</label><input name="memoPrefix" value="api" required /></div>
          </div>
          <div class="field"><label>Tags (comma-separated)</label><input name="tags" value="weather,api,agent-service,capability:weather-forecast" /></div>
          <button type="submit" class="alt">Save Service</button>
        </form>
        <pre id="service-out">No response yet.</pre>
      </article>

      <article class="card">
        <h2>Service Catalog</h2>
        <form id="filter-form">
          <div class="row">
            <div class="field"><label>Tag</label><input name="tag" placeholder="weather" /></div>
            <div class="field"><label>Capability</label><input name="capability" placeholder="weather-forecast" /></div>
            <div class="field"><label>Active</label>
              <select name="active">
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div class="field"><label>Price Min</label><input name="price_min" placeholder="100" /></div>
            <div class="field"><label>Price Max</label><input name="price_max" placeholder="10000" /></div>
            <div class="field"><label>Sort</label>
              <select name="sort">
                <option value="rank_desc">Rank (desc)</option>
                <option value="created_desc">Newest</option>
                <option value="price_asc">Price (low-high)</option>
                <option value="price_desc">Price (high-low)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
          <button type="submit" class="ghost">Apply Filters</button>
          <button id="reset-filters" type="button" class="ghost">Reset</button>
          <button id="refresh-services" type="button" class="ghost">Refresh</button>
        </form>
        <div class="list" id="services-list"></div>
        <div class="meta">Service Catalog supports tag/capability/price filters and ranking-based sort.</div>
      </article>

      <article class="card">
        <h2>Agent Directory</h2>
        <button id="refresh-agents" type="button" class="ghost">Refresh Agents</button>
        <div class="list" id="agents-list"></div>
      </article>

      <article class="card" style="grid-column: 1 / -1;">
        <h2>Provider & Service Detail Panel</h2>
        <div class="details">
          <div class="detail-box" id="agent-detail"></div>
          <div class="detail-box" id="service-detail"></div>
        </div>
      </article>

      <article class="card" style="grid-column: 1 / -1;">
        <h2>Service Reputation</h2>
        <button id="refresh-reputation" type="button" class="ghost">Refresh Reputation</button>
        <div class="list" id="reputation-list"></div>
        <div class="meta">Computed from execution outcomes and latency on recorded runs.</div>
      </article>
    </section>
  </div>

  <script>
    const state = {
      agents: [],
      services: [],
      reputation: [],
      selectedAgentId: null,
      selectedServiceId: null,
    }

    function pretty(x) { try { return JSON.stringify(x, null, 2) } catch { return String(x) } }
    function esc(v) {
      return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }
    function listTags(tags) { return (tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>' }).join('') }

    async function postJson(url, body) {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(function () { return {} })
      return { ok: res.ok, status: res.status, data: data }
    }

    async function getJson(url) {
      const res = await fetch(url)
      const data = await res.json().catch(function () { return {} })
      return { ok: res.ok, status: res.status, data: data }
    }

    function buildServiceQueryFromFilters() {
      const fd = new FormData(document.getElementById('filter-form'))
      const params = new URLSearchParams()
      const keys = ['tag', 'capability', 'active', 'price_min', 'price_max', 'sort']
      keys.forEach(function (k) {
        const raw = String(fd.get(k) || '').trim()
        if (raw) params.set(k, raw)
      })
      const q = params.toString()
      return q ? ('/v1/registry/services?' + q) : '/v1/registry/services'
    }

    function renderAgentList() {
      const root = document.getElementById('agents-list')
      if (!Array.isArray(state.agents) || state.agents.length === 0) {
        root.innerHTML = '<div class="item">No agents found.</div>'
        return
      }
      root.innerHTML = state.agents.map(function (a) {
        const activeCls = a.id === state.selectedAgentId ? ' active' : ''
        const endpoint = a.endpoint ? ('<div class="kpi">' + esc(a.endpoint) + '</div>') : ''
        return '<div class="item' + activeCls + '" data-agent-id="' + esc(a.id) + '">' +
          '<strong>' + esc(a.name) + '</strong> (' + esc(a.id) + ')<br/>' +
          '<span class="kpi">Owner: ' + esc(a.ownerId || 'n/a') + ' | Active: ' + esc(a.active) + '</span>' +
          endpoint +
          '<div>' + listTags(a.capabilities) + '</div>' +
          '</div>'
      }).join('')

      root.querySelectorAll('[data-agent-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          state.selectedAgentId = el.getAttribute('data-agent-id')
          renderAgentList()
          renderAgentDetail()
        })
      })
    }

    function renderServiceList() {
      const root = document.getElementById('services-list')
      if (!Array.isArray(state.services) || state.services.length === 0) {
        root.innerHTML = '<div class="item">No services found for current filters.</div>'
        return
      }

      root.innerHTML = state.services.map(function (s) {
        const activeCls = s.id === state.selectedServiceId ? ' active' : ''
        const rep = state.reputation.find(function (r) { return r.serviceId === s.id })
        const success = rep ? rep.successRatePct + '%' : 'n/a'
        return '<div class="item' + activeCls + '" data-service-id="' + esc(s.id) + '">' +
          '<strong>' + esc(s.name) + '</strong> (' + esc(s.id) + ')<br/>' +
          '<span class="kpi">Price: ' + esc(s.priceAtomic) + ' | Rank: <span class="ok">' + esc(s.rankScore) + '</span> | Success: ' + esc(success) + '</span><br/>' +
          '<span class="kpi">Token: ' + esc(s.tokenAddress) + ' | Active: ' + esc(s.active) + '</span>' +
          '<div>' + listTags(s.tags) + '</div>' +
          '</div>'
      }).join('')

      root.querySelectorAll('[data-service-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          state.selectedServiceId = el.getAttribute('data-service-id')
          renderServiceList()
          renderServiceDetail()
        })
      })
    }

    function renderAgentDetail() {
      const root = document.getElementById('agent-detail')
      const a = state.agents.find(function (x) { return x.id === state.selectedAgentId })
      if (!a) {
        root.innerHTML = '<h3>Provider Agent</h3><div class="meta">Select an agent from Agent Directory.</div>'
        return
      }

      root.innerHTML =
        '<h3>Provider Agent</h3>' +
        '<div class="detail-label">Identity</div><div class="detail-value">' + esc(a.name) + ' (' + esc(a.id) + ')</div>' +
        '<div class="detail-label">Owner</div><div class="detail-value">' + esc(a.ownerId || 'n/a') + '</div>' +
        '<div class="detail-label">Version</div><div class="detail-value">' + esc(a.version || 'n/a') + '</div>' +
        '<div class="detail-label">Deprecated</div><div class="detail-value">' + esc(a.deprecated) + '</div>' +
        '<div class="detail-label">Docs</div><div class="detail-value">' + esc(a.docsUrl || 'n/a') + '</div>' +
        '<div class="detail-label">Website</div><div class="detail-value">' + esc(a.websiteUrl || 'n/a') + '</div>' +
        '<div class="detail-label">Capabilities</div><div class="detail-value">' + listTags(a.capabilities) + '</div>'
    }

    function renderServiceDetail() {
      const root = document.getElementById('service-detail')
      const s = state.services.find(function (x) { return x.id === state.selectedServiceId })
      if (!s) {
        root.innerHTML = '<h3>Service Detail</h3><div class="meta">Select a service from Service Catalog.</div>'
        return
      }

      const rep = state.reputation.find(function (r) { return r.serviceId === s.id })
      const successRate = rep ? rep.successRatePct + '%' : 'n/a'
      const failRate = rep ? rep.failureRatePct + '%' : 'n/a'
      const latency = s.medianLatencyMs === null ? 'n/a' : (s.medianLatencyMs + ' ms')

      root.innerHTML =
        '<h3>Service Detail</h3>' +
        '<div class="detail-label">Service</div><div class="detail-value">' + esc(s.name) + ' (' + esc(s.id) + ')</div>' +
        '<div class="detail-label">Pricing</div><div class="detail-value">' + esc(s.priceAtomic) + ' atomic</div>' +
        '<div class="detail-label">Token / Provider Wallet</div><div class="detail-value">' + esc(s.tokenAddress) + '<br/>' + esc(s.providerWallet) + '</div>' +
        '<div class="detail-label">Rank Score</div><div class="detail-value"><span class="ok">' + esc(s.rankScore) + '</span>' +
          ' | SuccessScore ' + esc(s.rankBreakdown ? s.rankBreakdown.successScore : 'n/a') +
          ' | LatencyScore ' + esc(s.rankBreakdown ? s.rankBreakdown.latencyScore : 'n/a') +
          ' | PriceScore ' + esc(s.rankBreakdown ? s.rankBreakdown.priceScore : 'n/a') +
          '</div>' +
        '<div class="detail-label">Performance</div><div class="detail-value">Runs: ' + esc(s.totalRuns) +
          ' | Success runs: ' + esc(s.successRuns) + ' | Median latency: ' + esc(latency) + '</div>' +
        '<div class="detail-label">Reputation (derived)</div><div class="detail-value"><span class="ok">Success ' + esc(successRate) + '</span> | <span class="bad">Fail ' + esc(failRate) + '</span></div>' +
        '<div class="detail-label">Tags</div><div class="detail-value">' + listTags(s.tags) + '</div>'
    }

    async function refreshAgents() {
      const out = await getJson('/v1/registry/agents')
      if (!out.ok || !Array.isArray(out.data.agents)) {
        document.getElementById('agents-list').innerHTML = '<div class="item">Failed to load agents</div>'
        return
      }
      state.agents = out.data.agents
      if (!state.selectedAgentId && state.agents.length > 0) state.selectedAgentId = state.agents[0].id
      renderAgentList()
      renderAgentDetail()
    }

    async function refreshServices() {
      const url = buildServiceQueryFromFilters()
      const out = await getJson(url)
      if (!out.ok || !Array.isArray(out.data.services)) {
        document.getElementById('services-list').innerHTML = '<div class="item">Failed to load services</div>'
        return
      }
      state.services = out.data.services
      if (!state.selectedServiceId && state.services.length > 0) state.selectedServiceId = state.services[0].id
      if (state.selectedServiceId && !state.services.find(function (s) { return s.id === state.selectedServiceId })) {
        state.selectedServiceId = state.services.length > 0 ? state.services[0].id : null
      }
      renderServiceList()
      renderServiceDetail()
    }

    async function refreshReputation() {
      const out = await getJson('/v1/reputation/services')
      const root = document.getElementById('reputation-list')
      if (!out.ok || !Array.isArray(out.data.reputation)) {
        root.innerHTML = '<div class="item">Failed to load reputation data</div>'
        return
      }
      state.reputation = out.data.reputation
      root.innerHTML = state.reputation.map(function (r) {
        const latency = r.medianLatencyMs === null ? 'n/a' : r.medianLatencyMs + ' ms'
        const lastRun = r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : 'n/a'
        return '<div class="item"><strong>' + esc(r.serviceName) + '</strong> (' + esc(r.serviceId) + ')<br/>' +
          '<span class="kpi">Runs: ' + esc(r.totalRuns) + ' | <span class="ok">Success ' + esc(r.successRatePct) + '%</span> | <span class="bad">Fail ' + esc(r.failureRatePct) + '%</span></span><br/>' +
          '<span class="kpi">Median latency: ' + esc(latency) + ' | Last run: ' + esc(lastRun) + '</span></div>'
      }).join('') || '<div class="item">No reputation rows yet.</div>'
      renderServiceList()
      renderServiceDetail()
    }

    document.getElementById('agent-form').addEventListener('submit', async function (e) {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = {
        id: String(fd.get('id') || ''),
        name: String(fd.get('name') || ''),
        endpoint: String(fd.get('endpoint') || '') || undefined,
        ownerId: String(fd.get('ownerId') || '') || undefined,
        description: String(fd.get('description') || '') || undefined,
        docsUrl: String(fd.get('docsUrl') || '') || undefined,
        websiteUrl: String(fd.get('websiteUrl') || '') || undefined,
        version: String(fd.get('version') || '') || undefined,
        deprecated: false,
        active: true,
        capabilities: String(fd.get('capabilities') || '').split(',').map(function (s) { return s.trim() }).filter(Boolean),
      }
      const out = await postJson('/v1/registry/agents', payload)
      document.getElementById('agent-out').textContent = pretty(out.data)
      if (out.ok) refreshAgents()
    })

    document.getElementById('service-form').addEventListener('submit', async function (e) {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = {
        id: String(fd.get('id') || ''),
        name: String(fd.get('name') || ''),
        providerWallet: String(fd.get('providerWallet') || ''),
        tokenAddress: String(fd.get('tokenAddress') || ''),
        priceAtomic: String(fd.get('priceAtomic') || ''),
        memoPrefix: String(fd.get('memoPrefix') || 'api'),
        active: true,
        tags: String(fd.get('tags') || '').split(',').map(function (s) { return s.trim() }).filter(Boolean),
      }
      const out = await postJson('/v1/registry/services', payload)
      document.getElementById('service-out').textContent = pretty(out.data)
      if (out.ok) refreshServices()
    })

    document.getElementById('filter-form').addEventListener('submit', function (e) {
      e.preventDefault()
      refreshServices()
    })

    document.getElementById('reset-filters').addEventListener('click', function () {
      document.getElementById('filter-form').reset()
      const sortEl = document.querySelector('select[name="sort"]')
      if (sortEl) sortEl.value = 'rank_desc'
      refreshServices()
    })

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
