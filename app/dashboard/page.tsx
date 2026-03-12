'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Album } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => { checkAuth(); loadAlbums() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/')
  }

  async function loadAlbums() {
    const { data } = await supabase.from('albums').select('*').order('updated_at', { ascending: false })
    setAlbums(data || [])
    setLoading(false)
  }

  async function createAlbum() {
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('albums').insert({
      user_id: user.id,
      title: 'Untitled Album',
      pages: [{ id: crypto.randomUUID(), background: '#ffffff', elements: [] }],
    }).select().single()
    if (data) router.push(`/album/${data.id}/edit`)
    setCreating(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main style={{ background: '#0e0e0e', minHeight: '100vh', color: '#f5f0e8' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px' }}>Folio</span>
        <button onClick={signOut}
          style={{ background: 'none', border: '1px solid #333', color: '#777',
            padding: '7px 16px', borderRadius: '4px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Sign out
        </button>
      </nav>
      <div style={{ padding: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '42px', fontWeight: 400, marginBottom: '8px' }}>
              Your Albums
            </h1>
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
              {albums.length} album{albums.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={createAlbum} disabled={creating}
            style={{ background: '#d48c3a', color: '#0e0e0e', border: 'none',
              padding: '13px 28px', borderRadius: '4px', cursor: creating ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', opacity: creating ? 0.7 : 1 }}>
            {creating ? 'Creating…' : '+ New Album'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
        ) : albums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#333', marginBottom: '16px' }}>
              No albums yet
            </p>
            <button onClick={createAlbum}
              style={{ background: '#d48c3a', color: '#0e0e0e', border: 'none',
                padding: '13px 28px', borderRadius: '4px', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Create album
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {albums.map((album) => (
              <div key={album.id} onClick={() => router.push(`/album/${album.id}/edit`)}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '6px',
                  overflow: 'hidden', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#d48c3a')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1a1a1a')}>
                <div style={{ height: '160px', background: '#1a1a1a', display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {album.cover_url
                    ? <img src={album.cover_url} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#333', fontSize: '32px' }}>📷</span>}
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 400, marginBottom: '6px' }}>
                    {album.title}
                  </h3>
                  <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
                    {album.pages?.length || 0} page{(album.pages?.length || 0) !== 1 ? 's' : ''} · {new Date(album.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}