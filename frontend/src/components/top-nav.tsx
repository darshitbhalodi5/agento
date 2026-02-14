import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/payments', label: 'Payments' },
  { href: '/registry', label: 'Registry' },
  { href: '/orchestrations', label: 'Orchestrations' },
  { href: '/observability', label: 'Observability' },
  { href: '/control-plane', label: 'Control Plane' },
]

export function TopNav() {
  return (
    <nav className="top-nav" aria-label="Primary">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="top-nav-link">
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
