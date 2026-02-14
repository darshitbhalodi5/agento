'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api-client'

interface HealthResponse {
  ok?: boolean
  status?: string
  service?: string
  now?: string
}

export function HealthCheckCard() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [summary, setSummary] = useState('Press refresh to query backend health.')

  async function refresh() {
    setState('loading')
    setSummary('Checking backend health...')

    const result = await apiGet<HealthResponse>('/v1/health')
    if (!result.ok) {
      setState('error')
      setSummary(result.error.message || 'Health check failed')
      return
    }

    const status = typeof result.data.status === 'string' ? result.data.status : 'unknown'
    setState('ok')
    setSummary(`Backend healthy (${status})`)
  }

  useEffect(() => {
    void refresh()
  }, [])

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
