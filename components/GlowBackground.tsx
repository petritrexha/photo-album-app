'use client'
import { useEffect, useRef } from 'react'

type GlowConfig = {
  // position as % of viewport
  topA: string; leftA: string; sizeA: string
  topB: string; rightB: string; sizeB: string
  // optional third blob
  topC?: string; leftC?: string; sizeC?: string
  colorA?: string; colorB?: string; colorC?: string
}

// Different configurations per page path
const PAGE_CONFIGS: Record<string, GlowConfig> = {
  '/': {
    topA: '15%', leftA: '8%', sizeA: '520px',
    topB: '55%', rightB: '6%', sizeB: '420px',
    topC: '80%', leftC: '40%', sizeC: '280px',
    colorA: 'rgba(212,140,58,0.09)',
    colorB: 'rgba(212,140,58,0.06)',
    colorC: 'rgba(168,108,40,0.04)',
  },
  '/home': {
    topA: '8%', leftA: '60%', sizeA: '480px',
    topB: '60%', rightB: '65%', sizeB: '360px',
    colorA: 'rgba(212,140,58,0.08)',
    colorB: 'rgba(168,108,40,0.05)',
  },
  '/create': {
    topA: '5%', leftA: '30%', sizeA: '440px',
    topB: '70%', rightB: '5%', sizeB: '380px',
    topC: '40%', leftC: '75%', sizeC: '300px',
    colorA: 'rgba(212,140,58,0.07)',
    colorB: 'rgba(212,140,58,0.05)',
    colorC: 'rgba(168,108,40,0.04)',
  },
  '/dashboard': {
    topA: '10%', leftA: '75%', sizeA: '400px',
    topB: '65%', rightB: '70%', sizeB: '340px',
    colorA: 'rgba(212,140,58,0.06)',
    colorB: 'rgba(212,140,58,0.04)',
  },
  '/about': {
    topA: '12%', leftA: '5%', sizeA: '500px',
    topB: '45%', rightB: '5%', sizeB: '420px',
    topC: '85%', leftC: '50%', sizeC: '320px',
    colorA: 'rgba(212,140,58,0.08)',
    colorB: 'rgba(212,140,58,0.06)',
    colorC: 'rgba(168,108,40,0.04)',
  },
  '/pricing': {
    topA: '20%', leftA: '50%', sizeA: '460px',
    topB: '70%', rightB: '55%', sizeB: '380px',
    colorA: 'rgba(212,140,58,0.07)',
    colorB: 'rgba(212,140,58,0.05)',
  },
  '/services': {
    topA: '5%', leftA: '15%', sizeA: '500px',
    topB: '60%', rightB: '10%', sizeB: '400px',
    colorA: 'rgba(212,140,58,0.08)',
    colorB: 'rgba(212,140,58,0.06)',
  },
  'default': {
    topA: '20%', leftA: '10%', sizeA: '480px',
    topB: '60%', rightB: '8%', sizeB: '380px',
    colorA: 'rgba(212,140,58,0.07)',
    colorB: 'rgba(212,140,58,0.05)',
  },
}

function getConfig(pathname: string): GlowConfig {
  if (PAGE_CONFIGS[pathname]) return PAGE_CONFIGS[pathname]
  for (const key of Object.keys(PAGE_CONFIGS)) {
    if (pathname.startsWith(key) && key !== '/') return PAGE_CONFIGS[key]
  }
  return PAGE_CONFIGS['default']
}

const BLOB_STYLE: React.CSSProperties = {
  position: 'fixed',
  borderRadius: '50%',
  pointerEvents: 'none',
  zIndex: 0,
  filter: 'blur(80px)',
  transition: 'opacity 1.2s ease',
}

export default function GlowBackground({ pathname }: { pathname: string }) {
  const config = getConfig(pathname)

  // Skip in editor — it's too visually noisy on canvas
  if (pathname.includes('/edit')) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Blob A */}
      <div style={{
        ...BLOB_STYLE,
        width: config.sizeA, height: config.sizeA,
        top: config.topA, left: config.leftA,
        background: `radial-gradient(circle, ${config.colorA ?? 'rgba(212,140,58,0.08)'} 0%, transparent 70%)`,
        animation: 'glowDrift1 18s ease-in-out infinite alternate',
      }} />

      {/* Blob B */}
      <div style={{
        ...BLOB_STYLE,
        width: config.sizeB, height: config.sizeB,
        top: config.topB, right: config.rightB,
        background: `radial-gradient(circle, ${config.colorB ?? 'rgba(212,140,58,0.05)'} 0%, transparent 70%)`,
        animation: 'glowDrift2 22s ease-in-out infinite alternate',
      }} />

      {/* Blob C (optional) */}
      {config.topC && (
        <div style={{
          ...BLOB_STYLE,
          width: config.sizeC, height: config.sizeC,
          top: config.topC, left: config.leftC,
          background: `radial-gradient(circle, ${config.colorC ?? 'rgba(168,108,40,0.04)'} 0%, transparent 70%)`,
          animation: 'glowDrift3 26s ease-in-out infinite alternate',
        }} />
      )}
    </div>
  )
}
