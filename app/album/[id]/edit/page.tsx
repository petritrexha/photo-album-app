'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useAlbumStore } from '@/lib/store'
import { useDropzone } from 'react-dropzone'
import { useTheme } from '@/lib/theme'
import type { Photo, Frame } from '@/lib/supabase'

const AlbumCanvas = dynamic(() => import('@/components/AlbumCanvas'), { ssr: false })

// ── SVG Icons ─────────────────────────────────────────────────────
const Icon = {
  Sun: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  ArrowLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Plus: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Sparkle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Save: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Undo: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>,
  Grid: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Image: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Type: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Layers: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Palette: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  Frame: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="6" y="6" width="12" height="12"/></svg>,
  AlertCircle: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  RefreshCcw: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
}

// ── Cloudinary upload ──────────────────────────────────────────────
async function uploadWithProgress(file: File, folder: string, onProgress: (p: number) => void) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', folder)
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`)
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 90)) })
    xhr.addEventListener('load', () => { if (xhr.status < 300) { onProgress(100); resolve(JSON.parse(xhr.responseText)) } else reject(new Error('Upload failed')) })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.send(formData)
  })
}

// ── Error state screen ────────────────────────────────────────────
function LoadError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  const isRateLimit = message.toLowerCase().includes('429') || message.toLowerCase().includes('rate') || message.toLowerCase().includes('too many')
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      padding: '40px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px', height: '56px',
        background: 'var(--danger-muted)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--danger)',
        marginBottom: '4px',
      }}>
        <Icon.AlertCircle />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {isRateLimit ? 'Too many requests' : 'Could not load album'}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
        {isRateLimit
          ? 'Supabase is temporarily rate-limiting requests. Please wait 60 seconds and try again.'
          : message || 'An unexpected error occurred while loading this album.'}
      </p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ gap: '6px' }}>
          <Icon.ArrowLeft /> Dashboard
        </button>
        <button className="btn btn-primary" onClick={onRetry} style={{ gap: '6px' }}>
          <Icon.RefreshCcw /> Try again
        </button>
      </div>
    </div>
  )
}

// ── AI Refine Modal ───────────────────────────────────────────────
function AIRefineModal({ onClose, onRefine, loading }: {
  onClose: () => void
  onRefine: (prompt: string) => void
  loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const presets = [
    'Dark moody — black background, gold serif fonts, cinematic',
    'Minimal Japanese — white space, clean sans-serif, muted tones',
    'Warm summer — cream backgrounds, script captions, golden hour colors',
    'Editorial — bold typography, high contrast, magazine-style',
    'Romantic vintage — muted pinks, ornate fonts, soft vignettes',
  ]

  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '40px', maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ color: 'var(--accent)' }}><Icon.Sparkle /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Refine with AI</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Describe the mood or aesthetic. Claude updates backgrounds, captions, and typography — your photo positions stay exactly where they are.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { label: 'Preserved', color: 'var(--success)', bg: 'var(--success-muted)', items: 'Photo layout & positions' },
            { label: 'Restyled', color: 'var(--accent)', bg: 'var(--accent-muted)', items: 'Colors, fonts & captions' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, minWidth: '140px', background: item.bg, border: `1px solid ${item.color}33`, borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color, marginBottom: '3px' }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.items}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {presets.map(p => (
            <button key={p} onClick={() => setPrompt(p)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{p}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the style, mood, or vibe you want for this album…" rows={3} style={{ marginBottom: '20px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '40px' }} onClick={() => onRefine(prompt)} disabled={loading || !prompt.trim()}>
            {loading ? <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: 'var(--accent)' }} /> : <Icon.Sparkle />}
            {loading ? 'Refining album…' : 'Refine Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Generate Modal ──────────────────────────────────────────────
function AIGenerateModal({ onClose, onGenerate, loading }: {
  onClose: () => void
  onGenerate: (prompt: string) => void
  loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const examples = [
    '1970s Italian summer — warm film grain, golden hour, handwritten feel',
    'Dark moody wedding — black backgrounds, amber candlelight, Playfair fonts',
    'Minimal Japanese — white space, small clean text, very little decoration',
    'Vibrant travel diary — bright saturated colors, energetic layouts',
    'Cinematic black and white — dramatic contrast, editorial photography style',
  ]

  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '40px', maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ color: 'var(--accent)' }}><Icon.Sparkle /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 500, color: 'var(--text-primary)' }}>Describe your album</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Describe any style, mood, or aesthetic. Claude will generate a complete fresh layout — pages, photo positions, backgrounds, typography, and captions.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 11px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)', lineHeight: 1.4, textAlign: 'left' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{ex}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. A romantic Parisian honeymoon — soft pinks, elegant serif fonts, dreamy overlapping layouts…" rows={4} style={{ marginBottom: '20px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '42px', fontSize: '14px' }} onClick={() => onGenerate(prompt)} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: 'var(--accent)' }} /> : <Icon.Sparkle />}
            {loading ? 'Generating layout…' : 'Generate Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF Export Modal ───────────────────────────────────────────────
type PrintFormat = 'a4-landscape' | 'a4-portrait' | 'square'
function ExportModal({ onClose, onExport }: {
  onClose: () => void
  onExport: (format: PrintFormat, bleed: boolean) => Promise<void>
}) {
  const [format, setFormat] = useState<PrintFormat>('a4-landscape')
  const [bleed, setBleed] = useState(false)
  const [exporting, setExporting] = useState(false)

  const formats: { id: PrintFormat; label: string; dims: string; desc: string }[] = [
    { id: 'a4-landscape', label: 'A4 Landscape', dims: '297 × 210 mm', desc: 'Standard print format' },
    { id: 'a4-portrait', label: 'A4 Portrait', dims: '210 × 297 mm', desc: 'Tall/vertical pages' },
    { id: 'square', label: 'Square', dims: '210 × 210 mm', desc: 'Social media friendly' },
  ]

  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '40px', maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ color: 'var(--text-secondary)' }}><Icon.Download /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Export as PDF</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rendered at 2× resolution for crisp print quality.</p>
        </div>
        <label className="label">Page format</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {formats.map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: format === f.id ? 'var(--accent-muted)' : 'var(--bg-tertiary)', border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all var(--transition-fast)', fontFamily: 'var(--font-body)' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: format === f.id ? 'var(--accent)' : 'var(--text-primary)' }}>{f.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{f.dims}</span>
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '28px' }}>
          <input type="checkbox" checked={bleed} onChange={e => setBleed(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Add 3mm bleed margins</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recommended for physical printing</div>
          </div>
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2, gap: '8px', height: '42px' }} disabled={exporting} onClick={async () => { setExporting(true); await onExport(format, bleed); setExporting(false); onClose() }}>
            {exporting ? <><span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: '#0a0a0a' }} /> Exporting…</> : <><Icon.Download /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Right Panel Tabs ───────────────────────────────────────────────
type RightTab = 'photos' | 'layouts' | 'text' | 'backgrounds' | 'frames'

const RIGHT_TABS: { id: RightTab; icon: React.ReactNode; label: string }[] = [
  { id: 'photos',      icon: <Icon.Image />,   label: 'Photos' },
  { id: 'frames',      icon: <Icon.Frame />,   label: 'Frames' },
  { id: 'text',        icon: <Icon.Type />,    label: 'Text' },
  { id: 'backgrounds', icon: <Icon.Palette />, label: 'Bg' },
  { id: 'layouts',     icon: <Icon.Layers />,  label: 'Layout' },
]

const BG_PRESETS = [
  '#0a0a0a', '#1a1a1a', '#2a2018', '#0d1a2a', '#1a0d0d',
  '#ffffff', '#f5f0e8', '#faf8f4', '#f0f4ff', '#f0fff0',
  '#1a0a2a', '#0a1a0a', '#2a1a0a', '#0a0a2a', '#1a1a2a',
]

const GRADIENT_PRESETS = [
  { from: '#1a1208', to: '#2a1a08', angle: 135 },
  { from: '#0d1a2a', to: '#1a2a3a', angle: 160 },
  { from: '#1a0d0d', to: '#2a1a1a', angle: 120 },
  { from: '#0a0a0a', to: '#1a1a2a', angle: 180 },
]

// ── Main Editor Page ───────────────────────────────────────────────
export default function AlbumEditorPage() {
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string
  const { theme, toggle } = useTheme()

  const {
    album, setAlbum, currentPageIndex, setCurrentPageIndex,
    photos, setPhotos, addPhoto,
    frames, setFrames, addFrame, removeFrame,
    addPage, deletePage, addElement,
    isDirty, setIsDirty, undo, selectedElementId, deleteElement,
  } = useAlbumStore()

  const [showAIGenerate, setShowAIGenerate]   = useState(false)
  const [showAIRefine, setShowAIRefine]       = useState(false)
  const [showExport, setShowExport]           = useState(false)
  const [rightTab, setRightTab]               = useState<RightTab>('photos')
  const [editingTitle, setEditingTitle]       = useState(false)
  const [title, setTitle]                     = useState('')

  const [saving, setSaving]                   = useState(false)
  const [aiGenerating, setAiGenerating]       = useState(false)
  const [aiRefining, setAiRefining]           = useState(false)
  const [uploadProgress, setUploadProgress]   = useState<number | null>(null)
  const [frameUploading, setFrameUploading]   = useState(false)

  // ── Error state ─────────────────────────────────────────────────
  const [loadError, setLoadError]             = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt]         = useState(0)

  const savingRef = useRef(false)
  savingRef.current = saving
  const frameInputRef = useRef<HTMLInputElement>(null)

  // ── Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadAlbum()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, loadAttempt])

  async function loadAlbum() {
    setLoadError(null)

    try {
      // Validate auth session first — avoids unnecessary DB calls if expired
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) {
        router.push('/')
        return
      }

      // Fetch album
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select('*')
        .eq('id', albumId)
        .single()

      if (albumError) throw albumError
      if (!albumData) {
        router.push('/dashboard')
        return
      }

      setAlbum(albumData)
      setTitle(albumData.title)

      // Fetch photos
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('album_id', albumId)
        .order('created_at')

      if (photoError) throw photoError
      setPhotos(photoData || [])

      // Fetch frames (user-scoped via RLS)
      const { data: frameData, error: frameError } = await supabase
        .from('frames')
        .select('*')
        .order('created_at', { ascending: false })

      if (frameError) throw frameError
      setFrames(frameData || [])

    } catch (err: any) {
      console.error('Failed to load album:', err)
      const status = err?.code || err?.status || 0
      const message = err?.message || 'An unexpected error occurred'

      // Check for 429 / rate limit
      if (status === 429 || String(status) === '429' || message.includes('Too Many') || message.includes('rate limit')) {
        setLoadError('429 — Supabase rate limit hit. Please wait 60 seconds and click "Try again".')
      } else if (status === 401 || status === 403) {
        router.push('/')
      } else {
        setLoadError(message)
      }
    }
  }

  // ── Save ─────────────────────────────────────────────────────────
  const saveAlbum = useCallback(async () => {
    if (!album || savingRef.current) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('albums')
        .update({ title: album.title, pages: album.pages, cover_url: album.cover_url })
        .eq('id', albumId)
      if (error) throw error
      setIsDirty(false)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [album, albumId, setIsDirty])

  async function updateTitle(t: string) {
    if (!album) return
    setAlbum({ ...album, title: t })
    setTitle(t)
    setIsDirty(true)
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && selectedElementId) {
        e.preventDefault()
        deleteElement(currentPageIndex, selectedElementId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAlbum() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedElementId, currentPageIndex, deleteElement, saveAlbum, undo])

  // ── Unsaved changes warning ──────────────────────────────────────
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  // ── Photo upload ─────────────────────────────────────────────────
  const onPhotoDrop = useCallback(async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      setUploadProgress(0)
      try {
        const result = await uploadWithProgress(file, 'photo-album-app', p => setUploadProgress(p))
        const { data: photo } = await supabase.from('photos').insert({
          album_id: albumId, user_id: user.id, url: result.secure_url,
          cloudinary_id: result.public_id, width: result.width, height: result.height,
        }).select().single()
        if (photo) addPhoto(photo)
      } catch (err) { console.error('Upload failed:', err) }
    }
    setUploadProgress(null)
  }, [albumId, addPhoto])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onPhotoDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  // ── Frame upload ─────────────────────────────────────────────────
  async function uploadFrame(file: File) {
    setFrameUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
      formData.append('folder', 'photo-album-app/frames')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
      const cloudData = await res.json()
      if (!cloudData.secure_url) return
      const { data: saved } = await supabase.from('frames').insert({
        user_id: user.id, name: file.name.replace(/\.[^/.]+$/, ''),
        url: cloudData.secure_url, cloudinary_id: cloudData.public_id,
        width: cloudData.width, height: cloudData.height, album_id: null,
      }).select().single()
      if (saved) addFrame(saved)
    } catch (err) { console.error('Frame upload error:', err) }
    setFrameUploading(false)
  }

  async function deleteFrame(id: string) {
    await supabase.from('frames').delete().eq('id', id)
    removeFrame(id)
  }

  // ── AI Generate ──────────────────────────────────────────────────
  async function generateAILayout(prompt: string) {
    if (photos.length === 0) return
    setAiGenerating(true)
    setShowAIGenerate(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: Math.max(Math.ceil(photos.length / 3), 1),
          prompt, mode: 'generate',
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Request failed (${res.status})`)
      }
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err: any) {
      console.error('AI generate error:', err)
    }
    setAiGenerating(false)
  }

  // ── AI Refine ────────────────────────────────────────────────────
  async function refineWithAI(prompt: string) {
    if (!album) return
    setAiRefining(true)
    setShowAIRefine(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          mode: 'refine', prompt,
          currentPages: album.pages,
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: album.pages.length,
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Request failed (${res.status})`)
      }
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err: any) {
      console.error('AI refine error:', err)
    }
    setAiRefining(false)
  }

  // ── PDF Export ────────────────────────────────────────────────────
  async function doExportPDF(format: PrintFormat, bleed: boolean) {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvasEl = document.getElementById('album-canvas-stage')
    if (!canvasEl) return
    const dims: Record<PrintFormat, [number, number, 'landscape' | 'portrait']> = {
      'a4-landscape': [297, 210, 'landscape'],
      'a4-portrait': [210, 297, 'portrait'],
      'square': [210, 210, 'portrait'],
    }
    const [pW, pH, ori] = dims[format]
    const pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [pW, pH] })
    for (let i = 0; i < (album?.pages.length || 0); i++) {
      setCurrentPageIndex(i)
      await new Promise(r => setTimeout(r, 350))
      const canvas = await html2canvas(canvasEl, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      if (i > 0) pdf.addPage([pW, pH], ori)
      const bMm = bleed ? 3 : 0
      pdf.addImage(imgData, 'JPEG', -bMm, -bMm, pW + bMm * 2, pH + bMm * 2)
    }
    pdf.save(`${album?.title || 'album'}.pdf`)
  }

  // ── Set cover ─────────────────────────────────────────────────────
  async function setCoverPhoto(photo: Photo) {
    if (!album) return
    setAlbum({ ...album, cover_url: photo.url })
    await supabase.from('albums').update({ cover_url: photo.url }).eq('id', albumId)
  }

  // ── Background update ─────────────────────────────────────────────
  function updatePageBg(color: string) {
    if (!album) return
    const pages = album.pages.map((p, i) => i === currentPageIndex ? { ...p, background: color } : p)
    setAlbum({ ...album, pages })
    setIsDirty(true)
  }

  // ── Add text ──────────────────────────────────────────────────────
  function addTextElement() {
    addElement(currentPageIndex, {
      id: crypto.randomUUID(), type: 'text',
      text: 'Your caption here',
      x: 80, y: 480, width: 320, height: 30,
      fontSize: 18, fill: '#f4f0ea',
      fontFamily: 'Georgia, serif', fontStyle: 'italic',
      align: 'left', lineHeight: 1.5, rotation: 0,
    })
  }

  const isAnyAILoading = aiGenerating || aiRefining
  const currentPage = album?.pages[currentPageIndex]

  // ── Error screen ──────────────────────────────────────────────────
  if (loadError) {
    return (
      <LoadError
        message={loadError}
        onRetry={() => setLoadAttempt(a => a + 1)}
        onBack={() => router.push('/dashboard')}
      />
    )
  }

  // ── Loading screen ────────────────────────────────────────────────
  if (!album) return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div className="spinner" style={{ width: '24px', height: '24px' }} />
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading album…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* ══════════════════ TOP BAR ══════════════════ */}
      <div className="editor-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 8px', borderRight: '1px solid var(--border)' }}>
          <button className="btn btn-icon" onClick={() => router.push('/dashboard')} style={{ gap: '4px', color: 'var(--text-secondary)', width: '36px', height: '36px' }}>
            <Icon.ArrowLeft />
          </button>
          <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
            </svg>
          </div>
        </div>

        <div style={{ padding: '0 12px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          {editingTitle ? (
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onBlur={() => { updateTitle(title); setEditingTitle(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { updateTitle(title); setEditingTitle(false) } }}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '15px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', outline: 'none', width: '200px' }}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '15px', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)', transition: 'background var(--transition-fast)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{title}</button>
          )}
        </div>

        <div style={{ padding: '0 8px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <button className="btn btn-icon tooltip" data-tip="Undo (Ctrl+Z)" onClick={undo} style={{ width: '34px', height: '34px' }}>
            <Icon.Undo />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRight: '1px solid var(--border)' }}>
          <button className="btn btn-ai btn-sm" onClick={() => setShowAIGenerate(true)} disabled={isAnyAILoading || photos.length === 0} style={{ gap: '6px' }}>
            {aiGenerating ? <span className="spinner" style={{ width: '11px', height: '11px', borderTopColor: 'var(--accent)' }} /> : <Icon.Sparkle />}
            {aiGenerating ? 'Generating…' : 'AI Layout'}
          </button>
          {album.pages.some(p => p.elements.length > 0) && (
            <button className="btn btn-ai btn-sm" onClick={() => setShowAIRefine(true)} disabled={isAnyAILoading} style={{ gap: '6px' }}>
              {aiRefining ? <span className="spinner" style={{ width: '11px', height: '11px', borderTopColor: 'var(--accent)' }} /> : <Icon.Sparkle />}
              {aiRefining ? 'Refining…' : 'AI Restyle'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(true)} style={{ gap: '6px', color: 'var(--text-secondary)' }}>
            <Icon.Download /> Export PDF
          </button>
          <button className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-ghost'}`} onClick={saveAlbum} disabled={saving || !isDirty} style={{ gap: '6px', minWidth: '80px' }}>
            {saving
              ? <span className="spinner" style={{ width: '11px', height: '11px', borderTopColor: isDirty ? '#0a0a0a' : 'var(--accent)' }} />
              : isDirty ? <><Icon.Save /> Save</> : <><Icon.Check /> Saved</>
            }
          </button>
          <button className="btn btn-icon" onClick={toggle} style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
          </button>
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Left sidebar: Pages ── */}
        <div className="editor-sidebar-left" style={{ padding: '12px 8px', gap: '8px' }}>
          <p className="label" style={{ textAlign: 'center', padding: '0 4px', marginBottom: '4px' }}>Pages</p>
          {album.pages.map((page, i) => (
            <div key={page.id} className={`page-thumb ${i === currentPageIndex ? 'active' : ''}`} onClick={() => setCurrentPageIndex(i)}>
              <div style={{ width: '100%', height: '100%', background: page.background, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ fontSize: '11px', color: i === currentPageIndex ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                {album.pages.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); deletePage(i) }} style={{ position: 'absolute', top: '3px', right: '3px', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-muted)', width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity var(--transition-fast)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >×</button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addPage} style={{ aspectRatio: '4/3', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color var(--transition-fast), color var(--transition-fast)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >+</button>
        </div>

        {/* ── Canvas Area ── */}
        <div className="editor-canvas-area">
          <AlbumCanvas />
        </div>

        {/* ── Right Panel ── */}
        <div className="editor-sidebar-right">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {RIGHT_TABS.map(tab => (
              <button key={tab.id} className={`panel-tab ${rightTab === tab.id ? 'active' : ''}`} onClick={() => setRightTab(tab.id)} title={tab.label}>
                <div style={{ marginBottom: '2px' }}>{tab.icon}</div>
                <span style={{ fontSize: '9px', letterSpacing: '0.05em', display: 'block' }}>{tab.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Photos tab */}
            {rightTab === 'photos' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: '12px 8px' }}>
                    <input {...getInputProps()} />
                    {uploadProgress !== null ? (
                      <div>
                        <div className="progress-bar" style={{ marginBottom: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--accent)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>Uploading {uploadProgress}%</p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}><Icon.Image /></div>
                        <p style={{ fontSize: '12px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                          {isDragActive ? 'Drop photos here' : 'Drop photos or click to upload'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', alignContent: 'start' }}>
                  {photos.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '12px' }}>No photos yet</div>}
                  {photos.map(photo => (
                    <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'grab' }}>
                      <img src={photo.url} alt="" draggable
                        onDragStart={e => { e.dataTransfer.setData('photoId', photo.id); e.dataTransfer.setData('photoUrl', photo.url); e.dataTransfer.setData('photoWidth', photo.width.toString()); e.dataTransfer.setData('photoHeight', photo.height.toString()); e.dataTransfer.setData('elementType', 'image') }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <button title="Set as cover" onClick={() => setCoverPhoto(photo)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity var(--transition-fast), background var(--transition-fast)', fontSize: '10px', color: '#fff', fontFamily: 'var(--font-body)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.45)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}
                      >⭐ Cover</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frames tab */}
            {rightTab === 'frames' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <input type="file" accept="image/*" ref={frameInputRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFrame(e.target.files[0])} />
                  <button className="btn btn-secondary" style={{ width: '100%', gap: '6px', borderStyle: 'dashed' }} onClick={() => frameInputRef.current?.click()} disabled={frameUploading}>
                    {frameUploading ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : <Icon.Plus />}
                    {frameUploading ? 'Uploading…' : 'Upload Frame (PNG)'}
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', alignContent: 'start' }}>
                  {frames.length === 0 && !frameUploading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>Upload PNG overlays with transparency</div>}
                  {frames.map(frame => (
                    <div key={frame.id} title={frame.name} draggable
                      onDragStart={e => { e.dataTransfer.setData('frameId', frame.id); e.dataTransfer.setData('photoUrl', frame.url); e.dataTransfer.setData('photoWidth', frame.width.toString()); e.dataTransfer.setData('photoHeight', frame.height.toString()); e.dataTransfer.setData('elementType', 'frame') }}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'repeating-conic-gradient(var(--bg-tertiary) 0% 25%, var(--bg-elevated) 0% 50%) 0 0 / 12px 12px', border: '1px solid var(--border)', cursor: 'grab' }}
                    >
                      <img src={frame.url} alt={frame.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                      <button onClick={e => { e.stopPropagation(); deleteFrame(frame.id) }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--danger)', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity var(--transition-fast)' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text tab */}
            {rightTab === 'text' && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ width: '100%', gap: '6px' }} onClick={addTextElement}>
                  <Icon.Plus /> Add Text Box
                </button>
                <div className="divider" />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Click <strong style={{ color: 'var(--text-secondary)' }}>Add Text Box</strong>, then select it on the canvas to edit content and formatting via the toolbar above.
                </p>
                <div style={{ marginTop: '8px' }}>
                  <p className="label">Quick fonts</p>
                  {[
                    { name: 'Cormorant', font: 'Cormorant Garamond, serif' },
                    { name: 'DM Sans', font: 'DM Sans, sans-serif' },
                    { name: 'Georgia', font: 'Georgia, serif' },
                    { name: 'Helvetica', font: 'Helvetica Neue, sans-serif' },
                    { name: 'Courier', font: 'Courier New, monospace' },
                  ].map(f => (
                    <div key={f.name} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontFamily: f.font, color: 'var(--text-secondary)', cursor: 'default', marginBottom: '2px', border: '1px solid transparent', transition: 'all var(--transition-fast)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
                    >{f.name} — Aa</div>
                  ))}
                </div>
              </div>
            )}

            {/* Backgrounds tab */}
            {rightTab === 'backgrounds' && currentPage && (
              <div style={{ padding: '12px', overflow: 'auto', flex: 1 }}>
                <p className="label">Current background</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '32px', height: '32px', background: currentPage.background, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexShrink: 0 }} />
                  <input type="color" value={currentPage.background.startsWith('#') ? currentPage.background : '#0a0a0a'} onChange={e => updatePageBg(e.target.value)} style={{ flex: 1, height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', background: 'none', padding: '2px' }} />
                </div>
                <p className="label">Solid colors</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {BG_PRESETS.map(color => (
                    <button key={color} className="color-swatch" style={{ background: color, outline: currentPage.background === color ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }} onClick={() => updatePageBg(color)} title={color} />
                  ))}
                </div>
                <p className="label">Gradient presets</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button key={i} onClick={() => updatePageBg(`linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`)} style={{ height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`, cursor: 'pointer', transition: 'transform var(--transition-fast)' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scaleY(1.06)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scaleY(1)')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Layouts tab */}
            {rightTab === 'layouts' && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Use <strong style={{ color: 'var(--accent)' }}>✨ AI Layout</strong> to generate a full album from your photos, or <strong style={{ color: 'var(--accent)' }}>✨ AI Restyle</strong> to update the style while keeping your photo positions.
                </p>
                <div className="divider" />
                <button className="btn btn-ai" style={{ width: '100%', gap: '8px', justifyContent: 'center' }} onClick={() => setShowAIGenerate(true)} disabled={isAnyAILoading || photos.length === 0}>
                  <Icon.Sparkle /> Generate Layout
                </button>
                {album.pages.some(p => p.elements.length > 0) && (
                  <button className="btn btn-ai" style={{ width: '100%', gap: '8px', justifyContent: 'center' }} onClick={() => setShowAIRefine(true)} disabled={isAnyAILoading}>
                    <Icon.Sparkle /> Restyle Album
                  </button>
                )}
                {photos.length === 0 && <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Upload photos first to use AI layout generation.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════ STATUS BAR ══════════════════ */}
      <div className="editor-statusbar">
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Page {currentPageIndex + 1} / {album.pages.length}</span>
        <div style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Drag photos from panel to canvas</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>⌘S Save · ⌘Z Undo · Del Remove</span>
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}
      {showAIGenerate && <AIGenerateModal onClose={() => setShowAIGenerate(false)} onGenerate={generateAILayout} loading={aiGenerating} />}
      {showAIRefine && <AIRefineModal onClose={() => setShowAIRefine(false)} onRefine={refineWithAI} loading={aiRefining} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={doExportPDF} />}
    </div>
  )
}
