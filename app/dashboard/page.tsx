'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Album } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useLang } from '@/lib/language-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
  </svg>
)
const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

function DeleteConfirm({ albumTitle, onConfirm, onCancel }: { albumTitle: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useLang()
  return (
    <div className="overlay animate-fade-in" onClick={onCancel} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: 'clamp(24px,5vw,36px)', maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: '40px', height: '40px', background: 'var(--danger-muted)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--danger)' }}>
          <TrashIcon />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>{t('dashboard.delete_confirm')}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          <strong>"{albumTitle}"</strong> {t('dashboard.delete_desc')}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>{t('dashboard.cancel')}</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>{t('dashboard.delete')}</button>
        </div>
      </div>
    </div>
  )
}

function AlbumCard({ album, onOpen, onDelete }: { album: Album; onOpen: () => void; onDelete: () => void }) {
  const { t } = useLang()
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pageCount = album.pages?.length || 0
  const date = new Date(album.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="album-card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
      style={{ transform: hovered ? 'translateY(-4px)' : 'none', boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)', borderColor: hovered ? 'var(--accent)' : 'var(--border)', transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease, border-color 200ms ease', cursor: 'pointer', position: 'relative' }}
    >
      <div style={{ height: 'clamp(120px,15vw,160px)', background: 'var(--bg-tertiary)', overflow: 'hidden', position: 'relative' }} onClick={onOpen}>
        {album.cover_url ? (
          <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 400ms ease' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-ghost)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: '11px' }}>{t('dashboard.no_cover')}</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)', opacity: hovered ? 1 : 0, transition: 'opacity 250ms ease', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: hovered ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)', opacity: hovered ? 1 : 0, transition: 'opacity 200ms ease, transform 200ms ease', background: 'var(--accent)', color: '#0a0a0a', fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {t('dashboard.open_editor')}
        </div>
      </div>
      <div style={{ padding: 'clamp(10px,2vw,14px) clamp(12px,2.5vw,16px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }} onClick={onOpen}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(14px,2vw,16px)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {album.title}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {pageCount} {pageCount === 1 ? t('dashboard.page') : t('dashboard.pages')} · {date}
          </p>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button className="btn btn-icon" style={{ width: '28px', height: '28px', padding: 0, opacity: hovered ? 1 : 0, transition: 'opacity 200ms' }} onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {menuOpen && (
            <div className="animate-scale-in" style={{ position: 'absolute', right: 0, top: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minWidth: '140px', zIndex: 10 }} onClick={e => e.stopPropagation()}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'background var(--transition-fast)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenuOpen(false); onOpen() }}
              ><EditIcon /> {t('dashboard.edit')}</button>
              <div style={{ height: '1px', background: 'var(--border)' }} />
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'background var(--transition-fast)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onClick={() => { setMenuOpen(false); onDelete() }}
              ><TrashIcon /> {t('dashboard.delete')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useLang()
  return (
    <div className="animate-fade-up" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 'clamp(60px,10vw,100px) clamp(16px,4vw,40px)' }}>
      <div style={{ width: '72px', height: '72px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--border)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px' }}>{t('dashboard.no_albums')}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.6 }}>{t('dashboard.no_albums_desc')}</p>
      <button className="btn btn-primary" style={{ gap: '8px' }} onClick={onCreate}><PlusIcon /> {t('dashboard.create')}</button>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: 'clamp(120px,15vw,160px)', borderRadius: 0 }} />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '16px', width: '60%' }} />
        <div className="skeleton" style={{ height: '12px', width: '40%' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUserEmail(session.user.email || '')
    const { data } = await supabase.from('albums').select('*').order('updated_at', { ascending: false })
    setAlbums(data || [])
    setLoading(false)
  }

  async function deleteAlbum(album: Album) {
    await supabase.from('albums').delete().eq('id', album.id)
    setAlbums(prev => prev.filter(a => a.id !== album.id))
    setDeleteTarget(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = albums.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
  const initials = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>

      {/* ── Top bar ── */}
      <header className="dashboard-header" style={{
        height: '60px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 clamp(12px,3vw,28px)', gap: 'clamp(8px,2vw,16px)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', transition: 'background 150ms ease', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Folio</span>
        </button>

        {/* Search */}
        <div className="dashboard-search" style={{ flex: 1, maxWidth: '320px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder={t('dashboard.search')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', height: '34px', fontSize: '13px' }} />
        </div>

        <div style={{ flex: 1 }} />
        <LanguageSwitcher compact />
        <button onClick={toggle} className="btn btn-icon" aria-label="Toggle theme" style={{ color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <div style={{ width: '30px', height: '30px', background: 'var(--accent-muted)', border: '1.5px solid var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
          {initials}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut} style={{ gap: '6px', color: 'var(--text-secondary)' }}>
          <SignOutIcon /> <span style={{ display: 'none' }}>{t('dashboard.sign_out')}</span>
        </button>
        <style>{`@media(min-width:768px){header button span{display:inline !important}}`}</style>
      </header>

      {/* ── Main content ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(12px,3vw,28px)' }}>

        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(20px,4vw,36px)', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,5vw,40px)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '6px' }}>
              {t('dashboard.title')}
            </h1>
            {!loading && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {albums.length} {albums.length === 1 ? t('dashboard.album_count') : t('dashboard.albums_count')}
                {search && ` · ${filtered.length} ${t('dashboard.matching')} "${search}"`}
              </p>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/create')} style={{ gap: '8px', height: '40px', flexShrink: 0 }}>
            <PlusIcon /> {t('dashboard.new_album')}
          </button>
        </div>

        {/* AI tip banner */}
        {!loading && albums.length > 0 && (
          <div className="animate-fade-up delay-100" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(200,132,46,0.2)', borderRadius: 'var(--radius-lg)', padding: 'clamp(10px,2vw,14px) clamp(14px,3vw,18px)', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: 'clamp(16px,3vw,28px)' }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', marginTop: '1px' }}><SparkleIcon /></div>
            <p style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: 1.5 }}>
              <strong>{t('dashboard.ai_tip_strong')}</strong> {t('dashboard.ai_tip')}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(160px,22vw,220px), 1fr))', gap: 'clamp(10px,2vw,16px)' }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => router.push('/create')} />
          ) : (
            filtered.map((album, i) => (
              <div key={album.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <AlbumCard album={album} onOpen={() => router.push(`/album/${album.id}/edit`)} onDelete={() => setDeleteTarget(album)} />
              </div>
            ))
          )}
        </div>
      </main>

      {deleteTarget && (
        <DeleteConfirm albumTitle={deleteTarget.title} onConfirm={() => deleteAlbum(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
