'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useAlbumStore } from '@/lib/store'
import { useDropzone } from 'react-dropzone'
import type { Photo, Frame } from '@/lib/supabase'

const AlbumCanvas = dynamic(() => import('@/components/AlbumCanvas'), { ssr: false })
const TemplatesModal = dynamic(() => import('@/components/TemplatesModal'), { ssr: false })

// ── Cloudinary upload with progress ──────────────────────────────────────────
async function uploadWithProgress(
  file: File,
  folder: string,
  onProgress: (pct: number) => void
): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload error')))
    xhr.send(formData)
  })
}

// ── Print Preview Modal ───────────────────────────────────────────────────────
type PrintFormat = 'a4-landscape' | 'a4-portrait' | 'square'

function PrintPreviewModal({ onClose, onDownload }: {
  onClose: () => void
  onDownload: (format: PrintFormat, bleed: boolean) => Promise<void>
}) {
  const [format, setFormat] = useState<PrintFormat>('a4-landscape')
  const [bleed, setBleed] = useState(false)
  const [exporting, setExporting] = useState(false)

  const formats: { id: PrintFormat; label: string; dims: string }[] = [
    { id: 'a4-landscape', label: 'A4 Landscape', dims: '297 × 210 mm' },
    { id: 'a4-portrait', label: 'A4 Portrait', dims: '210 × 297 mm' },
    { id: 'square', label: 'Square', dims: '210 × 210 mm' },
  ]

  const btnBase: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777',
    padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', textAlign: 'left',
  }
  const btnActiveStyle: React.CSSProperties = { ...btnBase, borderColor: '#d48c3a', color: '#f5f0e8' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 400, color: '#f5f0e8', margin: 0 }}>Export PDF</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '28px' }}>Renders at 2× resolution for crisp print quality.</p>

        <p style={{ color: '#888', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Format</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {formats.map(f => (
            <button key={f.id} style={format === f.id ? btnActiveStyle : btnBase} onClick={() => setFormat(f.id)}>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{f.label}</span>
                <span style={{ color: '#555', fontSize: '12px' }}>{f.dims}</span>
              </span>
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '32px' }}>
          <input type="checkbox" checked={bleed} onChange={e => setBleed(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#d48c3a', cursor: 'pointer' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#888' }}>Add 3mm bleed margins</span>
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid #2a2a2a', color: '#555', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            Cancel
          </button>
          <button
            disabled={exporting}
            onClick={async () => { setExporting(true); await onDownload(format, bleed); setExporting(false); onClose() }}
            style={{ flex: 2, background: '#d48c3a', border: 'none', color: '#0e0e0e', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Exporting…' : '↓ Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Refine Modal ───────────────────────────────────────────────────────────
function AIRefineModal({ onClose, onRefine, refining }: {
  onClose: () => void
  onRefine: (prompt: string) => void
  refining: boolean
}) {
  const [prompt, setPrompt] = useState('')

  const examples = [
    'Dark moody wedding, gold accents, Playfair fonts',
    'Minimal Japanese, white space, tiny clean text',
    'Vibrant travel diary, warm colors, adventurous',
    'Cinematic black and white, dramatic shadows',
    '1970s Italian summer, warm film grain aesthetic',
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={onClose}>
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 400, color: '#f5f0e8', margin: 0 }}>Refine with AI</h2>
            <p style={{ color: '#d48c3a', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', marginTop: '4px' }}>
              Keeps your photo layout — updates colors, fonts &amp; captions only
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>

        <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
          Describe the mood you want. Claude will restyle backgrounds, captions, and typography without moving your photos.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666', padding: '5px 11px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#d48c3a'; e.currentTarget.style.color = '#d48c3a' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#666' }}>
              {ex}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the style, mood, or aesthetic for this album..."
          rows={3}
          style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8', padding: '12px 14px', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: '20px', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#d48c3a'}
          onBlur={e => e.target.style.borderColor = '#2a2a2a'}
        />

        {/* Visual hint about what stays vs changes */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, background: '#0f1a0f', border: '1px solid #1a3a1a', borderRadius: '6px', padding: '10px 12px' }}>
            <p style={{ color: '#4a9a4a', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.06em' }}>PRESERVED</p>
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>Photo positions, sizes, layout structure</p>
          </div>
          <div style={{ flex: 1, background: '#1a0f0a', border: '1px solid #3a2010', borderRadius: '6px', padding: '10px 12px' }}>
            <p style={{ color: '#d48c3a', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.06em' }}>RESTYLED</p>
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', lineHeight: 1.5 }}>Backgrounds, captions, fonts, colors</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid #2a2a2a', color: '#555', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            Cancel
          </button>
          <button onClick={() => onRefine(prompt)} disabled={refining}
            style={{ flex: 2, background: '#d48c3a', border: 'none', color: '#0e0e0e', padding: '10px', borderRadius: '6px', cursor: refining ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', opacity: refining ? 0.6 : 1 }}>
            {refining ? '✨ Refining…' : '✨ Refine Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Editor Page ──────────────────────────────────────────────────────────
export default function AlbumEditorPage() {
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string

  const {
    album, setAlbum, currentPageIndex, setCurrentPageIndex,
    photos, setPhotos, addPhoto,
    frames, setFrames, addFrame,
    addPage, deletePage,
    isDirty, setIsDirty, undo, selectedElementId, deleteElement, addElement,
  } = useAlbumStore()

  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [frameUploadProgress, setFrameUploadProgress] = useState<number | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [showAiRefine, setShowAiRefine] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  /** 'photos' | 'frames' */
  const [rightTab, setRightTab] = useState<'photos' | 'frames'>('photos')
  const savingRef = useRef(saving)
  savingRef.current = saving

  // ── Load album + frames ──────────────────────────────────────────────────
  useEffect(() => { loadAlbum() }, [albumId])

  async function loadAlbum() {
    const { data } = await supabase.from('albums').select('*').eq('id', albumId).single()
    if (!data) { router.push('/dashboard'); return }
    setAlbum(data)
    setTitle(data.title)
    const [{ data: photoData }, { data: frameData }] = await Promise.all([
      supabase.from('photos').select('*').eq('album_id', albumId).order('created_at'),
      supabase.from('frames').select('*').eq('album_id', albumId).order('created_at'),
    ])
    setPhotos(photoData || [])
    setFrames(frameData || [])
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveAlbum = useCallback(async () => {
    if (!album || savingRef.current) return
    setSaving(true)
    await supabase.from('albums').update({ title: album.title, pages: album.pages, cover_url: album.cover_url }).eq('id', albumId)
    setIsDirty(false)
    setSaving(false)
  }, [album, albumId, setIsDirty])

  async function updateTitle(newTitle: string) {
    if (!album) return
    setAlbum({ ...album, title: newTitle })
    setTitle(newTitle)
    setIsDirty(true)
  }

  // ── Unsaved changes warning ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (selectedElementId) { e.preventDefault(); deleteElement(currentPageIndex, selectedElementId) }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); saveAlbum() }
        if (e.key === 'z') { e.preventDefault(); undo() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedElementId, currentPageIndex, deleteElement, saveAlbum, undo])

  // ── Photo upload ─────────────────────────────────────────────────────────
  const onPhotoDrop = useCallback(async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      setUploadProgress(0)
      try {
        const result = await uploadWithProgress(file, 'photo-album-app', (pct) => setUploadProgress(pct))
        const { data: photo } = await supabase.from('photos').insert({
          album_id: albumId, user_id: user.id, url: result.secure_url,
          cloudinary_id: result.public_id, width: result.width, height: result.height,
        }).select().single()
        if (photo) addPhoto(photo)
      } catch (err) { console.error('Photo upload failed:', err) }
    }
    setUploadProgress(null)
  }, [albumId, addPhoto])

  // ── Frame upload (PNG with transparency) ─────────────────────────────────
  const onFrameDrop = useCallback(async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      setFrameUploadProgress(0)
      try {
        const result = await uploadWithProgress(file, 'photo-album-app/frames', (pct) => setFrameUploadProgress(pct))
        const name = file.name.replace(/\.[^.]+$/, '') // strip extension
        const { data: frame } = await supabase.from('frames').insert({
          album_id: albumId, user_id: user.id, url: result.secure_url,
          cloudinary_id: result.public_id, width: result.width, height: result.height,
          name,
        }).select().single()
        if (frame) addFrame(frame)
      } catch (err) { console.error('Frame upload failed:', err) }
    }
    setFrameUploadProgress(null)
  }, [albumId, addFrame])

  const {
    getRootProps: getPhotoRootProps,
    getInputProps: getPhotoInputProps,
    isDragActive: isPhotoDragActive,
  } = useDropzone({ onDrop: onPhotoDrop, accept: { 'image/*': [] }, multiple: true })

  const {
    getRootProps: getFrameRootProps,
    getInputProps: getFrameInputProps,
    isDragActive: isFrameDragActive,
  } = useDropzone({ onDrop: onFrameDrop, accept: { 'image/png': [], 'image/gif': [], 'image/webp': [] }, multiple: true })

  // ── AI generate fresh layout ─────────────────────────────────────────────
  async function generateAILayout() {
    if (photos.length === 0) { alert('Upload some photos first!'); return }
    setAiLoading(true)
    setShowAiPanel(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('Please sign in again.'); return }
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: Math.max(Math.ceil(photos.length / 3), 1),
          prompt: aiPrompt,
          mode: 'generate',
        }),
      })
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err) { console.error('AI layout failed:', err) }
    setAiLoading(false)
  }

  // ── AI refine current layout (preserve photo positions) ──────────────────
  async function refineWithAI(prompt: string) {
    if (!album || album.pages.length === 0) return
    setAiRefining(true)
    setShowAiRefine(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('Please sign in again.'); return }
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          mode: 'refine',
          prompt,
          currentPages: album.pages,
          // photos array still needed for rate-limit bypass — send minimal list
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: album.pages.length,
        }),
      })
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err) { console.error('AI refine failed:', err) }
    setAiRefining(false)
  }

  // ── Set cover photo ──────────────────────────────────────────────────────
  async function setCoverPhoto(photo: Photo) {
    if (!album) return
    setAlbum({ ...album, cover_url: photo.url })
    await supabase.from('albums').update({ cover_url: photo.url }).eq('id', albumId)
  }

  // ── PDF Export ───────────────────────────────────────────────────────────
  async function doExportPDF(format: PrintFormat, bleed: boolean) {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvasEl = document.getElementById('album-canvas-stage')
    if (!canvasEl) return
    const formatDims: Record<PrintFormat, [number, number, 'landscape' | 'portrait']> = {
      'a4-landscape': [297, 210, 'landscape'],
      'a4-portrait': [210, 297, 'portrait'],
      'square': [210, 210, 'portrait'],
    }
    const [pW, pH, ori] = formatDims[format]
    const pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [pW, pH] })
    for (let i = 0; i < (album?.pages.length || 0); i++) {
      setCurrentPageIndex(i)
      await new Promise(r => setTimeout(r, 350))
      const canvas = await html2canvas(canvasEl, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      if (i > 0) pdf.addPage([pW, pH], ori)
      const bleedMm = bleed ? 3 : 0
      pdf.addImage(imgData, 'JPEG', -bleedMm, -bleedMm, pW + bleedMm * 2, pH + bleedMm * 2)
    }
    pdf.save(`${album?.title || 'album'}.pdf`)
  }

  if (!album) return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'DM Sans, sans-serif' }}>
      Loading…
    </div>
  )

  const navBtnBase: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #333', color: '#f5f0e8',
    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
  }

  const isLoading = aiLoading || aiRefining

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0e8', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: '#111', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>
          ←
        </button>

        {editingTitle ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { updateTitle(title); setEditingTitle(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { updateTitle(title); setEditingTitle(false) } }}
            style={{ background: '#1a1a1a', border: '1px solid #d48c3a', color: '#f5f0e8', padding: '6px 12px', borderRadius: '4px', fontFamily: 'Playfair Display, serif', fontSize: '18px', outline: 'none', width: '280px' }} />
        ) : (
          <h1 onClick={() => setEditingTitle(true)}
            style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 400, cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', border: '1px solid transparent' }}>
            {title}
          </h1>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowTemplates(true)} style={navBtnBase}>🗂 Templates</button>

        {/* AI Refine — only shown when album has pages with content */}
        {album.pages.some(p => p.elements.length > 0) && (
          <button onClick={() => setShowAiRefine(true)} disabled={isLoading}
            style={{ ...navBtnBase, color: '#b87a30', borderColor: '#3a2a1a', background: '#1a1200', opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            {aiRefining ? '✨ Refining…' : '✨ Refine'}
          </button>
        )}

        <button onClick={() => setShowAiPanel(true)} disabled={isLoading}
          style={{ ...navBtnBase, color: '#d48c3a', opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          {aiLoading ? '✨ Generating…' : '✨ AI Style'}
        </button>

        <button onClick={() => setShowPrintModal(true)} style={navBtnBase}>↓ Export PDF</button>

        <button onClick={saveAlbum} disabled={saving || !isDirty}
          style={{ background: isDirty ? '#d48c3a' : '#1a1a1a', color: isDirty ? '#0e0e0e' : '#444', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: !isDirty ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px' }}>
          {saving ? 'Saving…' : isDirty ? 'Save' : 'Saved ✓'}
        </button>
      </div>

      {/* ── AI Generate Modal ── */}
      {showAiPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowAiPanel(false)}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 400, marginBottom: '8px', color: '#f5f0e8' }}>
              Describe your album
            </h2>
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              Describe any style, mood, or aesthetic. Claude will generate a complete fresh layout.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {[
                '1970s Italian summer, warm film, handwritten feel',
                'Dark moody wedding, black backgrounds, gold accents',
                'Minimal Japanese style, white space, small clean text',
                'Vibrant travel diary, bright colors, adventurous energy',
                'Elegant black and white, cinematic, dramatic shadows',
              ].map(example => (
                <button key={example} onClick={() => setAiPrompt(example)}
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#d48c3a'; e.currentTarget.style.color = '#d48c3a' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#777' }}>
                  {example}
                </button>
              ))}
            </div>
            <textarea
              value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A romantic Parisian honeymoon — soft pinks and creams, elegant serif fonts..."
              rows={4}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8', padding: '14px', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.6, marginBottom: '20px', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#d48c3a'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAiPanel(false)}
                style={{ background: 'none', border: '1px solid #2a2a2a', color: '#555', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={generateAILayout} disabled={aiLoading}
                style={{ background: '#d48c3a', border: 'none', color: '#0e0e0e', padding: '10px 28px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? '✨ Generating…' : '✨ Generate Album'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Page Sidebar */}
        <div style={{ width: '140px', background: '#0f0f0f', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '10px', overflowY: 'auto', flexShrink: 0 }}>
          <p style={{ color: '#444', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', marginBottom: '4px' }}>Pages</p>
          {album.pages.map((page, i) => (
            <div key={page.id} onClick={() => setCurrentPageIndex(i)}
              style={{ background: i === currentPageIndex ? '#d48c3a' : '#1a1a1a', borderRadius: '4px', padding: '8px', cursor: 'pointer', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontSize: '11px', color: i === currentPageIndex ? '#0e0e0e' : '#444', fontFamily: 'DM Sans, sans-serif' }}>{i + 1}</span>
              {album.pages.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); deletePage(i) }}
                  style={{ position: 'absolute', top: '2px', right: '4px', background: 'none', border: 'none', color: i === currentPageIndex ? '#0e0e0e' : '#555', cursor: 'pointer', fontSize: '12px', padding: '0', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
          <button onClick={addPage}
            style={{ background: 'none', border: '1px dashed #2a2a2a', color: '#444', borderRadius: '4px', padding: '8px', cursor: 'pointer', fontSize: '18px', aspectRatio: '4/3' }}>
            +
          </button>
        </div>

        {/* Canvas Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: '32px', overflow: 'hidden', minWidth: 0 }}>
          <AlbumCanvas />
        </div>

        {/* Right Panel — Photos / Frames tabs */}
        <div style={{ width: '180px', background: '#0f0f0f', borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
            {(['photos', 'frames'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)}
                style={{
                  flex: 1, background: 'none', border: 'none',
                  borderBottom: rightTab === tab ? '2px solid #d48c3a' : '2px solid transparent',
                  color: rightTab === tab ? '#d48c3a' : '#444',
                  padding: '10px 0', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                  textTransform: 'capitalize',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── Photos tab ── */}
          {rightTab === 'photos' && (
            <>
              <div style={{ padding: '12px', borderBottom: '1px solid #1a1a1a' }}>
                <div {...getPhotoRootProps()} style={{ border: `2px dashed ${isPhotoDragActive ? '#d48c3a' : '#2a2a2a'}`, borderRadius: '6px', padding: '12px 8px', textAlign: 'center', cursor: 'pointer', background: isPhotoDragActive ? '#1a1200' : 'transparent' }}>
                  <input {...getPhotoInputProps()} />
                  {uploadProgress !== null ? (
                    <div>
                      <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#d48c3a', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                      </div>
                      <p style={{ color: '#d48c3a', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>{uploadProgress}%</p>
                    </div>
                  ) : (
                    <p style={{ color: isPhotoDragActive ? '#d48c3a' : '#444', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                      {isPhotoDragActive ? 'Drop here' : 'Drop photos\nor click'}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {photos.map((photo) => (
                  <div key={photo.id} style={{ position: 'relative', borderRadius: '3px', overflow: 'hidden', aspectRatio: '1' }}>
                    <img src={photo.url} alt="" draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('photoId', photo.id)
                        e.dataTransfer.setData('photoUrl', photo.url)
                        e.dataTransfer.setData('photoWidth', photo.width.toString())
                        e.dataTransfer.setData('photoHeight', photo.height.toString())
                        e.dataTransfer.setData('elementType', 'image')
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'grab', display: 'block' }}
                    />
                    <button title="Set as album cover" onClick={() => setCoverPhoto(photo)}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(14,14,14,0.85)', border: 'none', color: '#d48c3a', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', padding: '3px 0', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                      ⭐ Cover
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Frames tab ── */}
          {rightTab === 'frames' && (
            <>
              <div style={{ padding: '12px', borderBottom: '1px solid #1a1a1a' }}>
                <p style={{ color: '#444', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4, marginBottom: '8px' }}>
                  Upload PNG/WebP frames with transparency
                </p>
                <div {...getFrameRootProps()} style={{ border: `2px dashed ${isFrameDragActive ? '#d48c3a' : '#2a2a2a'}`, borderRadius: '6px', padding: '12px 8px', textAlign: 'center', cursor: 'pointer', background: isFrameDragActive ? '#1a1200' : 'transparent' }}>
                  <input {...getFrameInputProps()} />
                  {frameUploadProgress !== null ? (
                    <div>
                      <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${frameUploadProgress}%`, background: '#d48c3a', borderRadius: '2px', transition: 'width 0.2s ease' }} />
                      </div>
                      <p style={{ color: '#d48c3a', fontSize: '11px', fontFamily: 'DM Sans, sans-serif' }}>{frameUploadProgress}%</p>
                    </div>
                  ) : (
                    <p style={{ color: isFrameDragActive ? '#d48c3a' : '#444', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                      {isFrameDragActive ? 'Drop here' : 'Drop frames\nor click'}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {frames.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 8px' }}>
                    <p style={{ color: '#333', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', lineHeight: 1.6 }}>
                      No frames yet.<br />Upload PNG files with transparency.
                    </p>
                  </div>
                )}
                {frames.map((frame) => (
                  <div key={frame.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('frameId', frame.id)
                      e.dataTransfer.setData('photoUrl', frame.url)
                      e.dataTransfer.setData('photoWidth', frame.width.toString())
                      e.dataTransfer.setData('photoHeight', frame.height.toString())
                      e.dataTransfer.setData('elementType', 'frame')
                    }}
                    title={frame.name}
                    style={{
                      position: 'relative', borderRadius: '4px', overflow: 'hidden', aspectRatio: '1',
                      background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 0 0 / 12px 12px',
                      cursor: 'grab', border: '1px solid #2a2a2a',
                    }}>
                    <img src={frame.url} alt={frame.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    {/* name tooltip on hover */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '2px 0', opacity: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                      <p style={{ color: '#f5f0e8', fontFamily: 'DM Sans, sans-serif', fontSize: '9px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                        {frame.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showPrintModal && (
        <PrintPreviewModal onClose={() => setShowPrintModal(false)} onDownload={doExportPDF} />
      )}
      {showTemplates && (
        <TemplatesModal onClose={() => setShowTemplates(false)} />
      )}
      {showAiRefine && (
        <AIRefineModal
          onClose={() => setShowAiRefine(false)}
          onRefine={refineWithAI}
          refining={aiRefining}
        />
      )}
    </div>
  )
}