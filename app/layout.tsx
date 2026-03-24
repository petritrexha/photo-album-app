import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'
import { LanguageProvider } from '@/lib/language-context'
import GlowWrapper from '@/components/GlowWrapper'

export const metadata: Metadata = {
  title: 'Folio — AI Photo Albums',
  description: 'Create beautiful photo albums with AI. Print or go digital.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#080809" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#faf7f2" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {/* Ambient glow blobs — renders on every page except editor */}
            <GlowWrapper />
            {/* Page content sits above glow via position: relative */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {children}
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
