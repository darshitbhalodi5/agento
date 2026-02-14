import { AppShell } from '../../components/app-shell'
import { OrchestrationsConsole } from '../../components/orchestrations/orchestrations-console'

export default function OrchestrationsPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Orchestrations</p>
        <h1>Run and Observe Workflow Executions</h1>
        <p className="subtitle">
          Full orchestration interaction is now available, including enqueue, run history filters, summary/timeline reads, and
          cancellation.
        </p>
      </section>

      <OrchestrationsConsole />
    </AppShell>
  )
}
