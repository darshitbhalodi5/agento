import { AppShell } from '../../components/app-shell'
import { ControlPlaneConsole } from '../../components/control-plane/control-plane-console'

export default function ControlPlanePage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Control Plane</p>
        <h1>Data Setup and Admin Operations</h1>
        <p className="subtitle">
          Manage agent API keys, billing models, service policies, billing usage queries, and workflow templates from one screen.
        </p>
      </section>

      <ControlPlaneConsole />
    </AppShell>
  )
}
