'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

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
const SignOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)

function Step({ num, icon, title, body, delay }: { num: string; icon: React.ReactNode; title: string; body: string; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'rgba(212,140,58,0.3)' : 'var(--border)'}`,
        borderRadius: '16px', padding: '28px 26px',
        transition: 'background 220ms ease, border-color 220ms ease, transform 280ms cubic-bezier(0.34,1.56,0.64,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        opacity: 0,
        animation: `wu-fadeUp 500ms ${delay}ms cubic-bezier(0.4,0,0.2,1) forwards`,
      }}
    >
      <div style={{ position: 'absolute', top: '12px', right: '18px', fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 600, color: 'rgba(212,140,58,0.06)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{num}</div>
      <div style={{ width: '44px', height: '44px', background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', color: 'var(--accent)', transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1)' }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.2 }}>{title}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, fontFamily: 'var(--font-body)' }}>{body}</p>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [userEmail, setUserEmail] = useState('')
  const [albumCount, setAlbumCount] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUserEmail(session.user.email || '')
      const { count } = await supabase.from('albums').select('*', { count: 'exact', head: true })
      setAlbumCount(count ?? 0)
      setMounted(true)
    })
  }, [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const firstName = userEmail.split('@')[0].split(/[._-]/)[0].replace(/\b\w/g, c => c.toUpperCase())
  const isReturning = albumCount !== null && albumCount > 0

  if (!mounted) return null

  return (
    <>
      <style>{`
        @keyframes wu-fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wu-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wu-pulse-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.55); opacity: 0; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

        {/* ── Topbar ── */}
        <header style={{
          height: '58px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px',
          position: 'sticky', top: 0, zIndex: 20,
          opacity: 0, animation: 'wu-fadeIn 300ms 50ms ease forwards',
        }}>

          {/* ── Logo — clicking goes back to landing page ── */}
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '8px',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            title="Go to home page"
          >
            <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
                <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
                <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              Folio
            </span>
          </button>

          <div style={{ flex: 1 }} />
          <button className="btn btn-icon" onClick={toggle} style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ gap: '6px', color: 'var(--text-secondary)' }}>
            <SignOutIcon /> Sign out
          </button>
        </header>

        {/* ── Main ── */}
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '72px 28px 100px' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '80px', opacity: 0, animation: 'wu-fadeUp 550ms 100ms cubic-bezier(0.4,0,0.2,1) forwards' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.22)', borderRadius: '999px', padding: '6px 16px', marginBottom: '28px', fontSize: '13px', fontWeight: 500, color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
              <span style={{ fontSize: '15px' }}>{isReturning ? '👋' : '✨'}</span>
              {isReturning ? `Welcome back, ${firstName}` : `Welcome to Folio, ${firstName}`}
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 72px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.0, letterSpacing: '-0.015em', marginBottom: '20px' }}>
              {isReturning ? (<>Your memories,{' '}<br /><em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>ready to continue.</em></>) : (<>Turn photos into{' '}<br /><em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>beautiful products.</em></>)}
            </h1>

            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 44px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
              {isReturning ? `You have ${albumCount} project${albumCount !== 1 ? 's' : ''} saved. Pick up where you left off, or start something new.` : 'Upload photos, describe a style, and let AI design your album — or build it yourself with our canvas editor.'}
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Primary CTA */}
              <button onClick={() => router.push('/create')} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: '14px', padding: '16px 32px', fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 8px 32px rgba(212,140,58,0.3), 0 2px 8px rgba(212,140,58,0.2)', transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(212,140,58,0.4), 0 4px 16px rgba(212,140,58,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(212,140,58,0.3), 0 2px 8px rgba(212,140,58,0.2)' }}
              >
                <span style={{ position: 'absolute', inset: 0, borderRadius: '14px', border: '2px solid rgba(212,140,58,0.5)', animation: 'wu-pulse-ring 2s ease-out infinite', pointerEvents: 'none' }} />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                Start a new project
                <ArrowRightIcon />
              </button>

              {/* Secondary CTA */}
              {isReturning ? (
                <button onClick={() => router.push('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px 28px', fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), border-color 200ms ease, background 200ms ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,140,58,0.4)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
                >
                  <GridIcon />
                  My projects
                  <span style={{ background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: '999px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                    {albumCount}
                  </span>
                </button>
              ) : (
                <button onClick={() => router.push('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px 28px', fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'border-color 200ms, color 200ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,140,58,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                >
                  <GridIcon />
                  My projects
                </button>
              )}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px', fontFamily: 'var(--font-body)' }}>
              Scroll for a quick tour — or just dive in ↑
            </p>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px', opacity: 0, animation: 'wu-fadeUp 400ms 500ms ease forwards' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>How it works</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '72px' }}>
            <Step num="1" delay={520} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>} title="Pick your product" body="Choose from Photo Books, Wall Art, Cards, Calendars and more. Each format has the right canvas and tools ready to go." />
            <Step num="2" delay={600} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>} title="Upload your photos" body="Drag and drop photos onto your canvas, or upload a batch and let AI arrange them into a layout that fits the mood you describe." />
            <Step num="3" delay={680} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>} title="Let AI design it" body='Hit "AI Layout" and describe a style — dark moody, warm vintage, minimal Japanese. Claude designs every page: backgrounds, fonts, captions.' />
            <Step num="4" delay={760} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} title="Export or print" body="Download a print-ready PDF in A4 or square format. Or tweak and restyle as many times as you like — nothing is permanent until you say so." />
          </div>

          {/* Tips */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0, animation: 'wu-fadeUp 500ms 900ms cubic-bezier(0.4,0,0.2,1) forwards' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>Quick tips</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 32px' }}>
              {[
                { key: '⌘S', label: 'Save your work anytime' },
                { key: '⌘Z', label: 'Undo the last change' },
                { key: 'Del', label: 'Remove selected element' },
                { key: 'Drag', label: 'Drop photos onto the canvas' },
                { key: 'AI Layout', label: 'Generate a full design with a prompt' },
                { key: 'AI Restyle', label: 'Change colours & fonts, keep your layout' },
              ].map(tip => (
                <div key={tip.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>{tip.key}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{tip.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ textAlign: 'center', marginTop: '64px', opacity: 0, animation: 'wu-fadeUp 500ms 1000ms cubic-bezier(0.4,0,0.2,1) forwards' }}>
            <button onClick={() => router.push('/create')} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease', boxShadow: '0 4px 20px rgba(212,140,58,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(212,140,58,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(212,140,58,0.25)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
              Start creating
              <ArrowRightIcon />
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
