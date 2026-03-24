'use client'
import { useLang } from '@/lib/language-context'

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang()

  if (compact) {
    return (
      <button
        onClick={() => setLang(lang === 'en' ? 'sq' : 'en')}
        title={lang === 'en' ? 'Shqip' : 'English'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '5px 9px',
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
        }}
      >
        🇽🇰 {lang === 'en' ? 'SQ' : 'EN'}
      </button>
    )
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-full)',
      padding: '3px',
      gap: '2px',
    }}>
      {(['en', 'sq'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: lang === l ? 'var(--accent)' : 'transparent',
            color: lang === l ? '#0a0a0a' : 'var(--text-secondary)',
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {l === 'sq' ? '🇽🇰 SQ' : 'EN'}
        </button>
      ))}
    </div>
  )
}
