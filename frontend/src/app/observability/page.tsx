import { AppShell } from '../../components/app-shell'
import { SectionCard } from '../../components/section-card'

export default function ObservabilityPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Observability</p>
        <h1>Operational Evidence and Read Models</h1>
        <p className="subtitle">
          This page will be implemented in FE-08 with frontend metrics cards and links to backend telemetry dashboards.
        </p>
      </section>
      <SectionCard title="Status">
        <ul>
          <li>Ticket: FE-08</li>
          <li>State: planned</li>
        </ul>
      </SectionCard>
    </AppShell>
  )
}
