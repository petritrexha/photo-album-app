'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

// ── Icons ────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

// ── Product Illustrations (inline SVG) ──────────────────────────────────────

const PhotoBookIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="15" y="10" width="70" height="70" rx="3" fill="rgba(212,140,58,0.12)" stroke="rgba(212,140,58,0.4)" strokeWidth="1.5"/>
    <rect x="20" y="15" width="60" height="38" rx="2" fill="rgba(212,140,58,0.18)"/>
    <line x1="20" y1="60" x2="80" y2="60" stroke="rgba(212,140,58,0.3)" strokeWidth="1"/>
    <line x1="20" y1="67" x2="60" y2="67" stroke="rgba(212,140,58,0.2)" strokeWidth="1"/>
    <line x1="20" y1="72" x2="50" y2="72" stroke="rgba(212,140,58,0.2)" strokeWidth="1"/>
    {/* spine */}
    <rect x="10" y="10" width="8" height="70" rx="2" fill="rgba(212,140,58,0.25)" stroke="rgba(212,140,58,0.5)" strokeWidth="1"/>
    {/* photo icon inside */}
    <rect x="30" y="22" width="40" height="24" rx="1.5" fill="rgba(212,140,58,0.1)" stroke="rgba(212,140,58,0.35)" strokeWidth="1"/>
    <circle cx="38" cy="30" r="3" fill="rgba(212,140,58,0.4)"/>
    <polyline points="30,42 42,32 52,38 62,28 70,34 70,46 30,46" fill="rgba(212,140,58,0.2)" stroke="none"/>
    {/* shadow */}
    <ellipse cx="50" cy="84" rx="30" ry="3" fill="rgba(0,0,0,0.15)"/>
  </svg>
)

const PhotoCardsIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="35" y="8" width="52" height="74" rx="3" fill="rgba(212,140,58,0.08)" stroke="rgba(212,140,58,0.25)" strokeWidth="1.5" transform="rotate(-6 35 8)"/>
    <rect x="22" y="10" width="52" height="74" rx="3" fill="rgba(212,140,58,0.12)" stroke="rgba(212,140,58,0.35)" strokeWidth="1.5" transform="rotate(-2 22 10)"/>
    <rect x="18" y="8" width="52" height="74" rx="3" fill="rgba(212,140,58,0.18)" stroke="rgba(212,140,58,0.5)" strokeWidth="1.5"/>
    <rect x="24" y="14" width="40" height="30" rx="2" fill="rgba(212,140,58,0.15)" stroke="rgba(212,140,58,0.3)" strokeWidth="1"/>
    <circle cx="31" cy="22" r="3" fill="rgba(212,140,58,0.5)"/>
    <polyline points="24,40 34,30 42,36 54,22 64,28 64,44 24,44" fill="rgba(212,140,58,0.2)" stroke="none"/>
    <line x1="24" y1="52" x2="64" y2="52" stroke="rgba(212,140,58,0.3)" strokeWidth="1.5"/>
    <line x1="24" y1="59" x2="52" y2="59" stroke="rgba(212,140,58,0.2)" strokeWidth="1"/>
    <line x1="24" y1="65" x2="44" y2="65" stroke="rgba(212,140,58,0.15)" strokeWidth="1"/>
    <ellipse cx="50" cy="87" rx="28" ry="2.5" fill="rgba(0,0,0,0.12)"/>
  </svg>
)

const WallArtIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* wall */}
    <rect x="0" y="0" width="120" height="90" fill="rgba(212,140,58,0.04)"/>
    {/* outer frame */}
    <rect x="22" y="8" width="76" height="68" rx="2" fill="rgba(212,140,58,0.2)" stroke="rgba(212,140,58,0.6)" strokeWidth="2.5"/>
    {/* mat */}
    <rect x="28" y="14" width="64" height="56" rx="1" fill="rgba(212,140,58,0.06)" stroke="rgba(212,140,58,0.2)" strokeWidth="1"/>
    {/* photo */}
    <rect x="32" y="18" width="56" height="48" rx="1" fill="rgba(212,140,58,0.15)"/>
    {/* landscape scene */}
    <rect x="32" y="18" width="56" height="48" rx="1" fill="rgba(0,0,0,0.08)"/>
    <ellipse cx="60" cy="36" rx="10" ry="10" fill="rgba(212,140,58,0.3)"/>
    <polyline points="32,54 44,40 54,48 66,34 80,44 88,38 88,66 32,66" fill="rgba(212,140,58,0.2)" stroke="none"/>
    {/* hanging wire */}
    <line x1="45" y1="8" x2="60" y2="2" stroke="rgba(212,140,58,0.4)" strokeWidth="1"/>
    <line x1="75" y1="8" x2="60" y2="2" stroke="rgba(212,140,58,0.4)" strokeWidth="1"/>
    <circle cx="60" cy="2" r="1.5" fill="rgba(212,140,58,0.6)"/>
    <ellipse cx="60" cy="86" rx="32" ry="3" fill="rgba(0,0,0,0.1)"/>
  </svg>
)

const FramedPhotoIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* outer frame thick */}
    <rect x="18" y="6" width="84" height="72" rx="3" fill="rgba(212,140,58,0.25)" stroke="rgba(212,140,58,0.6)" strokeWidth="2.5"/>
    {/* inner frame/mat */}
    <rect x="26" y="14" width="68" height="56" rx="1.5" fill="rgba(212,140,58,0.08)" stroke="rgba(212,140,58,0.25)" strokeWidth="1.5"/>
    {/* photo area */}
    <rect x="30" y="18" width="60" height="48" rx="1" fill="rgba(212,140,58,0.15)"/>
    {/* photo content */}
    <circle cx="60" cy="34" r="8" fill="rgba(212,140,58,0.3)"/>
    <ellipse cx="60" cy="52" rx="14" ry="8" fill="rgba(212,140,58,0.2)"/>
    {/* frame corner ornaments */}
    <circle cx="22" cy="10" r="2" fill="rgba(212,140,58,0.5)"/>
    <circle cx="98" cy="10" r="2" fill="rgba(212,140,58,0.5)"/>
    <circle cx="22" cy="74" r="2" fill="rgba(212,140,58,0.5)"/>
    <circle cx="98" cy="74" r="2" fill="rgba(212,140,58,0.5)"/>
    {/* desk/shelf line */}
    <line x1="10" y1="80" x2="110" y2="80" stroke="rgba(212,140,58,0.2)" strokeWidth="1.5"/>
    <rect x="10" y="80" width="100" height="4" rx="1" fill="rgba(212,140,58,0.08)"/>
  </svg>
)

const PhotoStripIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* main strip */}
    <rect x="38" y="4" width="44" height="82" rx="3" fill="rgba(212,140,58,0.12)" stroke="rgba(212,140,58,0.4)" strokeWidth="1.5"/>
    {/* film holes top/bottom */}
    <circle cx="44" cy="8" r="2" fill="rgba(212,140,58,0.3)"/>
    <circle cx="76" cy="8" r="2" fill="rgba(212,140,58,0.3)"/>
    <circle cx="44" cy="82" r="2" fill="rgba(212,140,58,0.3)"/>
    <circle cx="76" cy="82" r="2" fill="rgba(212,140,58,0.3)"/>
    {/* 4 photo panels */}
    {[14, 31, 48, 65].map((y, i) => (
      <g key={i}>
        <rect x="43" y={y} width="34" height="14" rx="1.5" fill="rgba(212,140,58,0.18)" stroke="rgba(212,140,58,0.3)" strokeWidth="1"/>
        <circle cx={49} cy={y + 5} r={2.5} fill="rgba(212,140,58,0.4)"/>
        <polyline points={`43,${y+12} 50,${y+6} 56,${y+10} 64,${y+4} 77,${y+9} 77,${y+14} 43,${y+14}`} fill="rgba(212,140,58,0.2)" stroke="none"/>
      </g>
    ))}
    {/* decorative strips behind */}
    <rect x="28" y="10" width="12" height="70" rx="2" fill="rgba(212,140,58,0.06)" stroke="rgba(212,140,58,0.15)" strokeWidth="1" transform="rotate(-4 28 10)"/>
    <rect x="80" y="10" width="12" height="70" rx="2" fill="rgba(212,140,58,0.06)" stroke="rgba(212,140,58,0.15)" strokeWidth="1" transform="rotate(4 80 10)"/>
    <ellipse cx="60" cy="88" rx="24" ry="2.5" fill="rgba(0,0,0,0.12)"/>
  </svg>
)

const EditedPhotoIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* photo base */}
    <rect x="16" y="12" width="88" height="66" rx="3" fill="rgba(212,140,58,0.12)" stroke="rgba(212,140,58,0.35)" strokeWidth="1.5"/>
    {/* photo content */}
    <rect x="16" y="12" width="88" height="66" rx="3" fill="rgba(0,0,0,0.05)"/>
    <ellipse cx="60" cy="38" rx="14" ry="14" fill="rgba(212,140,58,0.25)"/>
    <ellipse cx="60" cy="60" rx="20" ry="10" fill="rgba(212,140,58,0.15)"/>
    {/* adjustment sliders overlay */}
    <rect x="20" y="54" width="80" height="20" rx="2" fill="rgba(0,0,0,0.35)"/>
    {/* slider tracks */}
    <line x1="26" y1="59" x2="94" y2="59" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="26" y1="65" x2="94" y2="65" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="26" y1="71" x2="94" y2="71" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
    {/* slider knobs */}
    <circle cx="68" cy="59" r="3.5" fill="rgba(212,140,58,0.9)"/>
    <circle cx="52" cy="65" r="3.5" fill="rgba(212,140,58,0.9)"/>
    <circle cx="74" cy="71" r="3.5" fill="rgba(212,140,58,0.9)"/>
    {/* sparkle/magic elements */}
    <path d="M96 16 L98 22 L104 24 L98 26 L96 32 L94 26 L88 24 L94 22 Z" fill="rgba(212,140,58,0.7)"/>
    <path d="M28 18 L29 21 L32 22 L29 23 L28 26 L27 23 L24 22 L27 21 Z" fill="rgba(212,140,58,0.5)"/>
    <ellipse cx="60" cy="86" rx="32" ry="2.5" fill="rgba(0,0,0,0.1)"/>
  </svg>
)

const InstagramIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* phone outline */}
    <rect x="28" y="4" width="64" height="82" rx="8" fill="rgba(212,140,58,0.08)" stroke="rgba(212,140,58,0.35)" strokeWidth="1.5"/>
    {/* screen */}
    <rect x="32" y="12" width="56" height="66" rx="2" fill="rgba(212,140,58,0.06)"/>
    {/* instagram-like post */}
    {/* header row */}
    <circle cx="40" cy="20" r="4" fill="rgba(212,140,58,0.4)"/>
    <line x1="48" y1="19" x2="70" y2="19" stroke="rgba(212,140,58,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="48" y1="23" x2="62" y2="23" stroke="rgba(212,140,58,0.15)" strokeWidth="1" strokeLinecap="round"/>
    {/* square photo */}
    <rect x="33" y="29" width="54" height="34" rx="1" fill="rgba(212,140,58,0.18)"/>
    <circle cx="46" cy="40" r="5" fill="rgba(212,140,58,0.4)"/>
    <polyline points="33,55 44,44 52,50 64,38 76,46 87,40 87,63 33,63" fill="rgba(212,140,58,0.25)" stroke="none"/>
    {/* action icons row */}
    {/* heart */}
    <path d="M36 70 C36 68 38 67 39 68 C40 67 42 68 42 70 C42 72 39 74 39 74 C39 74 36 72 36 70Z" fill="rgba(212,140,58,0.5)"/>
    {/* comment */}
    <rect x="45" y="67" width="8" height="6" rx="1.5" fill="rgba(212,140,58,0.3)"/>
    <polyline points="46 73 48 75 50 73" fill="rgba(212,140,58,0.3)" stroke="none"/>
    {/* send */}
    <path d="M56 70 L64 68 L58 72 Z" fill="rgba(212,140,58,0.3)"/>
    {/* caption */}
    <line x1="33" y1="78" x2="76" y2="78" stroke="rgba(212,140,58,0.2)" strokeWidth="1" strokeLinecap="round"/>
    {/* home indicator */}
    <rect x="50" y="88" width="20" height="2" rx="1" fill="rgba(212,140,58,0.3)"/>
    <ellipse cx="60" cy="92" rx="28" ry="2" fill="rgba(0,0,0,0.08)"/>
  </svg>
)

