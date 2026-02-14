import { AppShell } from '../../components/app-shell'
import { PaymentsConsole } from '../../components/payments/payments-console'

export default function PaymentsPage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Payments</p>
        <h1>Quote, Execute, and Request Status</h1>
        <p className="subtitle">
          Full payment interaction flow is now available in Next.js using shared API client and session controls.
        </p>
        <p className="subtitle">Use preset buttons below to switch between happy-path and deterministic error-path demos.</p>
      </section>

      <PaymentsConsole />
    </AppShell>
  )
}
