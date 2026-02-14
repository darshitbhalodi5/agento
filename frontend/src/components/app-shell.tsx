import type { ReactNode } from 'react'
import { WalkthroughPanel } from './demo/walkthrough-panel'
import { SessionControlsPanel } from './session-controls/panel'
import { TopNav } from './top-nav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="page">
      <TopNav />
      <SessionControlsPanel />
      <WalkthroughPanel />
      {children}
    </main>
  )
}