const CalendarIllustration = () => (
  <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    {/* calendar body */}
    <rect x="14" y="14" width="92" height="72" rx="3" fill="rgba(212,140,58,0.1)" stroke="rgba(212,140,58,0.4)" strokeWidth="1.5"/>
    {/* header bar */}
    <rect x="14" y="14" width="92" height="16" rx="3" fill="rgba(212,140,58,0.3)"/>
    <rect x="14" y="22" width="92" height="8" fill="rgba(212,140,58,0.3)"/>
    {/* binding rings */}
    <circle cx="34" cy="14" r="4" fill="none" stroke="rgba(212,140,58,0.6)" strokeWidth="2"/>
    <circle cx="60" cy="14" r="4" fill="none" stroke="rgba(212,140,58,0.6)" strokeWidth="2"/>
    <circle cx="86" cy="14" r="4" fill="none" stroke="rgba(212,140,58,0.6)" strokeWidth="2"/>
    {/* month label area */}
    <line x1="22" y1="17" x2="50" y2="17" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="21" x2="40" y2="21" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round"/>
    {/* photo strip at top of content */}
    <rect x="18" y="32" width="84" height="24" rx="1.5" fill="rgba(212,140,58,0.2)"/>
    <circle cx="32" cy="42" r="5" fill="rgba(212,140,58,0.4)"/>
    <polyline points="18,52 30,42 40,48 54,36 70,44 84,38 102,44 102,56 18,56" fill="rgba(212,140,58,0.25)" stroke="none"/>
    {/* date grid */}
    {[0, 1, 2, 3, 4, 5, 6].map(col => (
      <line key={col} x1={18 + col * 12} y1="60" x2={18 + col * 12} y2="82" stroke="rgba(212,140,58,0.1)" strokeWidth="0.5"/>
    ))}
    {[0, 1, 2, 3].map(row => (
      <line key={row} x1="18" y1={60 + row * 6} x2="102" y2={60 + row * 6} stroke="rgba(212,140,58,0.1)" strokeWidth="0.5"/>
    ))}
    {/* date numbers */}
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n, i) => {
      const col = i % 7
      const row = Math.floor(i / 7)
      return (
        <text key={n} x={22 + col * 12} y={65 + row * 6} fill="rgba(212,140,58,0.4)" fontSize="4" fontFamily="sans-serif" textAnchor="middle">
          {n}
        </text>
      )
    })}
    {/* highlighted date */}
    <circle cx="46" cy="63" r="3.5" fill="rgba(212,140,58,0.5)"/>
    <text x="46" y="64.5" fill="white" fontSize="4" fontFamily="sans-serif" textAnchor="middle">8</text>
    <ellipse cx="60" cy="88" rx="34" ry="2.5" fill="rgba(0,0,0,0.1)"/>
  </svg>
)

// ── Product Category Data ────────────────────────────────────────────────────

type ProductCategory = {
  id: string
  name: string
  tagline: string
  illustration: React.ReactNode
  badge?: string
  badgeColor?: string
  canvasW: number
  canvasH: number
  section: string
  defaultPages: number
}

