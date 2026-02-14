import { AppShell } from '../../components/app-shell'
import { SectionCard } from '../../components/section-card'

export default function PaymentsPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Payments</p>
        <h1>Quote, Execute, and Request Status</h1>
        <p className="subtitle">This page will be implemented in FE-05 using the shared API client and session headers.</p>
      </section>
      <SectionCard title="Status">
        <ul>
          <li>Ticket: FE-05</li>
          <li>State: planned</li>
        </ul>
      </SectionCard>
    </AppShell>
  )
}
