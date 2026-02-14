import { AppShell } from '../../components/app-shell'
import { SectionCard } from '../../components/section-card'

export default function OrchestrationsPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Orchestrations</p>
        <h1>Run and Observe Workflow Executions</h1>
        <p className="subtitle">
          This page will be implemented in FE-07 with run enqueue, history filters, summaries, and timeline inspection.
        </p>
      </section>
      <SectionCard title="Status">
        <ul>
          <li>Ticket: FE-07</li>
          <li>State: planned</li>
        </ul>
      </SectionCard>
    </AppShell>
  )
}
