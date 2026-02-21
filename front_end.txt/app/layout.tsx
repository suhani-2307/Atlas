import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AidAura',
  description: 'Because guessing costs too much',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
