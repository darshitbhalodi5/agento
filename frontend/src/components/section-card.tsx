interface SectionCardProps {
  title: string
  children: React.ReactNode
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
