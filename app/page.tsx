'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setError('Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ background: '#0e0e0e', minHeight: '100vh', color: '#f5f0e8' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 48px', borderBottom: '1px solid #1e1e1e' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', letterSpacing: '0.05em' }}>
          Folio
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setMode('login')}
            style={{ background: 'none', border: '1px solid #333', color: '#f5f0e8',
              padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Sign in
          </button>
          <button onClick={() => setMode('signup')}
            style={{ background: '#d48c3a', border: 'none', color: '#0e0e0e',
              padding: '8px 20px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            Get started
          </button>
        </div>
      </nav>

      <section style={{ padding: '100px 48px 80px', maxWidth: '900px' }}>
        <p style={{ color: '#d48c3a', fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '24px' }}>
          AI-Powered Photo Albums
        </p>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(52px, 8vw, 96px)',
          lineHeight: 1.05, marginBottom: '32px', fontWeight: 400 }}>
          Your memories,<br />
          <em style={{ color: '#d48c3a' }}>beautifully arranged.</em>
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '18px', color: '#999',
          maxWidth: '480px', lineHeight: 1.7, marginBottom: '48px' }}>
          Upload your photos. Let AI design your album, or take full control.
          Export as a print-ready PDF or order physical copies.
        </p>
        <button onClick={() => setMode('signup')}
          style={{ background: '#d48c3a', color: '#0e0e0e', border: 'none',
            padding: '16px 40px', fontSize: '16px', fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500, borderRadius: '4px', cursor: 'pointer' }}>
          Start your first album →
        </button>
      </section>

      <section style={{ padding: '80px 48px', borderTop: '1px solid #1a1a1a' }}>
        <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '48px' }}>
          Three ways to create
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2px' }}>
          {[
            { num: '01', title: 'Full AI', desc: 'Upload photos, describe your style. AI builds the entire album for you — layouts, captions, everything.' },
            { num: '02', title: 'Half & Half', desc: 'AI generates a starting point. You refine, rearrange, and make it yours.' },
            { num: '03', title: 'Manual', desc: 'Full creative control. Drag, drop, and design every page exactly as you envision it.' },
          ].map((m) => (
            <div key={m.num} style={{ background: '#111', padding: '40px 32px', borderRadius: '2px' }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '48px',
                color: '#222', fontWeight: 700, display: 'block', marginBottom: '16px' }}>
                {m.num}
              </span>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px',
                marginBottom: '12px', fontWeight: 400 }}>{m.title}</h3>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                color: '#777', lineHeight: 1.7 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {mode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setMode(null)}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '8px',
            padding: '48px', width: '100%', maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px',
              marginBottom: '32px', fontWeight: 400 }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
                  padding: '12px 16px', borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px', outline: 'none' }} />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
                  padding: '12px 16px', borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px', outline: 'none' }} />
              {error && (
                <p style={{ color: error.includes('Check') ? '#d48c3a' : '#e05555',
                  fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
              )}
              <button type="submit" disabled={loading}
                style={{ background: '#d48c3a', color: '#0e0e0e', border: 'none',
                  padding: '13px', borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#555',
                fontFamily: 'DM Sans, sans-serif' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
                <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  style={{ background: 'none', border: 'none', color: '#d48c3a',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}