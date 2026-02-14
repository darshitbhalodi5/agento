'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export type DemoUserRole = 'viewer' | 'provider' | 'admin'

export interface SessionState {
  apiBaseUrl: string
  agentApiKey: string
  userRole: DemoUserRole
}

interface SessionContextValue {
  session: SessionState
  setApiBaseUrl: (value: string) => void
  setAgentApiKey: (value: string) => void
  setUserRole: (value: DemoUserRole) => void
}

const defaultSession: SessionState = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  agentApiKey: 'agento-dev-agent-key',
  userRole: 'viewer',
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(defaultSession)

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      setApiBaseUrl: (apiBaseUrl) => setSession((prev) => ({ ...prev, apiBaseUrl })),
      setAgentApiKey: (agentApiKey) => setSession((prev) => ({ ...prev, agentApiKey })),
      setUserRole: (userRole) => setSession((prev) => ({ ...prev, userRole })),
    }),
    [session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionStore(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSessionStore must be used within SessionProvider')
  }
  return value
}

export function buildAuthHeaders(session: SessionState): Record<string, string> {
  const headers: Record<string, string> = {
    'x-user-role': session.userRole,
  }

  const key = session.agentApiKey.trim()
  if (key.length > 0) {
    headers['x-agent-api-key'] = key
  }

  return headers
}
