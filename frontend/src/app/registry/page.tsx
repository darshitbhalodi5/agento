import { AppShell } from '../../components/app-shell'
import { RegistryConsole } from '../../components/registry/registry-console'

export default function RegistryPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Registry</p>
        <h1>Service Discovery and Writes</h1>
        <p className="subtitle">
          Filtered marketplace discovery and protected write actions are available through the shared session controls.
        </p>
      </section>

      <RegistryConsole />
    </AppShell>
  )
}
