'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useAlbumStore } from '@/lib/store'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { useDropzone } from 'react-dropzone'

const AlbumCanvas = dynamic(() => import('@/components/AlbumCanvas'), { ssr: false })

export default function AlbumEditorPage() {
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string
  const { album, setAlbum, currentPageIndex, setCurrentPageIndex,
    photos, setPhotos, addPhoto, addPage, deletePage, isDirty, setIsDirty } = useAlbumStore()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)

  useEffect(() => { loadAlbum() }, [albumId])

  async function loadAlbum() {
    const { data } = await supabase.from('albums').select('*').eq('id', albumId).single()
    if (!data) { router.push('/dashboard'); return }
    setAlbum(data)
    setTitle(data.title)
    const { data: photoData } = await supabase.from('photos').select('*').eq('album_id', albumId).order('created_at')
    setPhotos(photoData || [])
  }

  async function saveAlbum() {
    if (!album) return
    setSaving(true)
    await supabase.from('albums').update({ title: album.title, pages: album.pages, cover_url: album.cover_url }).eq('id', albumId)
    setIsDirty(false)
    setSaving(false)
  }

  async function updateTitle(newTitle: string) {
    if (!album) return
    setAlbum({ ...album, title: newTitle })
    setTitle(newTitle)
    setIsDirty(true)
  }

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      try {
        const result = await uploadToCloudinary(file)
        const { data: photo } = await supabase.from('photos').insert({
          album_id: albumId, user_id: user.id, url: result.secure_url,
          cloudinary_id: result.public_id, width: result.width, height: result.height,
        }).select().single()
        if (photo) addPhoto(photo)
      } catch (err) { console.error('Upload failed:', err) }
    }
    setUploading(false)
  }, [albumId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true })

  async function generateAILayout() {
    if (photos.length === 0) { alert('Upload some photos first!'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: Math.ceil(photos.length / 3),
        }),
      })
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err) { console.error('AI layout failed:', err) }
    setAiLoading(false)
  }

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvasEl = document.getElementById('album-canvas-stage')
    if (!canvasEl) return
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [800, 600] })
    for (let i = 0; i < (album?.pages.length || 0); i++) {
      setCurrentPageIndex(i)
      await new Promise(r => setTimeout(r, 300))
      const canvas = await html2canvas(canvasEl, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, 800, 600)
    }
    pdf.save(`${album?.title || 'album'}.pdf`)
  }

  if (!album) return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'DM Sans, sans-serif' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#111', borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>
          ←
        </button>
        {editingTitle ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { updateTitle(title); setEditingTitle(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateTitle(title); setEditingTitle(false) } }}
            style={{ background: '#1a1a1a', border: '1px solid #d48c3a', color: '#f5f0e8',
              padding: '6px 12px', borderRadius: '4px', fontFamily: 'Playfair Display, serif',
              fontSize: '18px', outline: 'none', width: '280px' }} />
        ) : (
          <h1 onClick={() => setEditingTitle(true)}
            style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 400,
              cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', border: '1px solid transparent' }}>
            {title}
          </h1>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={generateAILayout} disabled={aiLoading}
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#d48c3a',
            padding: '8px 16px', borderRadius: '4px', cursor: aiLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', opacity: aiLoading ? 0.6 : 1 }}>
          {aiLoading ? '✨ Generating…' : '✨ AI Layout'}
        </button>
        <button onClick={exportPDF}
          style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f5f0e8',
            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          ↓ Export PDF
        </button>
        <button onClick={saveAlbum} disabled={saving || !isDirty}
          style={{ background: isDirty ? '#d48c3a' : '#1a1a1a', color: isDirty ? '#0e0e0e' : '#444',
            border: 'none', padding: '8px 20px', borderRadius: '4px',
            cursor: !isDirty ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px' }}>
          {saving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '140px', background: '#0f0f0f', borderRight: '1px solid #1a1a1a',
          display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '10px', overflowY: 'auto' }}>
          <p style={{ color: '#444', fontSize: '11px', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', marginBottom: '4px' }}>Pages</p>
          {album.pages.map((page, i) => (
            <div key={page.id} onClick={() => setCurrentPageIndex(i)}
              style={{ background: i === currentPageIndex ? '#d48c3a' : '#1a1a1a', borderRadius: '4px',
                padding: '8px', cursor: 'pointer', aspectRatio: '4/3', display: 'flex',
                alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontSize: '11px', color: i === currentPageIndex ? '#0e0e0e' : '#444',
                fontFamily: 'DM Sans, sans-serif' }}>{i + 1}</span>
              {album.pages.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); deletePage(i) }}
                  style={{ position: 'absolute', top: '2px', right: '4px', background: 'none',
                    border: 'none', color: i === currentPageIndex ? '#0e0e0e' : '#555',
                    cursor: 'pointer', fontSize: '12px', padding: '0', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
          <button onClick={addPage}
            style={{ background: 'none', border: '1px dashed #2a2a2a', color: '#444',
              borderRadius: '4px', padding: '8px', cursor: 'pointer', fontSize: '18px', aspectRatio: '4/3' }}>
            +
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a', padding: '32px' }}>
          <AlbumCanvas />
        </div>

        <div style={{ width: '180px', background: '#0f0f0f', borderLeft: '1px solid #1a1a1a',
          display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 12px', borderBottom: '1px solid #1a1a1a' }}>
            <p style={{ color: '#444', fontSize: '11px', letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>Photos</p>
            <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#d48c3a' : '#2a2a2a'}`,
              borderRadius: '6px', padding: '16px 8px', textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? '#1a1200' : 'transparent' }}>
              <input {...getInputProps()} />
              <p style={{ color: isDragActive ? '#d48c3a' : '#444', fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                {uploading ? 'Uploading…' : 'Drop photos\nor click'}
              </p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {photos.map((photo) => (
              <img key={photo.id} src={photo.url} alt="" draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('photoId', photo.id)
                  e.dataTransfer.setData('photoUrl', photo.url)
                  e.dataTransfer.setData('photoWidth', photo.width.toString())
                  e.dataTransfer.setData('photoHeight', photo.height.toString())
                }}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '3px', cursor: 'grab' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}