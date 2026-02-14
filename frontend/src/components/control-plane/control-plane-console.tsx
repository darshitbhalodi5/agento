'use client'

import { useMemo, useState } from 'react'
import { apiGet, apiPost, apiPut } from '../../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../../lib/session-store'

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function cleanObject(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      continue
    }
    output[key] = value
  }
  return output
}

export function ControlPlaneConsole() {
  const { session } = useSessionStore()
  const headers = useMemo(() => buildAuthHeaders(session), [session])
  const isAdmin = session.userRole === 'admin'

  const [agentQuery, setAgentQuery] = useState({ agentId: '', active: '', limit: '50' })
  const [agentCreate, setAgentCreate] = useState({ agentId: 'agent_demo', apiKey: '' })
  const [agentActionKeyId, setAgentActionKeyId] = useState('')
  const [agentOut, setAgentOut] = useState('No agent key action yet.')

  const [billingModelQueryServiceId, setBillingModelQueryServiceId] = useState('weather-api')
  const [billingModelForm, setBillingModelForm] = useState({
    serviceId: 'weather-api',
    modelType: 'fixed',
    fixedPriceAtomic: '1000',
    freeQuota: '0',
    tierJson: '[]',
    active: true,
  })
  const [billingModelOut, setBillingModelOut] = useState('No billing model action yet.')

  const [policyGet, setPolicyGet] = useState({ serviceId: 'weather-api', limit: '100' })
  const [policyForm, setPolicyForm] = useState({
    serviceId: 'weather-api',
    active: true,
    maxCallsPerMinute: '',
    maxSpendPerHourAtomic: '',
    maxSpendPerDayAtomic: '',
    allowlistConsumerIds: '',
    blocklistConsumerIds: '',
  })
  const [policyOut, setPolicyOut] = useState('No policy action yet.')

  const [usageQuery, setUsageQuery] = useState({
    serviceId: '',
    status: '',
    from: '',
    to: '',
    limit: '50',
  })
  const [usageOut, setUsageOut] = useState('No billing usage action yet.')

  const [workflowListQuery, setWorkflowListQuery] = useState({ limit: '50', active: '' })
  const [workflowReadId, setWorkflowReadId] = useState('wf_demo')
  const [workflowCreate, setWorkflowCreate] = useState({
    workflowId: 'wf_demo_custom',
    name: 'Demo Workflow',
    description: '',
    stepGraph: '{"nodes":[],"edges":[]}',
    defaultPolicies: '{}',
    active: true,
  })
  const [workflowUpdate, setWorkflowUpdate] = useState({
    workflowId: 'wf_demo_custom',
    name: '',
    description: '',
    stepGraph: '',
    defaultPolicies: '',
    active: '',
  })
  const [workflowOut, setWorkflowOut] = useState('No workflow action yet.')

  async function listAgentKeys() {
    const limit = Number(agentQuery.limit || '50')
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      setAgentOut(pretty({ ok: false, error: { message: 'limit must be between 1 and 200' } }))
      return
    }

    const params = new URLSearchParams()
    if (agentQuery.agentId.trim()) params.set('agentId', agentQuery.agentId.trim())
    if (agentQuery.active === 'true' || agentQuery.active === 'false') params.set('active', agentQuery.active)
    params.set('limit', String(limit))

    const result = await apiGet(`/v1/agent-keys?${params.toString()}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setAgentOut(pretty(result.ok ? result.data : result))
  }

  async function createAgentKey() {
    const payload = cleanObject({
      agentId: agentCreate.agentId,
      apiKey: agentCreate.apiKey.trim(),
    })
    const result = await apiPost('/v1/agent-keys', payload, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setAgentOut(pretty(result.ok ? result.data : result))
  }

  async function revokeAgentKey() {
    const keyId = Number(agentActionKeyId)
    if (!Number.isFinite(keyId) || keyId <= 0) {
      setAgentOut(pretty({ ok: false, error: { message: 'Enter a valid key id to revoke' } }))
      return
    }
    const result = await apiPost(`/v1/agent-keys/${keyId}/revoke`, {}, { baseUrl: session.apiBaseUrl, headers })
    setAgentOut(pretty(result.ok ? result.data : result))
  }

  async function rotateAgentKey() {
    const keyId = Number(agentActionKeyId)
    if (!Number.isFinite(keyId) || keyId <= 0) {
      setAgentOut(pretty({ ok: false, error: { message: 'Enter a valid key id to rotate' } }))
      return
    }
    const result = await apiPost(`/v1/agent-keys/${keyId}/rotate`, {}, { baseUrl: session.apiBaseUrl, headers })
    setAgentOut(pretty(result.ok ? result.data : result))
  }

  async function getBillingModel() {
    const result = await apiGet(`/v1/billing/models?serviceId=${encodeURIComponent(billingModelQueryServiceId)}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setBillingModelOut(pretty(result.ok ? result.data : result))
  }

  async function upsertBillingModel() {
    let tierJson: unknown
    try {
      tierJson = JSON.parse(billingModelForm.tierJson)
    } catch (error) {
      setBillingModelOut(pretty({ ok: false, error: { message: `tierJson parse error: ${String(error)}` } }))
      return
    }

    const freeQuota = Number(billingModelForm.freeQuota || '0')
    if (!Number.isFinite(freeQuota) || freeQuota < 0) {
      setBillingModelOut(pretty({ ok: false, error: { message: 'freeQuota must be a non-negative integer' } }))
      return
    }

    const payload = cleanObject({
      serviceId: billingModelForm.serviceId,
      modelType: billingModelForm.modelType,
      fixedPriceAtomic: billingModelForm.fixedPriceAtomic,
      freeQuota,
      tierJson,
      active: billingModelForm.active,
    })
    const result = await apiPost('/v1/billing/models', payload, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setBillingModelOut(pretty(result.ok ? result.data : result))
  }

  async function getPolicies() {
    const params = new URLSearchParams()
    if (policyGet.serviceId.trim()) params.set('serviceId', policyGet.serviceId.trim())
    if (policyGet.limit.trim()) params.set('limit', policyGet.limit.trim())
    const result = await apiGet(`/v1/policies?${params.toString()}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setPolicyOut(pretty(result.ok ? result.data : result))
  }

  async function upsertPolicy() {
    const payload = cleanObject({
      serviceId: policyForm.serviceId,
      active: policyForm.active,
      maxCallsPerMinute: policyForm.maxCallsPerMinute ? Number(policyForm.maxCallsPerMinute) : null,
      maxSpendPerHourAtomic: policyForm.maxSpendPerHourAtomic || null,
      maxSpendPerDayAtomic: policyForm.maxSpendPerDayAtomic || null,
      allowlistConsumerIds: policyForm.allowlistConsumerIds
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      blocklistConsumerIds: policyForm.blocklistConsumerIds
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    })

    const result = await apiPost('/v1/policies', payload, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setPolicyOut(pretty(result.ok ? result.data : result))
  }

  async function queryBillingUsage() {
    const limit = Number(usageQuery.limit || '50')
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      setUsageOut(pretty({ ok: false, error: { message: 'limit must be between 1 and 200' } }))
      return
    }

    const params = new URLSearchParams()
    if (usageQuery.serviceId.trim()) params.set('serviceId', usageQuery.serviceId.trim())
    if (usageQuery.status.trim()) params.set('status', usageQuery.status.trim())
    if (usageQuery.from.trim()) params.set('from', usageQuery.from.trim())
    if (usageQuery.to.trim()) params.set('to', usageQuery.to.trim())
    params.set('limit', String(limit))

    const result = await apiGet(`/v1/billing/usage?${params.toString()}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setUsageOut(pretty(result.ok ? result.data : result))
  }

  async function listWorkflows() {
    const limit = Number(workflowListQuery.limit || '50')
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      setWorkflowOut(pretty({ ok: false, error: { message: 'limit must be between 1 and 200' } }))
      return
    }

    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (workflowListQuery.active === 'true' || workflowListQuery.active === 'false') {
      params.set('active', workflowListQuery.active)
    }
    const result = await apiGet(`/v1/workflows?${params.toString()}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setWorkflowOut(pretty(result.ok ? result.data : result))
  }

  async function getWorkflowById() {
    const result = await apiGet(`/v1/workflows/${encodeURIComponent(workflowReadId)}`, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setWorkflowOut(pretty(result.ok ? result.data : result))
  }

  async function createWorkflow() {
    let stepGraph: unknown
    let defaultPolicies: unknown
    try {
      stepGraph = JSON.parse(workflowCreate.stepGraph)
      defaultPolicies = JSON.parse(workflowCreate.defaultPolicies)
    } catch (error) {
      setWorkflowOut(pretty({ ok: false, error: { message: `workflow JSON parse error: ${String(error)}` } }))
      return
    }

    const payload = cleanObject({
      workflowId: workflowCreate.workflowId,
      name: workflowCreate.name,
      description: workflowCreate.description,
      stepGraph,
      defaultPolicies,
      active: workflowCreate.active,
    })

    const result = await apiPost('/v1/workflows', payload, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setWorkflowOut(pretty(result.ok ? result.data : result))
  }

  async function updateWorkflow() {
    const payload: Record<string, unknown> = {}
    if (workflowUpdate.name.trim()) payload.name = workflowUpdate.name.trim()
    if (workflowUpdate.description.trim()) payload.description = workflowUpdate.description.trim()
    if (workflowUpdate.active === 'true' || workflowUpdate.active === 'false') payload.active = workflowUpdate.active === 'true'

    if (workflowUpdate.stepGraph.trim()) {
      try {
        payload.stepGraph = JSON.parse(workflowUpdate.stepGraph)
      } catch (error) {
        setWorkflowOut(pretty({ ok: false, error: { message: `stepGraph parse error: ${String(error)}` } }))
        return
      }
    }

    if (workflowUpdate.defaultPolicies.trim()) {
      try {
        payload.defaultPolicies = JSON.parse(workflowUpdate.defaultPolicies)
      } catch (error) {
        setWorkflowOut(pretty({ ok: false, error: { message: `defaultPolicies parse error: ${String(error)}` } }))
        return
      }
    }

    const result = await apiPut(`/v1/workflows/${encodeURIComponent(workflowUpdate.workflowId)}`, payload, {
      baseUrl: session.apiBaseUrl,
      headers,
    })
    setWorkflowOut(pretty(result.ok ? result.data : result))
  }

  return (
    <section className="card">
      <h2>Control Plane Console</h2>
      <p className="subtitle">
        Use admin role in session controls for write operations. This console covers agent keys, billing, policies, and workflows.
      </p>
      <p className="badge badge-idle">
        Current role: {session.userRole} | Write actions {isAdmin ? 'enabled' : 'disabled (switch to admin)'}
      </p>

      <div className="registry-grid">
        <article className="panel">
          <h3>Agent API Keys</h3>
          <div className="form-grid">
            <label>
              Agent ID filter
              <input
                value={agentQuery.agentId}
                onChange={(event) => setAgentQuery((prev) => ({ ...prev, agentId: event.target.value }))}
              />
            </label>
            <label>
              Active filter
              <select value={agentQuery.active} onChange={(event) => setAgentQuery((prev) => ({ ...prev, active: event.target.value }))}>
                <option value="">all</option>
                <option value="true">active</option>
                <option value="false">inactive</option>
              </select>
            </label>
            <label>
              Limit
              <input value={agentQuery.limit} onChange={(event) => setAgentQuery((prev) => ({ ...prev, limit: event.target.value }))} />
            </label>
            <label>
              Create Agent ID
              <input
                value={agentCreate.agentId}
                onChange={(event) => setAgentCreate((prev) => ({ ...prev, agentId: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Optional custom key (leave blank to auto-generate)
              <input value={agentCreate.apiKey} onChange={(event) => setAgentCreate((prev) => ({ ...prev, apiKey: event.target.value }))} />
            </label>
            <label>
              Key ID (revoke/rotate)
              <input value={agentActionKeyId} onChange={(event) => setAgentActionKeyId(event.target.value)} />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={listAgentKeys}>
              GET /v1/agent-keys
            </button>
            <button type="button" className="btn" onClick={createAgentKey} disabled={!isAdmin}>
              POST /v1/agent-keys
            </button>
            <button type="button" className="btn" onClick={revokeAgentKey} disabled={!isAdmin}>
              Revoke Key
            </button>
            <button type="button" className="btn" onClick={rotateAgentKey} disabled={!isAdmin}>
              Rotate Key
            </button>
          </div>
          <pre className="result">{agentOut}</pre>
        </article>

        <article className="panel">
          <h3>Billing Models</h3>
          <div className="form-grid">
            <label>
              Query Service ID
              <input value={billingModelQueryServiceId} onChange={(event) => setBillingModelQueryServiceId(event.target.value)} />
            </label>
            <label>
              Service ID
              <input
                value={billingModelForm.serviceId}
                onChange={(event) => setBillingModelForm((prev) => ({ ...prev, serviceId: event.target.value }))}
              />
            </label>
            <label>
              Model Type
              <select
                value={billingModelForm.modelType}
                onChange={(event) => setBillingModelForm((prev) => ({ ...prev, modelType: event.target.value }))}
              >
                <option value="fixed">fixed</option>
                <option value="tiered">tiered</option>
                <option value="hybrid">hybrid</option>
              </select>
            </label>
            <label>
              fixedPriceAtomic
              <input
                value={billingModelForm.fixedPriceAtomic}
                onChange={(event) => setBillingModelForm((prev) => ({ ...prev, fixedPriceAtomic: event.target.value }))}
              />
            </label>
            <label>
              freeQuota
              <input
                value={billingModelForm.freeQuota}
                onChange={(event) => setBillingModelForm((prev) => ({ ...prev, freeQuota: event.target.value }))}
              />
            </label>
            <label className="span-2">
              tierJson
              <textarea
                rows={4}
                value={billingModelForm.tierJson}
                onChange={(event) => setBillingModelForm((prev) => ({ ...prev, tierJson: event.target.value }))}
              />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={getBillingModel}>
              GET /v1/billing/models
            </button>
            <button type="button" className="btn" onClick={upsertBillingModel} disabled={!isAdmin}>
              POST /v1/billing/models
            </button>
          </div>
          <pre className="result">{billingModelOut}</pre>
        </article>

        <article className="panel">
          <h3>Service Policies</h3>
          <div className="form-grid">
            <label>
              Query serviceId
              <input value={policyGet.serviceId} onChange={(event) => setPolicyGet((prev) => ({ ...prev, serviceId: event.target.value }))} />
            </label>
            <label>
              Query limit
              <input value={policyGet.limit} onChange={(event) => setPolicyGet((prev) => ({ ...prev, limit: event.target.value }))} />
            </label>
            <label>
              serviceId
              <input value={policyForm.serviceId} onChange={(event) => setPolicyForm((prev) => ({ ...prev, serviceId: event.target.value }))} />
            </label>
            <label>
              active
              <select value={String(policyForm.active)} onChange={(event) => setPolicyForm((prev) => ({ ...prev, active: event.target.value === 'true' }))}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              maxCallsPerMinute
              <input
                value={policyForm.maxCallsPerMinute}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, maxCallsPerMinute: event.target.value }))}
              />
            </label>
            <label>
              maxSpendPerHourAtomic
              <input
                value={policyForm.maxSpendPerHourAtomic}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, maxSpendPerHourAtomic: event.target.value }))}
              />
            </label>
            <label>
              maxSpendPerDayAtomic
              <input
                value={policyForm.maxSpendPerDayAtomic}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, maxSpendPerDayAtomic: event.target.value }))}
              />
            </label>
            <label className="span-2">
              allowlistConsumerIds (comma-separated)
              <input
                value={policyForm.allowlistConsumerIds}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, allowlistConsumerIds: event.target.value }))}
              />
            </label>
            <label className="span-2">
              blocklistConsumerIds (comma-separated)
              <input
                value={policyForm.blocklistConsumerIds}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, blocklistConsumerIds: event.target.value }))}
              />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={getPolicies}>
              GET /v1/policies
            </button>
            <button type="button" className="btn" onClick={upsertPolicy} disabled={!isAdmin}>
              POST /v1/policies
            </button>
          </div>
          <pre className="result">{policyOut}</pre>
        </article>

        <article className="panel">
          <h3>Billing Usage Explorer</h3>
          <div className="form-grid">
            <label>
              serviceId
              <input value={usageQuery.serviceId} onChange={(event) => setUsageQuery((prev) => ({ ...prev, serviceId: event.target.value }))} />
            </label>
            <label>
              status
              <input value={usageQuery.status} onChange={(event) => setUsageQuery((prev) => ({ ...prev, status: event.target.value }))} />
            </label>
            <label>
              from (ISO datetime)
              <input value={usageQuery.from} onChange={(event) => setUsageQuery((prev) => ({ ...prev, from: event.target.value }))} />
            </label>
            <label>
              to (ISO datetime)
              <input value={usageQuery.to} onChange={(event) => setUsageQuery((prev) => ({ ...prev, to: event.target.value }))} />
            </label>
            <label>
              limit
              <input value={usageQuery.limit} onChange={(event) => setUsageQuery((prev) => ({ ...prev, limit: event.target.value }))} />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={queryBillingUsage}>
              GET /v1/billing/usage
            </button>
          </div>
          <pre className="result">{usageOut}</pre>
        </article>

        <article className="panel">
          <h3>Workflow Templates</h3>
          <div className="form-grid">
            <label>
              List limit
              <input
                value={workflowListQuery.limit}
                onChange={(event) => setWorkflowListQuery((prev) => ({ ...prev, limit: event.target.value }))}
              />
            </label>
            <label>
              List active filter
              <select
                value={workflowListQuery.active}
                onChange={(event) => setWorkflowListQuery((prev) => ({ ...prev, active: event.target.value }))}
              >
                <option value="">all</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              Read workflowId
              <input value={workflowReadId} onChange={(event) => setWorkflowReadId(event.target.value)} />
            </label>
            <label>
              Create workflowId
              <input
                value={workflowCreate.workflowId}
                onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, workflowId: event.target.value }))}
              />
            </label>
            <label>
              Create name
              <input value={workflowCreate.name} onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label>
              Create description
              <input
                value={workflowCreate.description}
                onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Create stepGraph JSON
              <textarea
                rows={4}
                value={workflowCreate.stepGraph}
                onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, stepGraph: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Create defaultPolicies JSON
              <textarea
                rows={3}
                value={workflowCreate.defaultPolicies}
                onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, defaultPolicies: event.target.value }))}
              />
            </label>
            <label>
              Create active
              <select
                value={String(workflowCreate.active)}
                onChange={(event) => setWorkflowCreate((prev) => ({ ...prev, active: event.target.value === 'true' }))}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <label>
              Update workflowId
              <input
                value={workflowUpdate.workflowId}
                onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, workflowId: event.target.value }))}
              />
            </label>
            <label>
              Update name
              <input value={workflowUpdate.name} onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label>
              Update description
              <input
                value={workflowUpdate.description}
                onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label>
              Update active (blank/true/false)
              <input
                value={workflowUpdate.active}
                onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, active: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Update stepGraph JSON (optional)
              <textarea
                rows={3}
                value={workflowUpdate.stepGraph}
                onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, stepGraph: event.target.value }))}
              />
            </label>
            <label className="span-2">
              Update defaultPolicies JSON (optional)
              <textarea
                rows={3}
                value={workflowUpdate.defaultPolicies}
                onChange={(event) => setWorkflowUpdate((prev) => ({ ...prev, defaultPolicies: event.target.value }))}
              />
            </label>
          </div>
          <div className="actions-row">
            <button type="button" className="btn" onClick={listWorkflows}>
              GET /v1/workflows
            </button>
            <button type="button" className="btn" onClick={getWorkflowById}>
              GET /v1/workflows/:id
            </button>
            <button type="button" className="btn" onClick={createWorkflow} disabled={!isAdmin}>
              POST /v1/workflows
            </button>
            <button type="button" className="btn" onClick={updateWorkflow} disabled={!isAdmin}>
              PUT /v1/workflows/:id
            </button>
          </div>
          <pre className="result">{workflowOut}</pre>
        </article>
      </div>
    </section>
  )
}
