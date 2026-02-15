'use client'

import { useState } from 'react'
import { apiGet, apiPost } from '../../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../../lib/session-store'
import { registryDemoDefaults } from '../../lib/demo-presets'

interface RegistryAgent {
  id: string
  name: string
  endpoint?: string | null
  capabilities?: string[]
  ownerId?: string | null
  description?: string | null
  docsUrl?: string | null
  websiteUrl?: string | null
  version?: string | null
  deprecated?: boolean
  active?: boolean
}

interface RegistryService {
  id: string
  name: string
  priceAtomic: string
  active: boolean
  tags?: string[]
  rankScore?: number
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function parseCsv(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function RegistryConsole() {
  const { session, setUserRole } = useSessionStore()
  const headers = buildAuthHeaders(session)

  const [agentForm, setAgentForm] = useState({
    id: 'agent-demo',
    name: 'Agent Demo',
    endpoint: '',
    capabilities: 'weather-forecast,pay-per-call',
    ownerId: 'team-agento',
    description: 'Demo provider agent',
    docsUrl: '',
    websiteUrl: '',
    version: 'v1.0.0',
    deprecated: false,
    active: true,
  })

  const [serviceForm, setServiceForm] = useState({
    id: 'weather-api',
    name: 'Weather API',
    providerWallet: '0x031891A61200FedDd622EbACC10734BC90093B2A',
    tokenAddress: '0x20c0000000000000000000000000000000000001',
    priceAtomic: '1000',
    memoPrefix: 'api',
    tags: 'weather,api,capability:weather-forecast',
    active: true,
  })

  const [filters, setFilters] = useState({
    tag: '',
    capability: '',
    active: '',
    price_min: '',
    price_max: '',
    sort: 'rank_desc',
  })

  const [agents, setAgents] = useState<RegistryAgent[]>([])
  const [services, setServices] = useState<RegistryService[]>([])
  const [agentOut, setAgentOut] = useState('No agent write yet.')
  const [serviceOut, setServiceOut] = useState('No service write yet.')
  const [queryOut, setQueryOut] = useState('No registry query yet.')

  function applyWritePreset() {
    setUserRole(registryDemoDefaults.writeRole)
    setAgentForm((prev) => ({
      ...prev,
      id: `agent_demo_${Date.now()}`,
      name: 'Agent Demo Provider',
      capabilities: 'weather-forecast,pay-per-call',
    }))
    setServiceForm((prev) => ({
      ...prev,
      id: `weather-api-${Date.now()}`,
      name: 'Weather API Demo',
      priceAtomic: '1000',
      tags: 'weather,api,capability:weather-forecast',
    }))
  }

  function applyDiscoveryPreset() {
    setFilters({
      tag: 'weather',
      capability: 'weather-forecast',
      active: 'true',
      price_min: '',
      price_max: '',
      sort: 'rank_desc',
    })
  }

  async function createAgent() {
    const providerOwnerId = session.ownerId.trim()
    const payloadOwnerId =
      session.userRole === 'provider'
        ? providerOwnerId || undefined
        : agentForm.ownerId || undefined

    const result = await apiPost(
      '/v1/registry/agents',
      {
        id: agentForm.id,
        name: agentForm.name,
        endpoint: agentForm.endpoint || undefined,
        capabilities: parseCsv(agentForm.capabilities),
        ownerId: payloadOwnerId,
        description: agentForm.description || undefined,
        docsUrl: agentForm.docsUrl || undefined,
        websiteUrl: agentForm.websiteUrl || undefined,
        version: agentForm.version || undefined,
        deprecated: agentForm.deprecated,
        active: agentForm.active,
      },
      {
        baseUrl: session.apiBaseUrl,
        headers,
      },
    )
    setAgentOut(pretty(result.ok ? result.data : result))
  }

  async function createService() {
    const result = await apiPost(
      '/v1/registry/services',
      {
        id: serviceForm.id,
        name: serviceForm.name,
        providerWallet: serviceForm.providerWallet,
        tokenAddress: serviceForm.tokenAddress,
        priceAtomic: serviceForm.priceAtomic,
        memoPrefix: serviceForm.memoPrefix,
        tags: parseCsv(serviceForm.tags),
        active: serviceForm.active,
      },
      {
        baseUrl: session.apiBaseUrl,
        headers,
      },
    )
    setServiceOut(pretty(result.ok ? result.data : result))
  }

  async function loadAgents() {
    const result = await apiGet<{ agents?: RegistryAgent[] }>('/v1/registry/agents', {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setQueryOut(pretty(result.ok ? result.data : result))
    if (result.ok && Array.isArray(result.data.agents)) {
      setAgents(result.data.agents)
    }
  }

  async function loadServices() {
    const params = new URLSearchParams()
    if (filters.tag) params.set('tag', filters.tag)
    if (filters.capability) params.set('capability', filters.capability)
    if (filters.active) params.set('active', filters.active)
    if (filters.price_min) params.set('price_min', filters.price_min)
    if (filters.price_max) params.set('price_max', filters.price_max)
    if (filters.sort) params.set('sort', filters.sort)

    const path = params.size > 0 ? `/v1/registry/services?${params.toString()}` : '/v1/registry/services'
    const result = await apiGet<{ services?: RegistryService[] }>(path, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setQueryOut(pretty(result.ok ? result.data : result))
    if (result.ok && Array.isArray(result.data.services)) {
      setServices(result.data.services)
    }
  }

  return (
    <section className="card">
      <h2>Registry Console</h2>
      <p className="subtitle">
        Write endpoints require role headers. Use <code>provider</code> or <code>admin</code> in session controls.
      </p>
      <div className="actions-row">
        <button type="button" className="btn" onClick={applyWritePreset}>
          Preset: Provider Write Demo
        </button>
        <button type="button" className="btn" onClick={applyDiscoveryPreset}>
          Preset: Discovery Demo
        </button>
      </div>

      <div className="registry-grid">
        <article className="panel">
          <h3>Register Agent</h3>
          <div className="form-grid">
            <label>
              Agent ID
              <input value={agentForm.id} onChange={(event) => setAgentForm((prev) => ({ ...prev, id: event.target.value }))} />
            </label>
            <label>
              Name
              <input
                value={agentForm.name}
                onChange={(event) => setAgentForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Capabilities (comma separated)
              <input
                value={agentForm.capabilities}
                onChange={(event) => setAgentForm((prev) => ({ ...prev, capabilities: event.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={createAgent}>
            POST /v1/registry/agents
          </button>
          <pre className="result">{agentOut}</pre>
        </article>

        <article className="panel">
          <h3>Register Service</h3>
          <div className="form-grid">
            <label>
              Service ID
              <input
                value={serviceForm.id}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, id: event.target.value }))}
              />
            </label>
            <label>
              Name
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label>
              Price Atomic
              <input
                value={serviceForm.priceAtomic}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, priceAtomic: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Provider Wallet
              <input
                value={serviceForm.providerWallet}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, providerWallet: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Token Address
              <input
                value={serviceForm.tokenAddress}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, tokenAddress: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Tags (comma separated)
              <input
                value={serviceForm.tags}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </label>
          </div>
          <button type="button" className="btn" onClick={createService}>
            POST /v1/registry/services
          </button>
          <pre className="result">{serviceOut}</pre>
        </article>

        <article className="panel">
          <h3>Service Discovery</h3>
          <div className="form-grid">
            <label>
              Tag
              <input value={filters.tag} onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))} />
            </label>
            <label>
              Capability
              <input
                value={filters.capability}
                onChange={(event) => setFilters((prev) => ({ ...prev, capability: event.target.value }))}
              />
            </label>
            <label>
              Active
              <select
                value={filters.active}
                onChange={(event) => setFilters((prev) => ({ ...prev, active: event.target.value }))}
              >
                <option value="">any</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              Price Min
              <input
                value={filters.price_min}
                onChange={(event) => setFilters((prev) => ({ ...prev, price_min: event.target.value }))}
              />
            </label>
            <label>
              Price Max
              <input
                value={filters.price_max}
                onChange={(event) => setFilters((prev) => ({ ...prev, price_max: event.target.value }))}
              />
            </label>
            <label>
              Sort
              <select value={filters.sort} onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}>
                <option value="rank_desc">rank_desc</option>
                <option value="created_desc">created_desc</option>
                <option value="price_asc">price_asc</option>
                <option value="price_desc">price_desc</option>
                <option value="name_asc">name_asc</option>
                <option value="name_desc">name_desc</option>
              </select>
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={loadServices}>
              GET /v1/registry/services
            </button>
            <button type="button" className="btn" onClick={loadAgents}>
              GET /v1/registry/agents
            </button>
          </div>
          <pre className="result">{queryOut}</pre>
        </article>
      </div>

      <div className="registry-lists">
        <section className="panel">
          <h3>Agents ({agents.length})</h3>
          <div className="list">
            {agents.map((agent) => (
              <div key={agent.id} className="item">
                <strong>{agent.name}</strong> <code>{agent.id}</code>
              </div>
            ))}
            {agents.length === 0 ? <div className="item">No agents loaded.</div> : null}
          </div>
        </section>

        <section className="panel">
          <h3>Services ({services.length})</h3>
          <div className="list">
            {services.map((service) => (
              <div key={service.id} className="item">
                <strong>{service.name}</strong> <code>{service.id}</code> | price {service.priceAtomic} | rank{' '}
                {typeof service.rankScore === 'number' ? service.rankScore.toFixed(3) : 'n/a'}
              </div>
            ))}
            {services.length === 0 ? <div className="item">No services loaded.</div> : null}
          </div>
        </section>
      </div>
    </section>
  )
}
