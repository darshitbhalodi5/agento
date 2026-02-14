import { TopNav } from './top-nav'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="page">
      <TopNav />
      {children}
    </main>
  )
}
