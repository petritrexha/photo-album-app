'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
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

// ── Section fade-in hook ──────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() }}, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 700ms ${delay}ms cubic-bezier(0.4,0,0.2,1), transform 700ms ${delay}ms cubic-bezier(0.4,0,0.2,1)`,
    }}>
      {children}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────
function Stat({ number, label, sub }: { number: string; label: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 300, color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {number}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-body)' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>{sub}</div>}
    </div>
  )
}

// ── Timeline item ─────────────────────────────────────────────────
function TimelineItem({ year, title, body, isLast = false }: { year: string; title: string; body: string; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '32px', position: 'relative' }}>
      {/* Line */}
      {!isLast && (
        <div style={{ position: 'absolute', left: '20px', top: '40px', width: '1px', bottom: '-40px', background: 'var(--border)' }} />
      )}
      {/* Circle */}
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-muted)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{year.slice(-2)}</span>
      </div>
      <div style={{ paddingBottom: isLast ? 0 : '40px', flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '6px', fontFamily: 'var(--font-body)' }}>{year}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.2 }}>{title}</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>{body}</p>
      </div>
    </div>
  )
}

// ── Value card ────────────────────────────────────────────────────
function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'rgba(212,140,58,0.3)' : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '28px',
        transition: 'all 250ms ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>{body}</p>
    </div>
  )
}

// ── Tech badge ────────────────────────────────────────────────────
function TechBadge({ name, role }: { name: string; role: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{name}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{role}</div>
      </div>
    </div>
  )
}

