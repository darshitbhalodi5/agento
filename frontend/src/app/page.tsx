import { AppShell } from '../components/app-shell'
import { HealthCheckCard } from '../components/health-check-card'
import { SectionCard } from '../components/section-card'

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export default function HomePage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Agento Monorepo</p>
        <h1>Agento Frontend Design Baseline</h1>
        <p className="subtitle">
          Shared layout, tokens, and page primitives are now in place for the Next.js frontend track.
        </p>
      </section>

      <SectionCard title="Current Setup">
        <ul>
          <li>Backend API: <code>{apiBase}</code></li>
          <li>Frontend runtime: Next.js App Router</li>
          <li>Current milestone: FE-02 design baseline completed</li>
        </ul>
      </SectionCard>

      <SectionCard title="Next Tickets">
        <ul>
          <li>FE-03: API client layer</li>
          <li>FE-04: session controls (API key and role headers)</li>
          <li>FE-05: payments flow page</li>
        </ul>
      </SectionCard>

      <HealthCheckCard />
    </AppShell>
  )
}