const CATEGORIES: ProductCategory[] = [
  // Print Products
  {
    id: 'photo-book',
    name: 'Photo Book',
    tagline: 'Multi-page albums, print-ready',
    illustration: <PhotoBookIllustration />,
    badge: 'Popular',
    badgeColor: '#d48c3a',
    canvasW: 800,
    canvasH: 600,
    section: 'Print Products',
    defaultPages: 8,
  },
  {
    id: 'photo-cards',
    name: 'Photo Cards',
    tagline: 'Greeting cards & postcards',
    illustration: <PhotoCardsIllustration />,
    canvasW: 600,
    canvasH: 800,
    section: 'Print Products',
    defaultPages: 1,
  },
  {
    id: 'wall-art',
    name: 'Wall Art',
    tagline: 'Canvas prints & art posters',
    illustration: <WallArtIllustration />,
    badge: 'Trending',
    badgeColor: '#6ba3d4',
    canvasW: 600,
    canvasH: 800,
    section: 'Print Products',
    defaultPages: 1,
  },
  {
    id: 'framed-photo',
    name: 'Framed Photo',
    tagline: 'Classic framed portraits',
    illustration: <FramedPhotoIllustration />,
    canvasW: 600,
    canvasH: 600,
    section: 'Print Products',
    defaultPages: 1,
  },
  {
    id: 'photo-strip',
    name: 'Photo Strip',
    tagline: '4-panel photobooth strips',
    illustration: <PhotoStripIllustration />,
    canvasW: 400,
    canvasH: 1200,
    section: 'Print Products',
    defaultPages: 1,
  },
  // Digital & Social
  {
    id: 'edited-photo',
    name: 'Edited Photo',
    tagline: 'Enhance with overlays & text',
    illustration: <EditedPhotoIllustration />,
    badge: 'AI Enhanced',
    badgeColor: '#d48c3a',
    canvasW: 800,
    canvasH: 800,
    section: 'Digital & Social',
    defaultPages: 1,
  },
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    tagline: 'Square & story formats',
    illustration: <InstagramIllustration />,
    canvasW: 800,
    canvasH: 800,
    section: 'Digital & Social',
    defaultPages: 1,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    tagline: 'Monthly photo calendars',
    illustration: <CalendarIllustration />,
    canvasW: 800,
    canvasH: 600,
    section: 'Personalised Gifts',
    defaultPages: 12,
  },
]

const SECTIONS = ['Print Products', 'Digital & Social', 'Personalised Gifts']