// ── How it works step ─────────────────────────────────────────────
function HowStep({ num, title, body, detail }: { num: string; title: string; body: string; detail: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '28px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 300, color: 'var(--text-ghost)', lineHeight: 1, flexShrink: 0, width: '60px' }}>{num}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font-body)', marginBottom: '12px' }}>{body}</p>
          <button
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {open ? '− Less detail' : '+ Technical detail'}
          </button>
          {open && (
            <div style={{ marginTop: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '2px solid var(--accent)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
              {detail}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function AboutPage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        background: scrolled ? `rgba(${theme === 'dark' ? '9,9,11' : '250,248,244'}, 0.88)` : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease',
      }}>
        {/* Logo */}
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
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'color 150ms, background 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
          >Home</button>
          <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'color 150ms, background 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
          >Pricing</button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', padding: '6px 10px', fontFamily: 'var(--font-body)' }}>About</span>
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 8px' }} />
          <button onClick={toggle} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'var(--accent)', border: 'none', color: '#0a0a0a', fontSize: '13px', fontWeight: 600, padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'transform 150ms' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
          >Open app</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: '72vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 40px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(212,140,58,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212,140,58,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ opacity: 0, animation: 'fadeUp 600ms 100ms cubic-bezier(0.4,0,0.2,1) forwards' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.25)', borderRadius: '999px', padding: '5px 16px', marginBottom: '24px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
            🇽🇰 Made in Kosovo
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 100px)', fontWeight: 400, lineHeight: 0.95, letterSpacing: '-0.015em', marginBottom: '24px', color: 'var(--text-primary)' }}>
            We believe your<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>memories deserve better.</em>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 48px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
            Folio started with a simple observation: photos rot in camera rolls. We built the tools to turn them into something lasting — powered by AI, designed for humans.
          </p>
          <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'transform 200ms' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
          >
            Start creating →
          </button>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '48px 40px' }}>
        <FadeSection>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '40px' }}>
            <Stat number="8" label="Product types" sub="Photo books, cards, wall art, and more" />
            <Stat number="3" label="AI tiers" sub="From instant suggestions to full generation" />
            <Stat number="300" label="DPI export" sub="Print-ready quality, every time" />
            <Stat number="1" label="Mission" sub="Make memories last, beautifully" />
          </div>
        </FadeSection>
      </section>

      {/* ── Who we are ── */}
      <section style={{ padding: '100px 40px', maxWidth: '800px', margin: '0 auto' }}>
        <FadeSection>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>Who we are</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '32px' }}>
            A small team in Pristina building at the intersection of{' '}
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>AI and human creativity.</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.8, fontFamily: 'var(--font-body)' }}>
            <p>
              Folio was built in Kosovo because we believe world-class software products can come from anywhere. Kosovo has one of the youngest, most ambitious tech communities in Europe — and we are part of that story.
            </p>
            <p>
              We are designers and engineers who got tired of watching people pay expensive studios for something a well-designed tool could do in minutes. Not because we want to replace the craft of design — but because most people creating photo books, cards, and wall art are not professional designers. They are parents, couples, travellers, and friends who just want the result to be beautiful.
            </p>
            <p>
              Folio is our answer to that. An AI co-creator that understands composition, typography, and mood — guided entirely by you.
            </p>
          </div>
        </FadeSection>
      </section>

      {/* ── What we do ── */}
      <section style={{ padding: '80px 40px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>What we do</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                Three ways to preserve your memories
              </h2>
            </div>
          </FadeSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {[
              {
                icon: '✦',
                title: 'Self-serve creation',
                body: 'Give anyone — regardless of design experience — professional-quality results. Upload photos, describe a mood, and watch Claude design your album. Subscribers get unlimited access with a generous monthly AI quota.',
                tag: 'Subscription',
              },
              {
                icon: '◈',
                title: 'Done-for-you service',
                body: 'Sometimes you want a human touch. Send us your photos and tell us the occasion. Our team uses AI and editorial judgement to craft something truly personal. You approve the style, we handle the rest. Pay on delivery.',
                tag: 'Service',
              },
              {
                icon: '▤',
                title: 'Pay-per-export',
                body: 'Build completely for free using the full canvas editor — unlimited time, no subscription. When you are ready to export your creation as a print-ready PDF, pay a one-time fee. No surprises, no recurring charges.',
                tag: 'One-time',
              },
            ].map((card, i) => (
              <FadeSection key={card.title} delay={i * 80}>
                <div style={{ height: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.2)', borderRadius: '999px', padding: '3px 10px', marginBottom: '20px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
                    {card.tag}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--accent)', marginBottom: '12px' }}>{card.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>{card.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>{card.body}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How we do it ── */}
      <section style={{ padding: '100px 40px', maxWidth: '800px', margin: '0 auto' }}>
        <FadeSection>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>How we do it</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '56px' }}>
            The technical foundation behind every product
          </h2>
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="01"
            title="You upload, we analyse"
            body="Photos are uploaded directly to Cloudinary, our CDN partner. Each image is stored with its exact dimensions and a unique ID. Nothing is altered at upload time — your original files are preserved exactly."
            detail={`Upload flow: File → XHR request with progress events → Cloudinary unsigned preset → returns { secure_url, width, height, public_id } → stored in Supabase photos table with album_id foreign key. Cross-origin headers set via Cloudinary upload params so react-konva can render them on the HTML canvas without CORS errors.`}
          />
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="02"
            title="AI designs with three-tier precision"
            body="Not every AI job needs the most powerful model. We route each task to the right model at the right cost. Instant caption suggestions use Claude Haiku at fractions of a cent. Full album generation uses a more capable model, counted against your monthly quota."
            detail={`Tier 1 (free, unlimited): claude-haiku-4-5-20251001 — caption suggestions, colour matching, font pairing, quick layout feedback. Runs client-side triggered, no quota deducted.\n\nTier 2 (session): claude-haiku-4-5 — full restyle, batch captions, per-page generation. Counted against plan quota.\n\nTier 3 (full generation): claude-sonnet-4-6 or haiku — complete multi-page album layout from scratch. Free=3/month, Pro=50/month, Studio=unlimited. Every call logged to ai_usage table for enforcement.`}
          />
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="03"
            title="The canvas editor renders in real time"
            body="Every element you see — photos, text, frames — lives in a Konva.js stage. Konva renders to an HTML canvas, giving us pixel-perfect positioning, rotation, scaling, and layer ordering at 60fps. Zustand manages all state with a 20-step undo history."
            detail={`Architecture: Zustand store holds Album (pages array), Photos[], Frames[], selectedElementId, currentPageIndex. Each Page has background: string and elements: PageElement[]. Elements are typed: 'image' | 'text' | 'frame'. Konva Stage is scaled responsively via ResizeObserver — the logical canvas (e.g. 800×600) scales down to fit the viewport, but all coordinates are stored at full resolution. This means AI-generated coordinates match exactly what renders.`}
          />
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="04"
            title="Prompts become JSON, JSON becomes pages"
            body="When you hit AI Layout, your style description travels to our API route. Claude receives a detailed system prompt about the canvas dimensions, design rules, and your specific product type (a photo book has different layout rules than a photo strip). It returns pure JSON — we validate it, map photo IDs to URLs, then replace your pages with the result."
            detail={`System prompt includes: canvas dimensions (canvasW×canvasH), margin, font options, layout variation rules (single hero / two-column / three-grid / full-bleed / collage), background colour guidance, and the category-specific aiPromptHint from lib/categoryConfig.ts. Claude returns: { pages: [{ id, background, elements: [{ type, x, y, width, height, rotation, ...textProps }] }] }. Response is stripped of markdown fences, JSON.parsed, validated with isValidLayout(), then photo __PLACEHOLDER__ URLs replaced with real Cloudinary URLs before committing to state.`}
          />
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="05"
            title="Export renders the canvas to PDF"
            body="When you export, html2canvas re-renders the Konva stage at 2× resolution — capturing every element including custom frames and text overlays. jsPDF assembles the pages into a print-ready document at your chosen format. Pro exports are 300dpi; free tier exports are 72dpi with a watermark baked in."
            detail={`Export flow: setCurrentPageIndex(i) → setTimeout 350ms (let Konva re-paint) → html2canvas(stageEl, { scale: 2, useCORS: true }) → canvas.toDataURL('image/jpeg', 0.95) → pdf.addImage(...). Page dimensions mapped: A4 landscape = 297×210mm, A4 portrait = 210×297mm, Square = 210×210mm. Optional 3mm bleed adds offset to image placement. Known limitation: html2canvas + cross-origin images requires CORS headers on Cloudinary — set via upload params. Production plan: replace with Puppeteer server-side render for guaranteed quality.`}
          />
        </FadeSection>

        <FadeSection delay={100}>
          <HowStep
            num="06"
            title="Your data is yours, secured by row-level policies"
            body="Every database table has Row Level Security enabled. Albums, photos, and frames are only visible to the user who created them — enforced at the database level, not just the application. Auth tokens are verified server-side before every AI call."
            detail={`Supabase RLS policies: auth.uid() = user_id on all tables. API routes validate the session via supabase.auth.getUser() with the Bearer token from the Authorization header — not just checking if a session exists, but verifying it against Supabase auth servers. Rate limiting: 30 AI requests per 5 minutes per user (in-memory map, resets on Vercel cold start — Upstash Redis planned for production).`}
          />
        </FadeSection>
      </section>

      {/* ── Values ── */}
      <section style={{ padding: '80px 40px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px', fontFamily: 'var(--font-body)' }}>What we believe</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                Principles that shape every decision
              </h2>
            </div>
          </FadeSection>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {[
              { icon: '◻', title: 'AI augments, never replaces', body: "Claude is a collaborator, not a replacement for your taste. You decide the mood, the story, the moments. AI handles the craft." },
              { icon: '◈', title: 'Honest pricing', body: 'You know exactly what you pay and when. No dark patterns, no surprise charges. Pay per export if that is what suits you.' },
              { icon: '✦', title: 'Quality over speed', body: 'We could ship faster. Instead we test every layout prompt, every export path, every edge case until the output is something we would actually print ourselves.' },
              { icon: '▤', title: 'Your data is yours', body: 'We do not sell your photos or use them to train models. Row-level security means only you can see your work — enforced at the database, not just in code.' },
              { icon: '◭', title: 'Local pride, global ambition', body: 'Built in Kosovo, designed for the world. We are proof that exceptional software products come from unexpected places.' },
              { icon: '⬡', title: 'Permanence over perfection', body: "A good album that exists is worth more than a perfect one that never gets made. We build tools that help you actually finish the thing." },
            ].map((v, i) => (
              <FadeSection key={v.title} delay={i * 60}>
                <ValueCard {...v} />
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section style={{ padding: '100px 40px', maxWidth: '900px', margin: '0 auto' }}>
        <FadeSection>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>Built with</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '24px' }}>
                Deliberately chosen tools
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                Every dependency in our stack was chosen for a reason. We do not use a framework because it is trendy — we use it because it solves a specific problem better than the alternatives.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <TechBadge name="Next.js 14 (App Router)" role="Routing, SSR, API routes" />
              <TechBadge name="Konva.js + react-konva" role="Canvas rendering engine" />
              <TechBadge name="Zustand" role="Global state + undo history" />
              <TechBadge name="Supabase" role="Auth, Postgres, RLS" />
              <TechBadge name="Cloudinary" role="Image storage + CDN" />
              <TechBadge name="Claude (Anthropic)" role="AI layout + style generation" />
              <TechBadge name="jsPDF + html2canvas" role="Client-side PDF export" />
              <TechBadge name="Tailwind CSS v3" role="Utility-first styling" />
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── Timeline ── */}
      <section style={{ padding: '80px 40px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <FadeSection>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>Our journey</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '56px' }}>
              Where we started, where we are going
            </h2>
            <div>
              <TimelineItem
                year="2024"
                title="The idea"
                body="The project started with a frustration: too many great photos sitting unseen in iCloud. A simple canvas editor was prototyped in a weekend. The question became — what if AI could do the design work automatically?"
              />
              <TimelineItem
                year="2024 Q4"
                title="First AI integration"
                body="Claude was integrated for full album layout generation. The first prompt-to-pages pipeline worked end to end. The result was rough but the potential was immediately clear — describing a mood and receiving a full album layout in seconds was something genuinely new."
              />
              <TimelineItem
                year="2025 Q1"
                title="Canvas editor rebuilt"
                body="The editor was rebuilt from scratch around Konva.js with a category-aware canvas system. Eight product types, responsive scaling, inline text editing, frame overlays, and a three-tier AI model architecture were shipped."
              />
              <TimelineItem
                year="2025"
                title="Three business models"
                body="The platform now supports subscription SaaS, done-for-you service, and pay-per-export. Physical print ordering (via Printful/Gelato or local Kosovo partner) is in progress. Bilingual EN/SQ support is being finalised."
              />
              <TimelineItem
                year="Next"
                title="What is coming"
                body="Stripe integration for pay-per-export and subscriptions. Video support — embed short clips inside album pages. QR code generation so physical albums can link to digital galleries. Snap guides, crop tool, and the full sticker library. An admin dashboard for the service orders workflow."
                isLast
              />
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Upcoming: Video + QR ── */}
      <section style={{ padding: '100px 40px', maxWidth: '800px', margin: '0 auto' }}>
        <FadeSection>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>Coming soon</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '48px' }}>
            Albums that are more than pages
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface)', border: '1.5px solid rgba(212,140,58,0.3)', borderRadius: '16px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.3)', borderRadius: '8px', padding: '8px', color: 'var(--accent)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>Video in albums</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>Short clips, right on the page</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                Upload short videos alongside your photos. In the digital version of your album, videos autoplay silently on the canvas — a sunset that actually moves, a child's laugh captured in motion. Video thumbnails render in the print version. Maximum clip length: 30 seconds. Supported formats: MP4, MOV, WebM.
              </p>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1.5px solid rgba(212,140,58,0.3)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--accent-muted)', border: '1px solid rgba(212,140,58,0.3)', borderRadius: '8px', padding: '8px', color: 'var(--accent)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>QR codes</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>From paper to phone in one scan</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                Every printed album will be able to contain a generated QR code — placed anywhere on any page — that opens a private digital version of your album on the recipient's phone. The printed page holds the still image. The phone plays the videos, shows the full gallery, and lets you leave voice notes or written messages.
              </p>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🖨️</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px' }}>Physical print ordering</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, fontFamily: 'var(--font-body)' }}>
                Fulfilment through Printful, Gelato, or a local Kosovo print partner. Export at 300dpi and your order goes to print. Delivery to Kosovo initially; international shipping coming shortly after.
              </p>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── Contact / CTA ── */}
      <section style={{ padding: '100px 40px', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <FadeSection>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.05, marginBottom: '20px' }}>
            Something to say?<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300 }}>We are listening.</em>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 40px', lineHeight: 1.7, fontFamily: 'var(--font-body)' }}>
            Feedback, ideas, partnership inquiries, or just to say hello — reach us at{' '}
            <a href="mailto:hello@folio.co" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>hello@folio.co</a>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'transform 200ms', boxShadow: '0 4px 20px rgba(212,140,58,0.3)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
            >
              Start creating →
            </button>
            <button onClick={() => router.push('/services')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 200ms' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
            >
              Done-for-you service
            </button>
          </div>
        </FadeSection>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Folio</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>🇽🇰 Made in Pristina · © {new Date().getFullYear()}</span>
      </footer>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
