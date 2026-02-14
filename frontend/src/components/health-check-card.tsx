'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../lib/api-client'
import { buildAuthHeaders, useSessionStore } from '../lib/session-store'

interface HealthResponse {
  ok?: boolean
  status?: string
  service?: string
  now?: string
}

export function HealthCheckCard() {
  const { session } = useSessionStore()
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [summary, setSummary] = useState('Press refresh to query backend health.')

  const refresh = useCallback(async () => {
    setState('loading')
    setSummary('Checking backend health...')

    const result = await apiGet<HealthResponse>('/v1/health', {
      baseUrl: session.apiBaseUrl,
      headers: buildAuthHeaders(session),
    })
    if (!result.ok) {
      setState('error')
      setSummary(result.error.message || 'Health check failed')
      return
    }

    const status = typeof result.data.status === 'string' ? result.data.status : 'unknown'
    setState('ok')
    setSummary(`Backend healthy (${status})`)
  }, [session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <section className="card">
      <h2>Backend Health Probe</h2>
      <p className={`badge badge-${state}`}>{summary}</p>
      <button type="button" className="btn" onClick={refresh}>
        Refresh Health
      </button>
    </section>
  )
}
