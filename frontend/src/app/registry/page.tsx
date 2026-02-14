import { AppShell } from '../../components/app-shell'
import { SectionCard } from '../../components/section-card'

export default function RegistryPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Registry</p>
        <h1>Service Discovery and Writes</h1>
        <p className="subtitle">This page will be implemented in FE-06 with filters, ranking, and role-protected write actions.</p>
      </section>
      <SectionCard title="Status">
        <ul>
          <li>Ticket: FE-06</li>
          <li>State: planned</li>
        </ul>
      </SectionCard>
    </AppShell>
  )
}
