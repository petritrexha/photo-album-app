'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

// ── Icons (inline SVG to avoid package overhead) ──────────────────
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
  </svg>
)

// ── Friendly error message helper ─────────────────────────────────
function friendlyAuthError(err: any): string {
  const msg: string = err?.message || err?.error_description || String(err) || ''
  const status: number = err?.status || err?.code || 0

  // Rate limit errors (Supabase returns 429 with various messages)
  if (
    status === 429 ||
    msg.toLowerCase().includes('rate limit') ||
    msg.toLowerCase().includes('too many') ||
    msg.toLowerCase().includes('over_email_send_rate_limit') ||
    msg.toLowerCase().includes('over_request_rate_limit') ||
    msg.toLowerCase().includes('limit reached') ||
    msg.toLowerCase().includes('for security purposes')
  ) {
    return 'Too many attempts — please wait 60 seconds and try again. This is a Supabase security limit.'
  }

  // Email not confirmed
  if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
    return 'Please check your inbox and confirm your email before signing in.'
  }

  // Invalid credentials
  if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.'
  }

  // User already exists
  if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }

  // Password too short
  if (msg.toLowerCase().includes('password should be')) {
    return 'Password must be at least 6 characters long.'
  }

  return msg || 'Something went wrong. Please try again.'
}

