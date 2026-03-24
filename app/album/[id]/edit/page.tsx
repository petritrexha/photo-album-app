'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useAlbumStore } from '@/lib/store'
import { useDropzone } from 'react-dropzone'
import { useTheme } from '@/lib/theme'
import { getCategoryConfig, detectCategoryFromTitle } from '@/lib/categoryConfig'
import type { Photo, Frame, PageElement } from '@/lib/supabase'

const AlbumCanvas = dynamic(() => import('@/components/AlbumCanvas'), { ssr: false })

// ── Upload helper ─────────────────────────────────────────────────────────────
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

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  ArrowLeft: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Undo:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>,
  Redo:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>,
  Save:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Check:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Download:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Sparkle:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>,
  Sun:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Plus:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Refresh:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
  Image:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Type:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Square:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>,
  Star:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Cursor:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l7 18 3-7 7-3L4 4z"/></svg>,
  Palette:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  Frame:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="6" y="6" width="12" height="12"/></svg>,
  AlertCircle: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Layers:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
}

// ── Reusable panel components ─────────────────────────────────────────────────
function PanelSection({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px',
          background: 'none', border: 'none',
          color: 'var(--text-muted)', fontSize: '10px',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          transition: 'color 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        {title}
        <span style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms ease', display: 'flex' }}>
          <Icons.ChevronDown />
        </span>
      </button>
      {open && (
        <div style={{ padding: '4px 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function SliderRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type="number" value={Math.round(value)} min={min} max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
          fontSize: '12px', padding: '6px 8px', borderRadius: '6px',
          outline: 'none', width: '100%',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

// ── AI Generate Modal ──────────────────────────────────────────────────────────
function AIGenerateModal({ onClose, onGenerate, loading }: {
  onClose: () => void; onGenerate: (prompt: string) => void; loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const examples = [
    '1970s Italian summer — warm film grain, golden hour, handwritten feel',
    'Dark moody wedding — black backgrounds, amber candlelight, Playfair fonts',
    'Minimal Japanese — white space, small clean text, very little decoration',
    'Vibrant travel diary — bright saturated colors, energetic layouts',
    'Cinematic black and white — dramatic contrast, editorial style',
  ]
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '40px', maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ color: 'var(--accent)' }}><Icons.Sparkle /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 500, color: 'var(--text-primary)' }}>Describe your album</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Describe any style or mood. Claude generates a complete layout — pages, positions, backgrounds, typography, captions.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 11px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{ex}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. A romantic Parisian honeymoon — soft pinks, elegant serif fonts, dreamy overlapping layouts…"
          rows={4} style={{ marginBottom: '20px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '42px', fontSize: '14px' }} onClick={() => onGenerate(prompt)} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: 'var(--accent)' }} /> : <Icons.Sparkle />}
            {loading ? 'Generating…' : 'Generate Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Refine Modal ────────────────────────────────────────────────────────────
function AIRefineModal({ onClose, onRefine, loading }: {
  onClose: () => void; onRefine: (prompt: string) => void; loading: boolean
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
            <div style={{ color: 'var(--accent)' }}><Icons.Sparkle /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Restyle with AI</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Describe the mood. Claude updates backgrounds, captions, and typography — your photo positions stay exactly where they are.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {presets.map(p => (
            <button key={p} onClick={() => setPrompt(p)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{p}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the style, mood, or vibe…" rows={3} style={{ marginBottom: '20px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '40px' }} onClick={() => onRefine(prompt)} disabled={loading || !prompt.trim()}>
            {loading ? <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: 'var(--accent)' }} /> : <Icons.Sparkle />}
            {loading ? 'Restyling…' : 'Restyle Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF Export Modal ───────────────────────────────────────────────────────────
type PrintFormat = 'a4-landscape' | 'a4-portrait' | 'square'
function ExportModal({ onClose, onExport }: {
  onClose: () => void; onExport: (format: PrintFormat, bleed: boolean) => Promise<void>
}) {
  const [format, setFormat] = useState<PrintFormat>('a4-landscape')
  const [bleed, setBleed] = useState(false)
  const [exporting, setExporting] = useState(false)
  const formats = [
    { id: 'a4-landscape' as PrintFormat, label: 'A4 Landscape', dims: '297 × 210 mm', desc: 'Standard print' },
    { id: 'a4-portrait'  as PrintFormat, label: 'A4 Portrait',  dims: '210 × 297 mm', desc: 'Tall pages' },
    { id: 'square'       as PrintFormat, label: 'Square',        dims: '210 × 210 mm', desc: 'Social friendly' },
  ]
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '40px', maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ color: 'var(--text-secondary)' }}><Icons.Download /></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Export as PDF</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rendered at 2× resolution for crisp print quality.</p>
        </div>
        <label className="label">Page format</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
          {formats.map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: format === f.id ? 'var(--accent-muted)' : 'var(--bg-tertiary)', border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all var(--transition-fast)', fontFamily: 'var(--font-body)' }}>
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
          <button className="btn btn-primary" style={{ flex: 2, gap: '8px', height: '42px' }} disabled={exporting}
            onClick={async () => { setExporting(true); await onExport(format, bleed); setExporting(false); onClose() }}>
            {exporting ? <><span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: '#0a0a0a' }} /> Exporting…</> : <><Icons.Download /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Error screen ───────────────────────────────────────────────────────────────
function LoadError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px', textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', background: 'var(--danger-muted)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
        <Icons.AlertCircle />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Could not load album</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ gap: '6px' }}><Icons.ArrowLeft /> Dashboard</button>
        <button className="btn btn-primary" onClick={onRetry} style={{ gap: '6px' }}><Icons.Refresh /> Try again</button>
      </div>
    </div>
  )
}

// ── Right panel — Properties for selected element ─────────────────────────────
function PropertiesPanel({ pageIndex }: { pageIndex: number }) {
  const { album, selectedElementId, updateElement, deleteElement } = useAlbumStore()
  const page = album?.pages[pageIndex]
  const el = page?.elements.find(e => e.id === selectedElementId)

  if (!el) return null

  const isText  = el.type === 'text'
  const isImage = el.type === 'image' || el.type === 'frame'

  function update(u: Partial<PageElement>) {
    updateElement(pageIndex, el!.id, u)
  }

  function toggleStyle(style: string) {
    const cur = el!.fontStyle || ''
    const has = cur.includes(style)
    update({ fontStyle: has ? cur.replace(style, '').trim() : `${cur} ${style}`.trim() })
  }

  const FONTS = [
    { label: 'Cormorant',  value: 'Cormorant Garamond, serif' },
    { label: 'Playfair',   value: 'Playfair Display, serif' },
    { label: 'DM Sans',    value: 'DM Sans, sans-serif' },
    { label: 'Georgia',    value: 'Georgia, serif' },
    { label: 'Helvetica',  value: 'Helvetica Neue, sans-serif' },
    { label: 'Courier',    value: 'Courier New, monospace' },
  ]

  const IMAGE_FILTERS = ['Original', 'B&W', 'Sepia', 'Vintage', 'Matte', 'Vivid', 'Faded']

  const sBtnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: '30px', padding: '0 10px', fontSize: '12px', fontFamily: 'var(--font-body)',
    borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer',
    background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
    transition: 'all 120ms ease',
  }
  const sBtnActive: React.CSSProperties = { ...sBtnBase, background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'rgba(212,140,58,0.35)' }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: 'var(--accent)', display: 'flex' }}>
            {isText ? <Icons.Type /> : <Icons.Image />}
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {isText ? 'Text' : el.type === 'frame' ? 'Frame' : 'Image'}
          </span>
        </div>
        <button
          onClick={() => deleteElement(pageIndex, el.id)}
          style={{ ...sBtnBase, padding: '0 8px', color: 'var(--danger)', borderColor: 'transparent', background: 'var(--danger-muted)' }}
          title="Delete element"
        >
          <Icons.Trash />
        </button>
      </div>

      {/* ── TEXT PROPERTIES ── */}
      {isText && (
        <>
          <PanelSection title="Content">
            <textarea
              value={el.text || ''}
              onChange={e => update({ text: e.target.value })}
              rows={3}
              style={{
                width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontFamily: el.fontFamily || 'Georgia, serif',
                fontSize: '13px', padding: '8px 10px', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
              Or double-click text on the canvas to edit inline
            </p>
          </PanelSection>

          <PanelSection title="Font">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <select
                value={el.fontFamily || 'Georgia, serif'}
                onChange={e => update({ fontFamily: e.target.value })}
                style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '7px 8px', borderRadius: '7px', outline: 'none', cursor: 'pointer' }}
              >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input
                type="number" value={el.fontSize || 18} min={6} max={160}
                onChange={e => update({ fontSize: parseInt(e.target.value) || 18 })}
                style={{ width: '56px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '7px 8px', borderRadius: '7px', outline: 'none', textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={el.fill?.startsWith('#') ? el.fill : '#f4f0ea'}
                onChange={e => update({ fill: e.target.value })}
                style={{ width: '32px', height: '32px', border: '1px solid var(--border)', borderRadius: '7px', cursor: 'pointer', padding: '2px', background: 'var(--bg-tertiary)' }}
                title="Text colour"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{el.fill || '#f4f0ea'}</span>
            </div>
          </PanelSection>

          <PanelSection title="Style">
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {[
                { s: 'bold',      label: 'B', extra: { fontWeight: 700 } },
                { s: 'italic',    label: 'I', extra: { fontStyle: 'italic' } },
                { s: 'underline', label: 'U', extra: { textDecoration: 'underline' } },
              ].map(({ s, label, extra }) => (
                <button key={s}
                  onClick={() => toggleStyle(s)}
                  style={{ ...(el.fontStyle?.includes(s) ? sBtnActive : sBtnBase), width: '36px', padding: 0, ...extra }}
                >{label}</button>
              ))}
              <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a}
                  onClick={() => update({ align: a })}
                  style={(el.align || 'left') === a ? sBtnActive : sBtnBase}
                  title={`Align ${a}`}
                >
                  {a === 'left' ? '⫷' : a === 'center' ? '≡' : '⫸'}
                </button>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Spacing">
            <SliderRow label="Line height" value={Math.round((el.lineHeight || 1.4) * 10) / 10} min={0.8} max={3} onChange={v => update({ lineHeight: v })} />
          </PanelSection>

          <PanelSection title="Opacity">
            <SliderRow label="Opacity" value={Math.round((el.opacity ?? 1) * 100)} min={0} max={100} onChange={v => update({ opacity: v / 100 })} />
          </PanelSection>
        </>
      )}

      {/* ── IMAGE PROPERTIES ── */}
      {isImage && (
        <>
          <PanelSection title="Position & Size">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <NumberInput label="X" value={el.x} onChange={v => update({ x: v })} />
              <NumberInput label="Y" value={el.y} onChange={v => update({ y: v })} />
              <NumberInput label="W" value={el.width} min={20} onChange={v => update({ width: v })} />
              <NumberInput label="H" value={el.height} min={20} onChange={v => update({ height: v })} />
            </div>
            <div style={{ marginTop: '10px' }}>
              <NumberInput label="Rotation °" value={el.rotation} min={-180} max={180} onChange={v => update({ rotation: v })} />
            </div>
          </PanelSection>

          {el.type !== 'frame' && (
            <PanelSection title="Filters" defaultOpen={false}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {IMAGE_FILTERS.map(f => (
                  <button key={f}
                    style={{ ...sBtnBase, padding: '5px 10px', fontSize: '11px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                  >{f}</button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-body)' }}>
                Full filter adjustments coming soon.
              </p>
            </PanelSection>
          )}

          <PanelSection title="Opacity">
            <SliderRow label="Opacity" value={Math.round((el.opacity ?? 1) * 100)} min={0} max={100} onChange={v => update({ opacity: v / 100 })} />
          </PanelSection>
        </>
      )}

      {/* Layer controls */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            const { bringToFront } = useAlbumStore.getState()
            bringToFront(pageIndex, el.id)
          }}
          style={{ ...sBtnBase, flex: 1, fontSize: '11px', gap: '4px' }}
        >↑ Front</button>
        <button
          onClick={() => {
            const { sendToBack } = useAlbumStore.getState()
            sendToBack(pageIndex, el.id)
          }}
          style={{ ...sBtnBase, flex: 1, fontSize: '11px', gap: '4px' }}
        >↓ Back</button>
      </div>
    </div>
  )
}

// ── Right panel tabs ───────────────────────────────────────────────────────────
type RightTab = 'photos' | 'backgrounds' | 'frames' | 'text'

// ── BG_PRESETS ──────────────────────────────────────────────────────
const BG_SOLID = [
  '#0a0a0a','#1a1a1a','#2a2018','#0d1a2a','#1a0d0d',
  '#ffffff','#f5f0e8','#faf8f4','#f0f4ff','#f0fff0',
  '#1a0a2a','#0a1a0a','#2a1a0a','#0a0a2a','#1a1a2a',
]

// ── Main Editor ────────────────────────────────────────────────────────────────
export default function AlbumEditorPage() {
  const router  = useRouter()
  const params  = useParams()
  const albumId = params.id as string
  const { theme, toggle } = useTheme()

  const {
    album, setAlbum, currentPageIndex, setCurrentPageIndex,
    photos, setPhotos, addPhoto,
    frames, setFrames, addFrame, removeFrame,
    addPage, deletePage, addElement,
    isDirty, setIsDirty, undo, selectedElementId, setSelectedElementId,
    deleteElement,
  } = useAlbumStore()

  const [showAIGenerate, setShowAIGenerate] = useState(false)
  const [showAIRefine,   setShowAIRefine]   = useState(false)
  const [showExport,     setShowExport]     = useState(false)
  const [rightTab,       setRightTab]       = useState<RightTab>('photos')
  const [editingTitle,   setEditingTitle]   = useState(false)
  const [title,          setTitle]          = useState('')
  const [saving,         setSaving]         = useState(false)
  const [aiGenerating,   setAiGenerating]   = useState(false)
  const [aiRefining,     setAiRefining]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [frameUploading, setFrameUploading] = useState(false)
  const [loadError,      setLoadError]      = useState<string | null>(null)
  const [loadAttempt,    setLoadAttempt]    = useState(0)
  const [activeTool,     setActiveTool]     = useState<'select' | 'text' | 'shape' | 'sticker'>('select')
  const [showPreview,    setShowPreview]    = useState(false)

  const savingRef   = useRef(false)
  savingRef.current = saving
  const frameInputRef = useRef<HTMLInputElement>(null)

  // Mobile detection (hoisted earlier to keep hook order stable)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ── Category config ─────────────────────────────────────────────
  const categoryId  = album ? detectCategoryFromTitle(album.title) : 'photo-book'
  const catConfig   = getCategoryConfig(categoryId)

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => { loadAlbum() }, [albumId, loadAttempt])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function loadAlbum() {
    setLoadError(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session) { router.push('/'); return }

      const { data: albumData, error: albumError } = await supabase.from('albums').select('*').eq('id', albumId).single()
      if (albumError) throw albumError
      if (!albumData) { router.push('/dashboard'); return }

      setAlbum(albumData)
      setTitle(albumData.title)

      const { data: photoData, error: photoError } = await supabase.from('photos').select('*').eq('album_id', albumId).order('created_at')
      if (photoError) throw photoError
      setPhotos(photoData || [])

      const { data: frameData, error: frameError } = await supabase.from('frames').select('*').order('created_at', { ascending: false })
      if (frameError) throw frameError
      setFrames(frameData || [])
    } catch (err: any) {
      console.error('Failed to load album:', err)
      const msg = err?.message || 'An unexpected error occurred'
      setLoadError(msg)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────
  const saveAlbum = useCallback(async () => {
    if (!album || savingRef.current) return
    setSaving(true)
    try {
      const { error } = await supabase.from('albums').update({ title: album.title, pages: album.pages, cover_url: album.cover_url }).eq('id', albumId)
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

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && selectedElementId) {
        e.preventDefault(); deleteElement(currentPageIndex, selectedElementId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAlbum() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'Escape' && !isInput) setSelectedElementId(null)
      if (e.key === 'v' && !isInput && !(e.ctrlKey || e.metaKey)) setActiveTool('select')
      if (e.key === 't' && !isInput) { setActiveTool('text') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedElementId, currentPageIndex, deleteElement, saveAlbum, undo, setSelectedElementId])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  // ── Photo upload ───────────────────────────────────────────────────
  const onPhotoDrop = useCallback(async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const file of files) {
      setUploadProgress(0)
      try {
        const result = await uploadWithProgress(file, 'photo-album-app', p => setUploadProgress(p))
        const { data: photo } = await supabase.from('photos').insert({ album_id: albumId, user_id: user.id, url: result.secure_url, cloudinary_id: result.public_id, width: result.width, height: result.height }).select().single()
        if (photo) addPhoto(photo)
      } catch (err) { console.error('Upload failed:', err) }
    }
    setUploadProgress(null)
  }, [albumId, addPhoto])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onPhotoDrop, accept: { 'image/*': [] }, multiple: true })

  // ── Frame upload ──────────────────────────────────────────────────
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
      const { data: saved } = await supabase.from('frames').insert({ user_id: user.id, name: file.name.replace(/\.[^/.]+$/, ''), url: cloudData.secure_url, cloudinary_id: cloudData.public_id, width: cloudData.width, height: cloudData.height, album_id: null }).select().single()
      if (saved) addFrame(saved)
    } catch (err) { console.error('Frame upload error:', err) }
    setFrameUploading(false)
  }
  async function deleteFrame(id: string) {
    await supabase.from('frames').delete().eq('id', id)
    removeFrame(id)
  }

  // ── AI Generate ────────────────────────────────────────────────────
  async function generateAILayout(prompt: string) {
    if (photos.length === 0) return
    setAiGenerating(true); setShowAIGenerate(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: Math.max(Math.ceil(photos.length / 3), 1),
          prompt: `${catConfig.aiPromptHint} ${prompt}`,
          mode: 'generate',
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Request failed (${res.status})`) }
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err: any) { console.error('AI generate error:', err) }
    setAiGenerating(false)
  }

  // ── AI Refine ──────────────────────────────────────────────────────
  async function refineWithAI(prompt: string) {
    if (!album) return
    setAiRefining(true); setShowAIRefine(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mode: 'refine', prompt, currentPages: album.pages, photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })), pageCount: album.pages.length }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Request failed (${res.status})`) }
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
    } catch (err: any) { console.error('AI refine error:', err) }
    setAiRefining(false)
  }

  // ── PDF Export ──────────────────────────────────────────────────────
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

  function setCoverPhoto(photo: Photo) {
    if (!album) return
    setAlbum({ ...album, cover_url: photo.url })
    supabase.from('albums').update({ cover_url: photo.url }).eq('id', albumId)
  }

  function updatePageBg(color: string) {
    if (!album) return
    const pages = album.pages.map((p, i) => i === currentPageIndex ? { ...p, background: color } : p)
    setAlbum({ ...album, pages }); setIsDirty(true)
  }

  function addTextElement() {
    addElement(currentPageIndex, {
      id: crypto.randomUUID(), type: 'text',
      text: catConfig.placeholderText,
      x: Math.round(catConfig.canvasW * 0.1),
      y: Math.round(catConfig.canvasH * 0.8),
      width: Math.round(catConfig.canvasW * 0.8), height: 36,
      fontSize: 20, fill: '#f4f0ea',
      fontFamily: 'Georgia, serif', fontStyle: 'italic',
      align: 'center', lineHeight: 1.4, rotation: 0,
    })
  }

  const isAnyAILoading = aiGenerating || aiRefining
  const currentPage = album?.pages[currentPageIndex]
  const hasElements = album?.pages.some(p => p.elements.length > 0) ?? false

  if (loadError) return <LoadError message={loadError} onRetry={() => setLoadAttempt(a => a + 1)} onBack={() => router.push('/dashboard')} />
  if (!album) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div className="spinner" style={{ width: '24px', height: '24px' }} />
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</p>
    </div>
  )

  // ── Tool strip button ─────────────────────────────────────────────
  const ToolBtn = ({ icon, id, label, onClick, isActive }: { icon: React.ReactNode; id?: string; label: string; onClick?: () => void; isActive?: boolean }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '4px', width: '52px', height: '52px', padding: 0,
        background: isActive ? 'var(--accent-muted)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        fontSize: '9px', fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.05em',
      }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  // Mobile simplified view
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <div style={{
          height: '56px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', gap: '8px', flexShrink: 0, zIndex: 50,
        }}>
          <button className="btn btn-icon" onClick={() => router.push('/dashboard')} style={{ width: '36px', height: '36px', color: 'var(--text-secondary)' }}>
            <Icons.ArrowLeft />
          </button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Editing</div>
          </div>
          <button className="btn btn-icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ width: '36px', height: '36px', color: 'var(--text-secondary)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '0', zIndex: 40 }}>
            <button onClick={() => { setShowAIGenerate(true); setMobileMenuOpen(false) }} disabled={photos.length === 0} style={{ textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>✨ AI Layout</button>
            {hasElements && (
              <button onClick={() => { setShowAIRefine(true); setMobileMenuOpen(false) }} style={{ textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>✨ Restyle</button>
            )}
            <button onClick={() => { setShowExport(true); setMobileMenuOpen(false) }} style={{ textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>📥 Export</button>
            <button onClick={() => { saveAlbum(); setMobileMenuOpen(false) }} disabled={!isDirty || saving} style={{ textAlign: 'left', padding: '12px 16px', background: isDirty ? 'none' : 'var(--bg-surface)', border: 'none', color: isDirty ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all var(--transition-fast)', opacity: isDirty ? 1 : 0.6 }} onMouseEnter={e => { if (isDirty) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}} onMouseLeave={e => { if (isDirty) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}}>{saving ? 'Saving…' : isDirty ? '💾 Save' : '✓ Saved'}</button>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
              <button onClick={() => toggle()} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            </div>
          </div>
        )}

        {/* Mobile simplified flow */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '16px' }}>
          {photos.length === 0 ? (
            // Step 1: Upload
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <div style={{ fontSize: '48px' }}>📸</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>Upload Photos</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '280px' }}>Add photos to your album. You can arrange them with AI or manually.</p>
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ width: '100%', maxWidth: '240px', padding: '20px 12px', marginTop: '8px' }}>
                <input {...getInputProps()} />
                {uploadProgress !== null ? (
                  <div>
                    <div className="progress-bar" style={{ marginBottom: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>{uploadProgress}%</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>📁</div>
                    <p style={{ fontSize: '12px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{isDragActive ? 'Drop here' : 'Tap to select'}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Step 2: AI Layout or Manual
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Photos ({photos.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {photos.map(photo => (
                    <div key={photo.id} style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>

              {!hasElements && (
                <>
                  <button className="btn btn-ai" onClick={() => setShowAIGenerate(true)} disabled={aiGenerating} style={{ width: '100%', gap: '8px', height: '44px', fontSize: '14px', justifyContent: 'center', fontWeight: 500 }}>
                    {aiGenerating ? <span className="spinner" style={{ width: '14px', height: '14px', borderTopColor: 'var(--accent)' }} /> : '✨'}
                    {aiGenerating ? 'Generating Layout…' : 'Generate Layout with AI'}
                  </button>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>Describe your album style and Claude will create a beautiful layout</p>
                </>
              )}

              {hasElements && (
                <>
                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>Layout created! {album?.pages.length} pages</p>
                    {!showPreview && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(true)} style={{ width: '100%', marginTop: '8px', height: '32px' }}>Preview Album</button>
                    )}
                  </div>

                  {hasElements && (
                    <button className="btn btn-secondary" onClick={() => setShowAIRefine(true)} disabled={aiRefining} style={{ width: '100%', gap: '8px', height: '40px', fontSize: '13px', justifyContent: 'center' }}>
                      {aiRefining ? '✨ Restyling…' : '✨ Adjust Style'}
                    </button>
                  )}

                  <button className="btn btn-primary" onClick={() => setShowExport(true)} style={{ width: '100%', gap: '6px', height: '44px', fontSize: '14px', justifyContent: 'center' }}>
                    📥 Export as PDF
                  </button>

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-body)', padding: '8px' }}>💡 <strong>Tip:</strong> For detailed editing, use a tablet or desktop</p>
                </>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => { getRootProps().onClick?.({} as any) }} style={{ width: '100%', height: '36px', fontSize: '12px' }}>+ Add More Photos</button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showAIGenerate && <AIGenerateModal onClose={() => setShowAIGenerate(false)} onGenerate={generateAILayout} loading={aiGenerating} />}
        {showAIRefine && <AIRefineModal onClose={() => setShowAIRefine(false)} onRefine={refineWithAI} loading={aiRefining} />}
        {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={doExportPDF} />}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* ══ TOPBAR ══════════════════════════════════════════════════════ */}
      <div style={{
        height: '50px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        flexShrink: 0, position: 'relative', zIndex: 10,
      }}>
        {/* Back + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '2px', borderRight: '1px solid var(--border)', height: '100%' }}>
          <button className="btn btn-icon" onClick={() => router.push('/dashboard')} style={{ width: '34px', height: '34px', color: 'var(--text-secondary)' }}>
            <Icons.ArrowLeft />
          </button>
          <div style={{ width: '24px', height: '24px', background: 'var(--accent)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a"/>
              <rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8"/>
              <rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '0 12px', borderRight: '1px solid var(--border)', height: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editingTitle ? (
            <input autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => { updateTitle(title); setEditingTitle(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { updateTitle(title); setEditingTitle(false) } }}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '14px', padding: '4px 10px', borderRadius: '6px', outline: 'none', width: '180px' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setEditingTitle(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '14px', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >{title}</button>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', padding: '0 6px', letterSpacing: '0.04em' }}>
                {catConfig.canvasLabel}
              </span>
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', borderRight: '1px solid var(--border)', height: '100%', gap: '2px' }}>
          <button className="btn btn-icon" onClick={undo} title="Undo (⌘Z)" style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }}><Icons.Undo /></button>
        </div>

        <div style={{ flex: 1 }} />

        {/* AI buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRight: '1px solid var(--border)', height: '100%' }}>
          <button className="btn btn-ai btn-sm" onClick={() => setShowAIGenerate(true)} disabled={isAnyAILoading || photos.length === 0} style={{ gap: '5px', height: '30px', fontSize: '12px' }}>
            {aiGenerating ? <span className="spinner" style={{ width: '10px', height: '10px', borderTopColor: 'var(--accent)' }} /> : <Icons.Sparkle />}
            {aiGenerating ? 'Generating…' : 'AI Layout'}
          </button>
          {hasElements && (
            <button className="btn btn-ai btn-sm" onClick={() => setShowAIRefine(true)} disabled={isAnyAILoading} style={{ gap: '5px', height: '30px', fontSize: '12px' }}>
              {aiRefining ? <span className="spinner" style={{ width: '10px', height: '10px', borderTopColor: 'var(--accent)' }} /> : <Icons.Sparkle />}
              {aiRefining ? 'Restyling…' : 'AI Restyle'}
            </button>
          )}
        </div>

        {/* Save / Export / Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', height: '100%' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(true)} style={{ gap: '5px', color: 'var(--text-secondary)', height: '30px', fontSize: '12px' }}>
            <Icons.Download /> Export
          </button>
          <button
            className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-ghost'}`}
            onClick={saveAlbum}
            disabled={saving || !isDirty}
            style={{ gap: '5px', minWidth: '70px', height: '30px', fontSize: '12px', color: isDirty ? undefined : 'var(--text-muted)' }}
          >
            {saving
              ? <span className="spinner" style={{ width: '10px', height: '10px', borderTopColor: isDirty ? '#0a0a0a' : 'var(--accent)' }} />
              : isDirty ? <><Icons.Save /> Save</> : <><Icons.Check /> Saved</>
            }
          </button>
          <button className="btn btn-icon" onClick={toggle} style={{ color: 'var(--text-secondary)', width: '30px', height: '30px' }}>
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Pages panel ── */}
        <div style={{
          width: '72px',
          background: 'var(--panel-bg)',
          borderRight: '1px solid var(--panel-border)',
          display: 'flex', flexDirection: 'column',
          padding: '12px 8px',
          gap: '8px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <p style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: '4px' }}>Pages</p>
          {album.pages.map((page, i) => (
            <div
              key={page.id}
              onClick={() => setCurrentPageIndex(i)}
              style={{
                aspectRatio: `${catConfig.canvasW} / ${catConfig.canvasH}`,
                background: page.background?.startsWith('#') ? page.background : 'var(--bg-tertiary)',
                borderRadius: '4px',
                border: `1.5px solid ${i === currentPageIndex ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                transition: 'border-color 150ms ease',
                boxShadow: i === currentPageIndex ? '0 0 0 2px var(--accent-muted)' : 'none',
              }}
            >
              <span style={{ fontSize: '10px', color: i === currentPageIndex ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
              {album.pages.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); deletePage(i) }}
                  style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-muted)', width: '14px', height: '14px', borderRadius: '50%', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >×</button>
              )}
            </div>
          ))}
          <button
            onClick={addPage}
            style={{ aspectRatio: `${catConfig.canvasW} / ${catConfig.canvasH}`, background: 'none', border: '1.5px dashed var(--border)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 150ms, color 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >+</button>
        </div>

        {/* ── Left tool strip ── */}
        <div style={{
          width: '52px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '8px', paddingBottom: '8px',
          gap: '2px',
          flexShrink: 0,
        }}>
          {/* Drawing tools */}
          <ToolBtn icon={<Icons.Cursor />} label="Select" isActive={activeTool === 'select'} onClick={() => setActiveTool('select')} />
          <ToolBtn icon={<Icons.Type />}   label="Text"   isActive={activeTool === 'text'}   onClick={() => { setActiveTool('text'); setRightTab('photos') }} />
          {catConfig.availableTools.includes('shape') && (
            <ToolBtn icon={<Icons.Square />} label="Shape" isActive={activeTool === 'shape'} onClick={() => setActiveTool('shape')} />
          )}
          {catConfig.availableTools.includes('sticker') && (
            <ToolBtn icon={<Icons.Star />} label="Sticker" isActive={activeTool === 'sticker'} onClick={() => setActiveTool('sticker')} />
          )}

          {/* Divider */}
          <div style={{ width: '32px', height: '1px', background: 'var(--border)', margin: '6px 0' }} />

          {/* Panel switchers */}
          <ToolBtn icon={<Icons.Image />}   label="Photos" isActive={rightTab === 'photos' && activeTool === 'select'}   onClick={() => { setRightTab('photos');      setActiveTool('select') }} />
          <ToolBtn icon={<Icons.Palette />} label="Bg"     isActive={rightTab === 'backgrounds' && activeTool === 'select'} onClick={() => { setRightTab('backgrounds'); setActiveTool('select') }} />
          <ToolBtn icon={<Icons.Frame />}   label="Frames" isActive={rightTab === 'frames' && activeTool === 'select'}   onClick={() => { setRightTab('frames');      setActiveTool('select') }} />

          <div style={{ flex: 1 }} />

          {/* Delete shortcut */}
          {selectedElementId && (
            <button
              onClick={() => deleteElement(currentPageIndex, selectedElementId)}
              title="Delete selected"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '52px', height: '44px', background: 'var(--danger-muted)', border: 'none', borderLeft: '2px solid var(--danger)', color: 'var(--danger)', cursor: 'pointer', fontSize: '9px', fontFamily: 'var(--font-body)', fontWeight: 600 }}
            >
              <Icons.Trash />
              <span>Del</span>
            </button>
          )}
        </div>

        {/* ── Canvas Area ── */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--canvas-bg)',
        }}>
          {/* Tool hint bar */}
          <div style={{
            height: '32px', flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: '12px',
          }}>
            {activeTool === 'text' && (
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
                ✦ Click anywhere on the canvas to add a text box
              </span>
            )}
            {activeTool === 'select' && selectedElementId && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Drag to move · handles to resize · double-click text to edit inline
              </span>
            )}
            {activeTool === 'select' && !selectedElementId && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Click to select · drag photos from panel · T key for text tool
              </span>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '10px', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>
              {catConfig.canvasW} × {catConfig.canvasH}
            </span>
          </div>

          <AlbumCanvas
            canvasW={catConfig.canvasW}
            canvasH={catConfig.canvasH}
            activeTool={activeTool}
            onElementAdded={() => setActiveTool('select')}
          />
        </div>

        {/* ── Right Panel ── */}
        <div style={{
          width: '264px',
          background: 'var(--panel-bg)',
          borderLeft: '1px solid var(--panel-border)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
        }}>

          {/* If element selected → show properties */}
          {selectedElementId ? (
            <PropertiesPanel pageIndex={currentPageIndex} />
          ) : (
            <>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                {([
                  { id: 'photos'      as RightTab, label: 'Photos' },
                  { id: 'backgrounds' as RightTab, label: 'Bg' },
                  { id: 'frames'      as RightTab, label: 'Frames' },
                  { id: 'text'        as RightTab, label: 'Text' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    style={{
                      flex: 1,
                      background: 'none', border: 'none',
                      borderBottom: `2px solid ${rightTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                      color: rightTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '10px 4px 8px',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      transition: 'color 150ms ease, border-color 150ms ease',
                    }}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Photos */}
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
                            <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}><Icons.Image /></div>
                            <p style={{ fontSize: '12px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                              {isDragActive ? 'Drop photos here' : 'Drop or click to upload'}
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
                          <button title="Set as cover" onClick={() => setCoverPhoto(photo)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity var(--transition-fast), background var(--transition-fast)', fontSize: '10px', color: '#fff', fontFamily: 'var(--font-body)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.45)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}
                          >⭐ Cover</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backgrounds */}
                {rightTab === 'backgrounds' && currentPage && (
                  <div style={{ padding: '12px', overflow: 'auto', flex: 1 }}>
                    <p className="label">Current background</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ width: '32px', height: '32px', background: currentPage.background, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexShrink: 0 }} />
                      <input type="color"
                        value={currentPage.background.startsWith('#') ? currentPage.background : '#0f0f0f'}
                        onChange={e => updatePageBg(e.target.value)}
                        style={{ flex: 1, height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', background: 'none', padding: '2px' }}
                      />
                    </div>

                    <p className="label">Category presets</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {catConfig.starterBackgrounds.map(color => (
                        <button key={color} className="color-swatch"
                          style={{ background: color, outline: currentPage.background === color ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }}
                          onClick={() => updatePageBg(color)} title={color}
                        />
                      ))}
                    </div>

                    <p className="label">Gradient presets</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {catConfig.starterGradients.map((g, i) => (
                        <button key={i}
                          onClick={() => updatePageBg(`linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`)}
                          style={{ height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`, cursor: 'pointer', transition: 'transform var(--transition-fast)', display: 'flex', alignItems: 'center', padding: '0 10px' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scaleY(1.06)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scaleY(1)')}
                        >
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Frames */}
                {rightTab === 'frames' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                      <input type="file" accept="image/*" ref={frameInputRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFrame(e.target.files[0])} />
                      <button className="btn btn-secondary" style={{ width: '100%', gap: '6px', borderStyle: 'dashed', fontSize: '12px', height: '36px' }} onClick={() => frameInputRef.current?.click()} disabled={frameUploading}>
                        {frameUploading ? <span className="spinner" style={{ width: '12px', height: '12px' }} /> : <Icons.Plus />}
                        {frameUploading ? 'Uploading…' : 'Upload PNG Frame'}
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
                          <button onClick={e => { e.stopPropagation(); deleteFrame(frame.id) }}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--danger)', width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity var(--transition-fast)' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text styles quick-add */}
                {rightTab === 'text' && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                    <button className="btn btn-secondary" style={{ width: '100%', gap: '6px', height: '36px', fontSize: '12px' }} onClick={addTextElement}>
                      <Icons.Plus /> Add Text Box
                    </button>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Quick styles</p>
                    {[
                      { name: 'Large Title', fontSize: 36, fontFamily: 'Playfair Display, serif', fontStyle: 'italic', desc: 'Playfair · 36px · Italic' },
                      { name: 'Heading',     fontSize: 24, fontFamily: 'Cormorant Garamond, serif', fontStyle: '', desc: 'Cormorant · 24px' },
                      { name: 'Subheading',  fontSize: 18, fontFamily: 'DM Sans, sans-serif', fontStyle: '', desc: 'DM Sans · 18px' },
                      { name: 'Caption',     fontSize: 14, fontFamily: 'Georgia, serif', fontStyle: 'italic', desc: 'Georgia · 14px · Italic' },
                      { name: 'Small Label', fontSize: 11, fontFamily: 'Helvetica Neue, sans-serif', fontStyle: '', desc: 'Helvetica · 11px' },
                    ].map(style => (
                      <button
                        key={style.name}
                        onClick={() => {
                          addElement(currentPageIndex, {
                            id: crypto.randomUUID(), type: 'text',
                            text: style.name,
                            x: Math.round(catConfig.canvasW * 0.1),
                            y: Math.round(catConfig.canvasH * 0.5),
                            width: Math.round(catConfig.canvasW * 0.8), height: style.fontSize * 2,
                            fontSize: style.fontSize, fill: '#f4f0ea',
                            fontFamily: style.fontFamily, fontStyle: style.fontStyle,
                            align: 'center', lineHeight: 1.3, rotation: 0,
                          })
                        }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          padding: '10px 12px', gap: '2px',
                          background: 'var(--bg-surface)', border: '1px solid var(--border)',
                          borderRadius: '8px', cursor: 'pointer', width: '100%',
                          transition: 'border-color 150ms ease, background 150ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
                      >
                        <span style={{ fontFamily: style.fontFamily, fontSize: Math.min(style.fontSize, 20) + 'px', fontStyle: style.fontStyle || 'normal', color: 'var(--text-primary)', lineHeight: 1.2 }}>{style.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{style.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ STATUSBAR ══════════════════════════════════════════════════ */}
      <div style={{
        height: '26px', flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: '16px',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Page {currentPageIndex + 1} / {album.pages.length}</span>
        <div style={{ width: '1px', height: '10px', background: 'var(--border)' }} />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{catConfig.canvasW} × {catConfig.canvasH}px</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '10px', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>⌘S Save · ⌘Z Undo · Del Remove · T Text tool · V Select</span>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}
      {showAIGenerate && <AIGenerateModal onClose={() => setShowAIGenerate(false)} onGenerate={generateAILayout} loading={aiGenerating} />}
      {showAIRefine   && <AIRefineModal   onClose={() => setShowAIRefine(false)}   onRefine={refineWithAI}   loading={aiRefining}   />}
      {showExport     && <ExportModal     onClose={() => setShowExport(false)}     onExport={doExportPDF}                            />}
    </div>
  )
}
