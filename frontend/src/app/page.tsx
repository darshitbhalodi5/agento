const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Agento Monorepo</p>
        <h1>Next.js Frontend Foundation</h1>
        <p className="subtitle">
          Frontend track is now separated from backend UI routes. This app will host demo and operator interactions.
        </p>
      </section>

      <section className="card">
        <h2>Current Setup</h2>
        <ul>
          <li>Backend API: <code>{apiBase}</code></li>
          <li>Frontend runtime: Next.js App Router</li>
          <li>Current milestone: FE-00 and FE-01 completed</li>
        </ul>
      </section>

      <section className="card">
        <h2>Next Tickets</h2>
        <ul>
          <li>FE-02: Design system baseline</li>
          <li>FE-03: API client layer</li>
          <li>FE-04: Session controls (API key and role headers)</li>
        </ul>
      </section>
    </main>
  )
}
