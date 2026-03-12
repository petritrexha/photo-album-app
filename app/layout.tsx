import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Folio — AI Photo Albums',
  description: 'Create beautiful photo albums with AI. Print or go digital.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}