// ── Section separator label ──────────────────────────────────────────────────
function SectionLabel({ label, index }: { label: string; index: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        marginTop: index > 0 ? '56px' : '0',
        opacity: 0,
        animation: `fadeUp 500ms ${200 + index * 80}ms cubic-bezier(0.4,0,0.2,1) forwards`,
      }}
    >
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  category,
  index,
  onClick,
  loading,
}: {
  category: ProductCategory
  index: number
  onClick: () => void
  loading: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        border: `1.5px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: loading ? 'wait' : 'pointer',
        transform: pressed
          ? 'translateY(0px) scale(0.98)'
          : hovered
          ? 'translateY(-6px) scale(1.01)'
          : 'translateY(0px) scale(1)',
        boxShadow: hovered
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,140,58,0.15), 0 0 32px rgba(212,140,58,0.12)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 280ms ease, border-color 200ms ease',
        opacity: 0,
        animation: `fadeUp 480ms ${300 + index * 60}ms cubic-bezier(0.4,0,0.2,1) forwards`,
      }}
    >
      {/* Badge */}
      {category.badge && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          background: category.badgeColor === '#d48c3a'
            ? 'rgba(212,140,58,0.15)'
            : 'rgba(107,163,212,0.15)',
          border: `1px solid ${category.badgeColor === '#d48c3a'
            ? 'rgba(212,140,58,0.4)'
            : 'rgba(107,163,212,0.4)'}`,
          borderRadius: '999px',
          padding: '3px 9px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: category.badgeColor,
          fontFamily: 'var(--font-body)',
        }}>
          {category.badge}
        </div>
      )}

      {/* Illustration area */}
      <div style={{
        height: '160px',
        background: hovered
          ? 'linear-gradient(135deg, rgba(212,140,58,0.1) 0%, rgba(168,108,40,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(212,140,58,0.06) 0%, rgba(168,108,40,0.03) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transition: 'background 300ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(212,140,58,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,140,58,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 300ms ease',
        }} />
        {/* Glow spot */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,140,58,0.18) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 300ms ease',
          pointerEvents: 'none',
        }} />
        <div style={{
          width: '100px',
          height: '100px',
          flexShrink: 0,
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 400ms cubic-bezier(0.34,1.56,0.64,1)',
          filter: hovered ? 'drop-shadow(0 4px 12px rgba(212,140,58,0.25))' : 'none',
        }}>
          {category.illustration}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px 20px' }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '19px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '5px',
          lineHeight: 1.2,
          letterSpacing: '0.01em',
        }}>
          {category.name}
        </h3>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: '18px',
          fontFamily: 'var(--font-body)',
        }}>
          {category.tagline}
        </p>

        {/* CTA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}>
            {category.canvasW} × {category.canvasH}px
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: hovered ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            transition: 'color 200ms ease',
          }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--accent)' }} />
                Creating…
              </>
            ) : (
              <>
                Start creating
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{
                    transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 200ms ease',
                  }}
                >
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hover shine sweep */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(105deg, transparent 40%, rgba(212,140,58,0.04) 50%, transparent 60%)',
        transform: hovered ? 'translateX(100%)' : 'translateX(-100%)',
        transition: 'transform 600ms ease',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Auth guard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
    })
    setMounted(true)
  }, [router])

  async function handleCategoryClick(category: ProductCategory) {
    if (loadingId) return
    setLoadingId(category.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Build initial pages based on category
      const pages = Array.from({ length: Math.min(category.defaultPages, 8) }, (_, i) => ({
        id: crypto.randomUUID(),
        background: '#0f0f0f',
        elements: [],
      }))

      const { data, error } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: `Untitled ${category.name}`,
          pages,
          cover_url: null,
        })
        .select()
        .single()

      if (error) throw error
      if (data) router.push(`/album/${data.id}/edit`)
    } catch (err) {
      console.error('Failed to create album:', err)
      setLoadingId(null)
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}>

        {/* ── Topbar ── */}
        <header style={{
          height: '60px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          opacity: 0,
          animation: 'fadeIn 300ms 100ms ease forwards',
        }}>
          {/* Back */}
          <button
            className="btn btn-icon"
            onClick={() => router.push('/dashboard')}
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeftIcon />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px',
              background: 'var(--accent)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
                <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
                <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
            }}>
              Folio
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <button
            className="btn btn-icon"
            onClick={toggle}
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        {/* ── Main Content ── */}
        <main style={{
          maxWidth: '1160px',
          margin: '0 auto',
          padding: '60px 28px 80px',
        }}>

          {/* ── Hero text ── */}
          <div style={{
            textAlign: 'center',
            marginBottom: '64px',
            opacity: 0,
            animation: 'fadeUp 500ms 150ms cubic-bezier(0.4,0,0.2,1) forwards',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-muted)',
              border: '1px solid rgba(212,140,58,0.25)',
              borderRadius: '999px',
              padding: '5px 14px',
              marginBottom: '20px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontFamily: 'var(--font-body)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
              </svg>
              Choose your product
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(36px, 5vw, 60px)',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              marginBottom: '14px',
            }}>
              What would you like to{' '}
              <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>
                create?
              </em>
            </h1>

            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              margin: '0 auto',
              lineHeight: 1.7,
              fontFamily: 'var(--font-body)',
            }}>
              Pick a product type and we'll set up the perfect canvas. Use AI to generate a full layout, or build it yourself.
            </p>
          </div>

          {/* ── Sections + Cards ── */}
          {SECTIONS.map((section, sectionIdx) => {
            const sectionCategories = CATEGORIES.filter(c => c.section === section)
            if (sectionCategories.length === 0) return null

            // Calculate card animation index offset
            const prevCount = CATEGORIES.filter(c => {
              const sectionOrder = SECTIONS.indexOf(c.section)
              return sectionOrder < sectionIdx
            }).length

            return (
              <div key={section}>
                <SectionLabel label={section} index={sectionIdx} />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '18px',
                  marginBottom: '8px',
                }}>
                  {sectionCategories.map((category, i) => (
                    <ProductCard
                      key={category.id}
                      category={category}
                      index={prevCount + i}
                      onClick={() => handleCategoryClick(category)}
                      loading={loadingId === category.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* ── Bottom tip ── */}
          <div style={{
            textAlign: 'center',
            marginTop: '56px',
            opacity: 0,
            animation: 'fadeUp 500ms 800ms cubic-bezier(0.4,0,0.2,1) forwards',
          }}>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.6,
            }}>
              Not sure where to start?{' '}
              <button
                onClick={() => handleCategoryClick(CATEGORIES[0])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                Try a Photo Book
              </button>
              {' '}— our most popular format.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
