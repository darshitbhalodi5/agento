import { AppShell } from '../../components/app-shell'
import { ObservabilityConsole } from '../../components/observability/observability-console'

export default function ObservabilityPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Observability</p>
        <h1>Operational Evidence and Read Models</h1>
        <p className="subtitle">Frontend metrics cards and backend telemetry links are now available for judge/operator workflows.</p>
      </section>

      <ObservabilityConsole />
    </AppShell>
  )
}