// ── Auth Modal ────────────────────────────────────────────────────
function AuthModal({
  mode, onClose, onSwitch
}: {
  mode: 'login' | 'signup'
  onClose: () => void
  onSwitch: (m: 'login' | 'signup') => void
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for rate limit messaging
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (countdown > 0) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/home')
      }
    } catch (err: any) {
      const friendly = friendlyAuthError(err)
      setError(friendly)
      // Start a 60-second countdown for rate-limit errors
      if (
        err?.status === 429 ||
        friendly.includes('wait 60 seconds') ||
        friendly.includes('security limit')
      ) {
        setCountdown(60)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="overlay animate-fade-in"
      onClick={onClose}
      style={{ zIndex: 200 }}
    >
      <div
        className="animate-scale-in"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            width: '44px',
            height: '44px',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-lg)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="var(--accent)" opacity="0.8"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="var(--accent)"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="var(--accent)" opacity="0.6"/>
              <rect x="3" y="16" width="8" height="5" rx="1.5" fill="var(--accent)" opacity="0.5"/>
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            color: 'var(--text-primary)',
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {mode === 'login' ? 'Sign in to your Folio account' : 'Start building beautiful albums'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-muted)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--danger)',
              lineHeight: 1.5,
            }}>
              {error}
              {countdown > 0 && (
                <div style={{ marginTop: '6px', fontWeight: 600 }}>
                  Retry in {countdown}s…
                </div>
              )}
            </div>
          )}
          {success && (
            <div style={{
              background: 'var(--success-muted)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.5,
            }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}><CheckIcon /></span>
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || countdown > 0}
            style={{ marginTop: '4px', height: '42px', fontSize: '14px' }}
          >
            {loading ? <span className="spinner" /> : (
              countdown > 0
                ? `Wait ${countdown}s…`
                : mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button
            onClick={() => { onSwitch(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Mock preview cards (decorative) ──────────────────────────────
const PREVIEW_CARDS = [
  { bg: '#1a1208', accent: '#d4a853', rotation: -4, delay: 0 },
  { bg: '#0d1a2a', accent: '#6ba3d4', rotation: 2, delay: 100 },
  { bg: '#1a0d0d', accent: '#d46a6a', rotation: -1.5, delay: 200 },
]

function PreviewCard({ bg, accent, rotation, delay }: typeof PREVIEW_CARDS[0]) {
  return (
    <div
      className="animate-fade-up"
      style={{
        animationDelay: `${delay + 500}ms`,
        background: bg,
        borderRadius: '10px',
        border: `1px solid ${accent}22`,
        padding: '0',
        width: '160px',
        height: '120px',
        transform: `rotate(${rotation}deg)`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}11`,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ background: `${accent}33`, borderRadius: '4px', height: '60px' }} />
        <div style={{ background: `${accent}22`, borderRadius: '3px', height: '10px', width: '70%' }} />
        <div style={{ background: `${accent}14`, borderRadius: '3px', height: '8px', width: '45%' }} />
      </div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────
export default function HomePage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return
      heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    {
      icon: '✦',
      title: 'Full AI Generation',
      desc: 'Describe your style in plain language. Claude designs every page — layouts, fonts, backgrounds, captions — in seconds.',
    },
    {
      icon: '⊞',
      title: 'Template Library',
      desc: 'Wedding, travel, baby, birthday, minimal. Start from a professionally designed template and make it yours.',
    },
    {
      icon: '◈',
      title: 'Canvas Editor',
      desc: 'Drag, drop, resize, rotate. Layer photos with text overlays, custom frames, and decorative elements.',
    },
    {
      icon: '⬡',
      title: 'AI Refinement',
      desc: 'Tell Claude to restyle your album — change colors, rewrite captions, update fonts — without touching your photo layout.',
    },
    {
      icon: '▤',
      title: 'Print-Ready PDF',
      desc: 'Export at 2× resolution with optional bleed margins. A4 landscape, portrait, or square formats.',
    },
    {
      icon: '◭',
      title: 'Custom Frames & Overlays',
      desc: 'Upload your own PNG overlays — borders, decorative stickers, watermarks — and layer them on any photo.',
    },
  ]

  const modes = [
    {
      num: '01',
      tag: 'Hands-free',
      title: 'Let AI do everything',
      desc: 'Upload photos, describe the mood. Claude designs every page — layouts, typography, color palette, captions.',
    },
    {
      num: '02',
      tag: 'Hybrid',
      title: 'Start smart, finish your way',
      desc: 'AI generates a complete first draft. You refine, rearrange, add your personal touch, and refine again.',
    },
    {
      num: '03',
      tag: 'Full control',
      title: 'Build every detail yourself',
      desc: 'A professional canvas editor. Drag-and-drop photos, add text, layer frames, control every pixel.',
    },
  ]

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Navigation ── */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 40px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled
          ? `rgba(${theme === 'dark' ? '9,9,11' : '250,248,244'}, 0.88)`
          : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'var(--accent)',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: 'var(--text-primary)',
          }}>
            Folio
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how" className="nav-link">How it works</a>
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 8px' }} />
          <button onClick={toggle} className="btn btn-icon" aria-label="Toggle theme" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={() => setAuthMode('login')} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in
          </button>
          <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-sm">
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div ref={heroRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '10%',
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(212,140,58,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '8%',
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(212,140,58,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
        </div>

        <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-muted)',
            border: '1px solid rgba(212, 140, 58, 0.25)',
            borderRadius: 'var(--radius-full)',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.04em',
          }}>
            <SparkleIcon />
            AI-powered album design
          </div>
        </div>

        <h1 className="animate-fade-up delay-100" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 9vw, 108px)',
          fontWeight: 400,
          lineHeight: 1.0,
          letterSpacing: '-0.01em',
          textAlign: 'center',
          marginBottom: '24px',
          color: 'var(--text-primary)',
          maxWidth: '900px',
        }}>
          Your memories,{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>
            beautifully arranged.
          </em>
        </h1>

        <p className="animate-fade-up delay-200" style={{
          fontSize: '17px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: '520px',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          Upload photos. Let AI design your album with the exact style and mood you describe.
          Export as a print-ready PDF or order physical copies.
        </p>

        <div className="animate-fade-up delay-300" style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '80px',
        }}>
          <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-xl" style={{ gap: '10px' }}>
            Create your first album <ArrowRight />
          </button>
          <button onClick={() => setAuthMode('login')} className="btn btn-secondary btn-xl">
            Sign in
          </button>
        </div>

        <div className="animate-fade-up delay-400" style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {PREVIEW_CARDS.map((card, i) => (
            <PreviewCard key={i} {...card} delay={i * 80} />
          ))}
        </div>

        <div className="animate-fade-in delay-500" style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span>Scroll</span>
          <div style={{ width: '1px', height: '32px', background: 'linear-gradient(to bottom, var(--text-muted), transparent)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '100px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
            What you get
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            Everything you need to create a{' '}
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>beautiful album</em>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {features.map((f, i) => (
            <div key={f.title} className="feature-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div style={{ fontSize: '22px', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '100px 40px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
              Three ways to create
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Your workflow, your choice
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {modes.map((m, i) => (
              <div
                key={m.num}
                style={{
                  display: 'flex', gap: '40px', padding: '36px 40px',
                  background: 'var(--bg-surface)',
                  borderRadius: i === 0 ? 'var(--radius-xl) var(--radius-xl) 0 0' : i === modes.length - 1 ? '0 0 var(--radius-xl) var(--radius-xl)' : '0',
                  border: '1px solid var(--border)',
                  borderTop: i > 0 ? 'none' : '1px solid var(--border)',
                  alignItems: 'flex-start',
                  transition: 'background var(--transition-base)',
                  cursor: 'default',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 300, color: 'var(--text-ghost)', lineHeight: 1, flexShrink: 0, width: '80px' }}>{m.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>{m.tag}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>{m.title}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '540px' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 40px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.05, marginBottom: '24px' }}>
          Ready to preserve your{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>best moments?</em>
        </h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '440px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          Free to start. AI-designed albums in minutes.
        </p>
        <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-xl" style={{ gap: '10px' }}>
          Start your first album <ArrowRight />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Folio</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>© {new Date().getFullYear()} · Built with Claude</span>
      </footer>

      {/* ── Auth Modal ── */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitch={setAuthMode}
        />
      )}
    </main>
  )
}
