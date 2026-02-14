'use client'

import { useSessionStore, type DemoUserRole } from '../../lib/session-store'

const roleOptions: DemoUserRole[] = ['viewer', 'provider', 'admin']

export function SessionControlsPanel() {
  const { session, setApiBaseUrl, setAgentApiKey, setUserRole, setOwnerId } = useSessionStore()

  return (
    <section className="session-controls">
      <label>
        API Base URL
        <input
          value={session.apiBaseUrl}
          onChange={(event) => setApiBaseUrl(event.target.value)}
          placeholder="http://localhost:3000"
        />
      </label>

      <label>
        Agent API Key
        <input
          value={session.agentApiKey}
          onChange={(event) => setAgentApiKey(event.target.value)}
          placeholder="agento-dev-agent-key"
        />
      </label>

      <label>
        User Role
        <select value={session.userRole} onChange={(event) => setUserRole(event.target.value as DemoUserRole)}>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label>
        Owner ID
        <input value={session.ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="provider_demo" />
      </label>
    </section>
  )
}
