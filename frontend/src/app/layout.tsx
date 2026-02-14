import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SessionProvider } from '../lib/session-store'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agento Frontend',
  description: 'Next.js demo frontend for Agento backend APIs',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
