import type { ReactNode } from 'react'
import { TopNav } from './top-nav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="page">
      <TopNav />
      {children}
    </main>
  )
}
