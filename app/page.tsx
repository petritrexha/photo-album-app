'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useLang } from '@/lib/language-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// ── Icons ──────────────────────────────────────────────────────────
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

// ── Friendly auth errors ──────────────────────────────────────────
function friendlyAuthError(err: any, t: (k: string) => string): string {
  const msg: string = err?.message || err?.error_description || String(err) || ''
  const status: number = err?.status || err?.code || 0
  if (status === 429 || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('over_email_send_rate_limit') || msg.toLowerCase().includes('for security purposes')) return t('auth.too_many')
  if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) return t('auth.confirm_email')
  if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) return t('auth.invalid_login')
  if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) return t('auth.already_exists')
  if (msg.toLowerCase().includes('password should be')) return t('auth.password_short')
  return msg || t('auth.generic_error')
}

// ── Auth Modal ────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSwitch }: { mode: 'login' | 'signup'; onClose: () => void; onSwitch: (m: 'login' | 'signup') => void }) {
  const router = useRouter()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (countdown > 0) return
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess(t('auth.check_email'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/home')
      }
    } catch (err: any) {
      const friendly = friendlyAuthError(err, t)
      setError(friendly)
      if (err?.status === 429 || friendly.includes('60')) setCountdown(60)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: 'clamp(24px,5vw,40px) clamp(20px,5vw,36px)' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', width: '44px', height: '44px', background: 'var(--accent-muted)', borderRadius: 'var(--radius-lg)', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="var(--accent)" opacity="0.8"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="var(--accent)"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="var(--accent)" opacity="0.6"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,5vw,26px)', fontWeight: 500, letterSpacing: '0.01em', color: 'var(--text-primary)' }}>
            {mode === 'login' ? t('auth.welcome_back') : t('auth.create_account')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {mode === 'login' ? t('auth.sign_in_desc') : t('auth.sign_up_desc')}
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && (
            <div style={{ background: 'var(--danger-muted)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '13px', color: 'var(--danger)', lineHeight: 1.5 }}>
              {error}
              {countdown > 0 && <div style={{ marginTop: '6px', fontWeight: 600 }}>{t('auth.retry_in')} {countdown}{t('auth.seconds')}</div>}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--success-muted)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}><CheckIcon /></span>
              {success}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading || countdown > 0} style={{ marginTop: '4px', height: '44px', fontSize: '14px' }}>
            {loading ? <span className="spinner" /> : countdown > 0 ? `${t('auth.wait')} ${countdown}${t('auth.seconds')}` : mode === 'login' ? t('auth.sign_in') : t('auth.sign_up')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}{' '}
          <button onClick={() => { onSwitch(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
            {mode === 'login' ? t('auth.sign_up') : t('auth.sign_in')}
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Preview cards ─────────────────────────────────────────────────
const PREVIEW_CARDS = [
  { bg: '#1a1208', accent: '#c8842e', rotation: -4, delay: 0 },
  { bg: '#0d1a2a', accent: '#6ba3d4', rotation: 2, delay: 100 },
  { bg: '#1a0d0d', accent: '#d46a6a', rotation: -1.5, delay: 200 },
]
function PreviewCard({ bg, accent, rotation, delay }: typeof PREVIEW_CARDS[0]) {
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delay + 500}ms`, background: bg, borderRadius: '10px', border: `1px solid ${accent}22`, padding: '0', width: 'clamp(130px,18vw,160px)', height: 'clamp(96px,14vw,120px)', transform: `rotate(${rotation}deg)`, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent}11`, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
      <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ background: `${accent}33`, borderRadius: '4px', flex: 1 }} />
        <div style={{ background: `${accent}22`, borderRadius: '3px', height: '10px', width: '70%' }} />
        <div style={{ background: `${accent}14`, borderRadius: '3px', height: '8px', width: '45%' }} />
      </div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const { t } = useLang()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/home')
    })
  }, [router])

  const features = [
    { icon: '✦', titleKey: 'features.ai_gen', descKey: 'features.ai_gen_desc' },
    { icon: '⊞', titleKey: 'features.templates', descKey: 'features.templates_desc' },
    { icon: '◈', titleKey: 'features.canvas', descKey: 'features.canvas_desc' },
    { icon: '⬡', titleKey: 'features.refine', descKey: 'features.refine_desc' },
    { icon: '▤', titleKey: 'features.pdf', descKey: 'features.pdf_desc' },
    { icon: '◭', titleKey: 'features.frames', descKey: 'features.frames_desc' },
  ]

  const modes = [
    { num: '01', tagKey: 'how.mode1_tag', titleKey: 'how.mode1_title', descKey: 'how.mode1_desc' },
    { num: '02', tagKey: 'how.mode2_tag', titleKey: 'how.mode2_title', descKey: 'how.mode2_desc' },
    { num: '03', tagKey: 'how.mode3_tag', titleKey: 'how.mode3_title', descKey: 'how.mode3_desc' },
  ]

  return (
    <main style={{ background: 'transparent', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Navigation ── */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(16px,4vw,40px)', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? `rgba(${theme === 'dark' ? '8,8,9' : '250,247,242'}, 0.9)` : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease',
      }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--accent)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>Folio</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <a href="#features" className="nav-link" style={{ display: 'none' }}>{t('nav.features')}</a>
          <a href="#how" className="nav-link" style={{ display: 'none' }}>{t('nav.how_it_works')}</a>
          <button onClick={() => router.push('/about')} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'none' }}>{t('nav.about')}</button>
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 4px', display: 'none' }} />

          {/* Language switcher */}
          <LanguageSwitcher compact />

          <button onClick={toggle} className="btn btn-icon" aria-label="Toggle theme" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={() => setAuthMode('login')} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('nav.sign_in')}
          </button>
          <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-sm">
            {t('nav.get_started')}
          </button>
        </div>

        {/* Desktop nav links (show on larger screens) */}
        <style>{`
          @media(min-width:768px){
            nav a.nav-link, nav button.nav-link { display: inline-flex !important; }
            nav .nav-link + div { display: block !important; }
          }
        `}</style>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(100px,14vw,120px) clamp(16px,4vw,40px) clamp(60px,8vw,80px)', position: 'relative', overflow: 'hidden' }}>

        {/* Badge */}
        <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-muted)', border: '1px solid rgba(200, 132, 46, 0.25)', borderRadius: 'var(--radius-full)', padding: '5px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>
            <SparkleIcon />
            {t('hero.badge')}
          </div>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px,9vw,108px)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.01em', textAlign: 'center', marginBottom: '24px', color: 'var(--text-primary)', maxWidth: '900px' }}>
          {t('hero.headline_1')}{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>{t('hero.headline_2')}</em>
        </h1>

        <p className="animate-fade-up delay-200" style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '520px', lineHeight: 1.7, marginBottom: '40px' }}>
          {t('hero.subtitle')}
        </p>

        {/* CTAs */}
        <div className="landing-hero-actions animate-fade-up delay-300" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '80px' }}>
          <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-xl" style={{ gap: '10px', position: 'relative', overflow: 'hidden' }}>
            {t('hero.cta_primary')} <ArrowRight />
            <span style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-md)', border: '2px solid rgba(200,132,46,0.4)', animation: 'pulseRing 2.5s ease-out infinite', pointerEvents: 'none' }} />
          </button>
          <button onClick={() => setAuthMode('login')} className="btn btn-secondary btn-xl">
            {t('hero.cta_secondary')}
          </button>
        </div>

        {/* Preview cards */}
        <div className="animate-fade-up delay-400" style={{ display: 'flex', gap: 'clamp(12px,2vw,20px)', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {PREVIEW_CARDS.map((card, i) => <PreviewCard key={i} {...card} delay={i * 80} />)}
        </div>

        {/* Scroll indicator */}
        <div className="animate-fade-in delay-500" style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>{t('hero.scroll')}</span>
          <div style={{ width: '1px', height: '32px', background: 'linear-gradient(to bottom, var(--text-muted), transparent)' }} />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: 'clamp(60px,8vw,100px) clamp(16px,4vw,40px)', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,6vw,64px)' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>{t('features.badge')}</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,56px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {t('features.headline')}
          </h2>
        </div>
        <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {features.map((f) => (
            <div key={f.titleKey} className="feature-card">
              <div style={{ fontSize: '22px', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,2vw,22px)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>{t(f.titleKey)}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: 'clamp(60px,8vw,100px) clamp(16px,4vw,40px)', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,6vw,64px)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>{t('how.badge')}</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,56px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>{t('how.headline')}</h2>
          </div>
          <div className="landing-how-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {modes.map((m, i) => (
              <div key={m.num} className="landing-how-step" style={{ display: 'flex', gap: 'clamp(16px,4vw,40px)', padding: 'clamp(20px,3vw,36px) clamp(16px,4vw,40px)', background: 'var(--bg-surface)', borderRadius: i === 0 ? 'var(--radius-xl) var(--radius-xl) 0 0' : i === modes.length - 1 ? '0 0 var(--radius-xl) var(--radius-xl)' : '0', border: '1px solid var(--border)', borderTop: i > 0 ? 'none' : '1px solid var(--border)', alignItems: 'flex-start', transition: 'background var(--transition-base)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
              >
                <div className="landing-how-num" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,5vw,56px)', fontWeight: 300, color: 'var(--text-ghost)', lineHeight: 1, flexShrink: 0, width: '70px' }}>{m.num}</div>
                <div>
                  <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>{t(m.tagKey)}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>{t(m.titleKey)}</h3>
                  <p style={{ fontSize: 'clamp(13px,1.5vw,15px)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '540px' }}>{t(m.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: 'clamp(60px,8vw,120px) clamp(16px,4vw,40px)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,6vw,76px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.05, marginBottom: '24px' }}>
          {t('cta.headline_1')}{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>{t('cta.headline_2')}</em>
        </h2>
        <p style={{ fontSize: 'clamp(14px,2vw,16px)', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '440px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          {t('cta.subtitle')}
        </p>
        <button onClick={() => setAuthMode('signup')} className="btn btn-primary btn-xl" style={{ gap: '10px' }}>
          {t('hero.cta_primary')} <ArrowRight />
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer" style={{ borderTop: '1px solid var(--border)', padding: 'clamp(16px,3vw,28px) clamp(16px,4vw,40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Folio</span>
        </button>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => router.push('/about')} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >{t('nav.about')}</button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🇽🇰 {t('footer.made_in')} · © {new Date().getFullYear()} · {t('footer.built_with')}</span>
          <LanguageSwitcher compact />
        </div>
      </footer>

      {/* ── Auth Modal ── */}
      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />
      )}
    </main>
  )
}
