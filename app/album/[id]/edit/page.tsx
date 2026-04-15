'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { useAlbumStore } from '@/lib/store'
import { useDropzone } from 'react-dropzone'
import { useTheme } from '@/lib/theme'
import { getCategoryConfig, detectCategoryFromTitle } from '@/lib/categoryConfig'
import Toast from '@/components/Toast'
import { getErrorMessage, throwIfSupabaseError } from '@/lib/errors'
import type { Photo, Frame, PageElement } from '@/lib/supabase'

const AlbumCanvas = dynamic(() => import('@/components/AlbumCanvas'), { ssr: false })


// ── Minimal icon set ─────────────────────────────────────────────────────────
const I = {
  Back: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>,
  Save: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Sparkle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>,
  Undo: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>,
  Sun: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  Moon: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  Plus: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Trash: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
  Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>,
  Help: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Alert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  // Right panel tab icons
  BgIcon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>,
  TextIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  StickerIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 2a10 10 0 0 0-9.95 9H12V2z" /><circle cx="12" cy="12" r="10" /><path d="M12 12v10" /></svg>,
  PagesIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  LayersIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  ImageIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  FrameIcon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="2" /><rect x="6" y="6" width="12" height="12" /></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
}

// ── AI Generate Modal ──────────────────────────────────────────────────────────
function AIStyleModal({ onClose, onGenerate, loading }: {
  onClose: () => void; onGenerate: (p: string) => void; loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const examples = [
    '1970s Italian summer — warm film grain, golden hour',
    'Dark moody wedding — black backgrounds, gold accents',
    'Minimal Japanese — white space, small clean text',
    'Vibrant travel — bright saturated colors, energetic',
    'Cinematic black & white — dramatic contrast, editorial',
  ]
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '36px', maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--accent)' }}><I.Sparkle /></span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Describe your album style</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Claude generates a complete layout — pages, positions, backgrounds, typography, captions.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 11px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{ex}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. A romantic Parisian honeymoon — soft pinks, elegant serif fonts, dreamy overlapping layouts…"
          rows={3} style={{ marginBottom: '18px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '40px' }} onClick={() => onGenerate(prompt)} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--accent)' }} /> : <I.Sparkle />}
            {loading ? 'Generating…' : 'Generate Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI Refine Modal ────────────────────────────────────────────────────────────
function AIRefineModal({ onClose, onRefine, loading }: {
  onClose: () => void; onRefine: (p: string) => void; loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const presets = [
    'Dark moody — black background, gold serif fonts',
    'Minimal — white space, clean sans-serif, muted tones',
    'Warm summer — cream backgrounds, golden captions',
    'Editorial — bold typography, high contrast',
    'Romantic vintage — muted pinks, ornate fonts',
  ]
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '36px', maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--accent)' }}><I.Sparkle /></span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>Restyle with AI</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Claude updates colours, captions and typography — photo positions stay exactly where they are.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {presets.map(p => (
            <button key={p} onClick={() => setPrompt(p)}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            >{p}</button>
          ))}
        </div>
        <textarea className="input textarea" value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the mood…" rows={3} style={{ marginBottom: '18px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-ai" style={{ flex: 2, gap: '8px', height: '38px' }} onClick={() => onRefine(prompt)} disabled={loading || !prompt.trim()}>
            {loading ? <span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: 'var(--accent)' }} /> : <I.Sparkle />}
            {loading ? 'Restyling…' : 'Restyle Album'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Export Modal ──────────────────────────────────────────────────────────────
type PrintFormat = 'a4-landscape' | 'a4-portrait' | 'square'

function ExportModal({ onClose, onExport }: {
  onClose: () => void; onExport: (f: PrintFormat, b: boolean) => Promise<void>
}) {
  const [format, setFormat] = useState<PrintFormat>('a4-landscape')
  const [bleed, setBleed] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fmts = [
    { id: 'a4-landscape' as PrintFormat, label: 'A4 Landscape', dims: '297 × 210 mm' },
    { id: 'a4-portrait' as PrintFormat, label: 'A4 Portrait', dims: '210 × 297 mm' },
    { id: 'square' as PrintFormat, label: 'Square', dims: '210 × 210 mm' },
  ]
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '36px', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <I.Download />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>Export as PDF</h2>
        </div>
        <p className="label">Format</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
          {fmts.map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: format === f.id ? 'var(--accent-muted)' : 'var(--bg-tertiary)', border: `1.5px solid ${format === f.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: format === f.id ? 'var(--accent)' : 'var(--text-primary)' }}>{f.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{f.dims}</span>
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '24px' }}>
          <input type="checkbox" checked={bleed} onChange={e => setBleed(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Add 3mm bleed margins</span>
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2, gap: '8px', height: '40px' }} disabled={exporting}
            onClick={async () => { setExporting(true); await onExport(format, bleed); setExporting(false); onClose() }}>
            {exporting ? <><span className="spinner" style={{ width: '12px', height: '12px', borderTopColor: '#0a0a0a' }} /> Exporting…</> : <><I.Download /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ask for Help Modal (stub) ──────────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay animate-fade-in" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="animate-scale-in modal" style={{ padding: '36px', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--accent-muted)', border: '1px solid rgba(200,132,46,0.25)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)' }}>
            <I.Help />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>AI Assistant</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            An AI assistant trained on Folio's features is coming soon. It will help you with layout ideas, design tips, and step-by-step guidance.
          </p>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Quick tips:</strong><br />
            · Drag photos from the left panel onto the canvas<br />
            · Double-click any text to edit it inline<br />
            · Right-click elements for layer options<br />
            · ⌘S to save · ⌘Z to undo · Del to remove selected
          </p>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', height: '40px' }} onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

// ── Properties Panel (right panel when element selected) ─────────────────────
function PanelSection({ title, children, open: defaultOpen = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
      >
        {title}
        <span style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 200ms', display: 'flex' }}><I.ChevronDown /></span>
      </button>
      {open && <div style={{ padding: '4px 14px 14px' }}>{children}</div>}
    </div>
  )
}

function SliderRow({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
    </div>
  )
}

function PropertiesPanel({ pageIndex }: { pageIndex: number }) {
  const { album, selectedElementId, updateElement, deleteElement, bringToFront, sendToBack } = useAlbumStore()
  const page = album?.pages[pageIndex]
  const el = page?.elements.find(e => e.id === selectedElementId)
  if (!el) return null

  const isText = el.type === 'text'
  const isImage = el.type === 'image' || el.type === 'frame'

  function update(u: Partial<PageElement>) { updateElement(pageIndex, el!.id, u) }

  function toggleStyle(s: string) {
    const cur = el!.fontStyle || ''
    update({ fontStyle: cur.includes(s) ? cur.replace(s, '').trim() : `${cur} ${s}`.trim() })
  }

  const FONTS = [
    { label: 'Cormorant', value: 'Cormorant Garamond, serif' },
    { label: 'Playfair', value: 'Playfair Display, serif' },
    { label: 'DM Sans', value: 'DM Sans, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Helvetica', value: 'Helvetica Neue, sans-serif' },
    { label: 'Courier', value: 'Courier New, monospace' },
  ]

  const sBtnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '28px', padding: '0 9px', fontSize: '12px', fontFamily: 'var(--font-body)', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', transition: 'all 120ms ease' }
  const sBtnActive: React.CSSProperties = { ...sBtnBase, background: 'var(--accent-muted)', color: 'var(--accent)', borderColor: 'rgba(200,132,46,0.35)' }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {isText ? 'Text Properties' : el.type === 'frame' ? 'Frame' : 'Image Properties'}
        </span>
        <button onClick={() => deleteElement(pageIndex, el.id)}
          style={{ ...sBtnBase, padding: '0 8px', color: 'var(--danger)', borderColor: 'transparent', background: 'var(--danger-muted)' }} title="Delete">
          <I.Trash />
        </button>
      </div>

      {/* TEXT */}
      {isText && (
        <>
          <PanelSection title="Content">
            <textarea value={el.text || ''} onChange={e => update({ text: e.target.value })} rows={3}
              style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-primary)', fontFamily: el.fontFamily || 'Georgia, serif', fontSize: '13px', padding: '8px 10px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </PanelSection>

          <PanelSection title="Font">
            <div style={{ display: 'flex', gap: '7px', marginBottom: '9px' }}>
              <select value={el.fontFamily || 'Georgia, serif'} onChange={e => update({ fontFamily: e.target.value })}
                style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '6px 8px', borderRadius: '7px', outline: 'none', cursor: 'pointer' }}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input type="number" value={el.fontSize || 18} min={6} max={160}
                onChange={e => update({ fontSize: parseInt(e.target.value) || 18 })}
                style={{ width: '52px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '6px 7px', borderRadius: '7px', outline: 'none', textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <input type="color" value={el.fill?.startsWith('#') ? el.fill : '#f4f0ea'}
                onChange={e => update({ fill: e.target.value })}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '2px', background: 'var(--bg-tertiary)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{el.fill || '#f4f0ea'}</span>
            </div>
          </PanelSection>

          <PanelSection title="Style">
            <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {[
                { s: 'bold', label: 'B', extra: { fontWeight: 700 } },
                { s: 'italic', label: 'I', extra: { fontStyle: 'italic' } },
                { s: 'underline', label: 'U', extra: { textDecoration: 'underline' } },
              ].map(({ s, label, extra }) => (
                <button key={s} onClick={() => toggleStyle(s)}
                  style={{ ...(el.fontStyle?.includes(s) ? sBtnActive : sBtnBase), width: '34px', padding: 0, ...extra }}>
                  {label}
                </button>
              ))}
              <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch' }} />
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => update({ align: a })}
                  style={(el.align || 'left') === a ? sBtnActive : sBtnBase} title={`Align ${a}`}>
                  {a === 'left' ? '⫷' : a === 'center' ? '≡' : '⫸'}
                </button>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Spacing" open={false}>
            {/* ── FIX: step={0.1} so line height increments properly ── */}
            <SliderRow label="Line height" value={parseFloat((el.lineHeight || 1.4).toFixed(1))} min={0.8} max={3} step={0.1} onChange={v => update({ lineHeight: v })} />
          </PanelSection>

          <PanelSection title="Opacity" open={false}>
            <SliderRow label="Opacity %" value={Math.round((el.opacity ?? 1) * 100)} min={0} max={100} onChange={v => update({ opacity: v / 100 })} />
          </PanelSection>
        </>
      )}

      {/* IMAGE / FRAME */}
      {isImage && (
        <>
          <PanelSection title="Position & Size">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              {[
                { label: 'X', key: 'x' as const }, { label: 'Y', key: 'y' as const },
                { label: 'W', key: 'width' as const }, { label: 'H', key: 'height' as const },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{f.label}</span>
                  <input type="number" value={Math.round(el[f.key] as number)} min={f.key === 'width' || f.key === 'height' ? 20 : undefined}
                    onChange={e => update({ [f.key]: Number(e.target.value) })}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '5px 7px', borderRadius: '6px', outline: 'none', width: '100%' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Rotation°</span>
              <input type="number" value={Math.round(el.rotation || 0)} min={-180} max={180}
                onChange={e => update({ rotation: Number(e.target.value) })}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '5px 7px', borderRadius: '6px', outline: 'none', width: '100%' }}
              />
            </div>
          </PanelSection>
          <PanelSection title="Opacity" open={false}>
            <SliderRow label="Opacity %" value={Math.round((el.opacity ?? 1) * 100)} min={0} max={100} onChange={v => update({ opacity: v / 100 })} />
          </PanelSection>
        </>
      )}

      {/* Layer controls */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '7px' }}>
        <button onClick={() => bringToFront(pageIndex, el.id)} style={{ ...sBtnBase, flex: 1, fontSize: '11px' }}>↑ Front</button>
        <button onClick={() => sendToBack(pageIndex, el.id)} style={{ ...sBtnBase, flex: 1, fontSize: '11px' }}>↓ Back</button>
      </div>
    </div>
  )
}

// ── Right panel tab content ───────────────────────────────────────────────────
type RightTab = 'bg' | 'text' | 'stickers' | 'pages'

function BgTabContent({ pageIndex, catConfig }: { pageIndex: number; catConfig: any }) {
  const { album, setAlbum, setIsDirty } = useAlbumStore()
  const currentPage = album?.pages[pageIndex]

  function updatePageBg(color: string) {
    if (!album) return
    const pages = album.pages.map((p, i) => i === pageIndex ? { ...p, background: color } : p)
    setAlbum({ ...album, pages }); setIsDirty(true)
  }

  return (
    <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
      <p className="label">Current</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: '30px', height: '30px', background: currentPage?.background || '#0f0f0f', borderRadius: '6px', border: '1px solid var(--border)', flexShrink: 0 }} />
        <input type="color"
          value={(currentPage?.background?.startsWith('#') ? currentPage.background : '#0f0f0f')}
          onChange={e => updatePageBg(e.target.value)}
          style={{ flex: 1, height: '30px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', background: 'none', padding: '2px' }}
        />
      </div>

      <p className="label">Presets</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
        {catConfig.starterBackgrounds.map((color: string) => (
          <button key={color} onClick={() => updatePageBg(color)}
            style={{ width: '22px', height: '22px', background: color, borderRadius: '4px', border: `1.5px solid ${currentPage?.background === color ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', outline: currentPage?.background === color ? '2px solid var(--accent)' : 'none', outlineOffset: '2px' }}
          />
        ))}
      </div>

      <p className="label">Gradients</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {catConfig.starterGradients.map((g: any, i: number) => (
          <button key={i} onClick={() => updatePageBg(`linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`)}
            style={{ height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 10px', transition: 'transform var(--transition-fast)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scaleY(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scaleY(1)')}
          >
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)' }}>{g.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TextTabContent({ pageIndex, catConfig, onAddText }: { pageIndex: number; catConfig: any; onAddText: (style: any) => void }) {
  const STYLES = [
    { name: 'Large Title', fontSize: 36, fontFamily: 'Playfair Display, serif', fontStyle: 'italic', desc: 'Playfair · 36px' },
    { name: 'Heading', fontSize: 24, fontFamily: 'Cormorant Garamond, serif', fontStyle: '', desc: 'Cormorant · 24px' },
    { name: 'Subheading', fontSize: 18, fontFamily: 'DM Sans, sans-serif', fontStyle: '', desc: 'DM Sans · 18px' },
    { name: 'Caption', fontSize: 14, fontFamily: 'Georgia, serif', fontStyle: 'italic', desc: 'Georgia · 14px' },
    { name: 'Label', fontSize: 11, fontFamily: 'Helvetica Neue, sans-serif', fontStyle: '', desc: 'Helvetica · 11px' },
  ]
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
      <button className="btn btn-secondary" style={{ width: '100%', gap: '6px', height: '34px', fontSize: '12px' }}
        onClick={() => onAddText({ name: catConfig.placeholderText, fontSize: 20, fontFamily: 'Georgia, serif', fontStyle: 'italic' })}>
        <I.Plus /> Add Text Box
      </button>
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: '2px' }}>Quick Styles</p>
      {STYLES.map(style => (
        <button key={style.name} onClick={() => onAddText(style)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '9px 11px', gap: '2px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', width: '100%', transition: 'border-color 150ms, background 150ms' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
        >
          <span style={{ fontFamily: style.fontFamily, fontSize: Math.min(style.fontSize, 20), fontStyle: style.fontStyle || 'normal', color: 'var(--text-primary)', lineHeight: 1.2 }}>{style.name}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{style.desc}</span>
        </button>
      ))}
    </div>
  )
}

function StickersTabContent() {
  return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>⭐</div>
      <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Sticker Library</p>
      <p style={{ fontSize: '12px', lineHeight: 1.6 }}>Hearts, stars, arrows, seasonal decorations and more. Coming soon.</p>
    </div>
  )
}

function PagesTabContent() {
  const { album, currentPageIndex, setCurrentPageIndex, addPage, deletePage } = useAlbumStore()
  if (!album) return null

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
        {album.pages.map((page, i) => (
          <div key={page.id} onClick={() => setCurrentPageIndex(i)}
            style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '6px', border: `1.5px solid ${i === currentPageIndex ? 'var(--accent)' : 'var(--border)'}`, background: page.background?.startsWith('#') ? page.background : 'var(--bg-tertiary)', cursor: 'pointer', overflow: 'hidden', boxShadow: i === currentPageIndex ? '0 0 0 2px var(--accent-muted)' : 'none', transition: 'border-color 150ms' }}
          >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: i === currentPageIndex ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
            </div>
            {album.pages.length > 1 && (
              <button onClick={e => { e.stopPropagation(); deletePage(i) }}
                style={{ position: 'absolute', top: '3px', right: '3px', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-muted)', width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >×</button>
            )}
          </div>
        ))}
        {/* Add page */}
        <button onClick={addPage}
          style={{ aspectRatio: '4/3', background: 'none', border: '1.5px dashed var(--border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 150ms, color 150ms' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
        >+</button>
      </div>
    </div>
  )
}

// ── Error screen ───────────────────────────────────────────────────────────────
function LoadError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px', textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', background: 'var(--danger-muted)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}><I.Alert /></div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)' }}>Could not load album</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ gap: '6px' }}><I.Back /> Dashboard</button>
        <button className="btn btn-primary" onClick={onRetry} style={{ gap: '6px' }}><I.Refresh /> Try again</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ── MAIN EDITOR PAGE ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
export default function AlbumEditorPage() {
  const router = useRouter()
  const params = useParams()
  const albumId = params.id as string
  const { theme, toggle } = useTheme()

  const {
    album, setAlbum, currentPageIndex, setCurrentPageIndex,
    photos, setPhotos, addPhoto,
    frames, setFrames, addFrame, removeFrame,
    addElement, isDirty, setIsDirty, undo, selectedElementId, setSelectedElementId, deleteElement,
  } = useAlbumStore()

  const [showAIStyle, setShowAIStyle] = useState(false)
  const [showAIRefine, setShowAIRefine] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportPdfAction, setExportPdfAction] = useState<(() => Promise<void>) | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [rightTab, setRightTab] = useState<RightTab>('bg')
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [frameUploading, setFrameUploading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [activeTool, setActiveTool] = useState<'select' | 'text'>('select')
  const [isMobile, setIsMobile] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    variant: 'info',
  })

  const savingRef = useRef(false)
  const frameInputRef = useRef<HTMLInputElement>(null)
  savingRef.current = saving

  const showToast = useCallback((variant: 'success' | 'error' | 'info', message: string) => {
    setToast({ open: true, variant, message })
  }, [])

  const categoryId = album ? detectCategoryFromTitle(album.title) : 'photo-book'
  const catConfig = getCategoryConfig(categoryId)

  const handleExportReady = useCallback((action: (() => Promise<void>) | null) => {
    setExportPdfAction(() => action)
  }, [])

  // ── Mobile detection ────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => { loadAlbum() }, [albumId, loadAttempt])

  async function loadAlbum() {
    setLoadError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: albumData, error: ae } = await supabase.from('albums').select('*').eq('id', albumId).single()
      if (ae) throw ae
      if (!albumData) { router.push('/dashboard'); return }
      setAlbum(albumData); setTitle(albumData.title)
      const { data: photoData } = await supabase.from('photos').select('*').eq('album_id', albumId).order('created_at')
      setPhotos(photoData || [])
      const { data: frameData } = await supabase.from('frames').select('*').order('created_at', { ascending: false })
      setFrames(frameData || [])
    } catch (err: any) {
      setLoadError(err?.message || 'An unexpected error occurred')
    }
  }

  // ── Save ──────────────────────────────────────────────────────────
  const saveAlbum = useCallback(async () => {
    if (!album || savingRef.current) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('error', 'Session expired. Please sign in again.')
        router.push('/')
        return
      }

      throwIfSupabaseError(
        await supabase.from('albums').update({ title: album.title, pages: album.pages, cover_url: album.cover_url }).eq('id', albumId)
      )
      setIsDirty(false)
      showToast('success', 'Saved.')
    } catch (err) {
      console.error('Save failed:', err)
      showToast('error', getErrorMessage(err, 'Save failed. Please try again.'))
    }
    finally { setSaving(false) }
  }, [album, albumId, setIsDirty, router, showToast])

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault(); deleteElement(currentPageIndex, selectedElementId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAlbum() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'Escape') { setSelectedElementId(null); setActiveTool('select') }
      if (e.key === 't') setActiveTool('text')
      if (e.key === 'v' && !(e.ctrlKey || e.metaKey)) setActiveTool('select')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selectedElementId, currentPageIndex, deleteElement, saveAlbum, undo, setSelectedElementId])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [isDirty])

  // ── Photo upload ──────────────────────────────────────────────────
  const onPhotoDrop = useCallback(async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('error', 'Session expired. Please sign in again.'); router.push('/'); return }
    for (const file of files) {
      setUploadProgress(0)
      try {
        const result = await uploadToCloudinary(file, 'photo-album-app', p => setUploadProgress(Math.min(p, 95)))
        setUploadProgress(100)
        const { data: photo, error } = await supabase.from('photos').insert({
          album_id: albumId, user_id: user.id,
          url: result.secure_url, cloudinary_id: result.public_id,
          width: result.width, height: result.height,
        }).select().single()
        if (error) throw error
        if (photo) addPhoto(photo)
      } catch (err) {
        console.error('Upload failed:', err)
        showToast('error', getErrorMessage(err, 'Upload failed. Please try again.'))
      }
    }
    setUploadProgress(null)
  }, [albumId, addPhoto, router, showToast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onPhotoDrop, accept: { 'image/*': [] }, multiple: true,
  })

  // ── Frame upload ──────────────────────────────────────────────────
  async function uploadFrame(file: File) {
    setFrameUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showToast('error', 'Session expired. Please sign in again.'); router.push('/'); return }
      const cd = await uploadToCloudinary(file, 'photo-album-app/frames')
      const { data: saved, error } = await supabase.from('frames').insert({
        user_id: user.id,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: cd.secure_url,
        cloudinary_id: cd.public_id,
        width: cd.width,
        height: cd.height,
        album_id: null,
      }).select().single()
      if (error) throw error
      if (saved) { addFrame(saved); showToast('success', 'Frame uploaded.') }
    } catch (err) {
      console.error('Frame upload error:', err)
      showToast('error', getErrorMessage(err, 'Frame upload failed. Please try again.'))
    } finally {
      setFrameUploading(false)
    }
  }

  async function deleteFrame(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { showToast('error', 'Session expired. Please sign in again.'); router.push('/'); return }

      const res = await fetch(`/api/frames/${id}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to delete frame.')
      removeFrame(id)
      showToast('success', 'Frame deleted.')
    } catch (err) {
      console.error('Frame delete error:', err)
      showToast('error', getErrorMessage(err, 'Failed to delete frame.'))
    }
  }

  // ── AI Generate ───────────────────────────────────────────────────
  async function generateAILayout(prompt: string) {
    if (photos.length === 0) { showToast('info', 'Upload photos first.'); return }
    setAiGenerating(true); setShowAIStyle(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { showToast('error', 'Session expired. Please sign in again.'); router.push('/'); return }
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })),
          pageCount: Math.max(Math.ceil(photos.length / 3), 1),
          prompt: `${catConfig.aiPromptHint} ${prompt}`,
          mode: 'generate',
          currentPages: album?.pages || [],
          canvasW: catConfig.canvasW,
          canvasH: catConfig.canvasH,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`)
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
      showToast('success', 'Album generated. Review and click Save.')
    } catch (err: any) {
      console.error('AI generate error:', err)
      showToast('error', getErrorMessage(err, 'AI generation failed. Please try again.'))
    }
    setAiGenerating(false)
  }

  // ── AI Refine ─────────────────────────────────────────────────────
  async function refineWithAI(prompt: string) {
    if (!album) return
    setAiRefining(true); setShowAIRefine(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { showToast('error', 'Session expired. Please sign in again.'); router.push('/'); return }
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mode: 'refine', prompt, currentPages: album.pages, photos: photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height })), pageCount: album.pages.length }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`)
      const { pages } = await res.json()
      if (pages && album) { setAlbum({ ...album, pages }); setIsDirty(true) }
      showToast('success', 'Restyle applied. Review and click Save.')
    } catch (err: any) {
      console.error('AI refine error:', err)
      showToast('error', getErrorMessage(err, 'AI restyle failed. Please try again.'))
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
      'a4-landscape': [297, 210, 'landscape'], 'a4-portrait': [210, 297, 'portrait'], 'square': [210, 210, 'portrait'],
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

  // ── Add text element ──────────────────────────────────────────────
  function addTextElement(style: any) {
    addElement(currentPageIndex, {
      id: crypto.randomUUID(), type: 'text',
      text: style.name || catConfig.placeholderText,
      x: Math.round(catConfig.canvasW * 0.1),
      y: Math.round(catConfig.canvasH * 0.75),
      width: Math.round(catConfig.canvasW * 0.8),
      height: Math.round((style.fontSize || 20) * 2),
      fontSize: style.fontSize || 20,
      fill: '#f4f0ea',
      fontFamily: style.fontFamily || 'Georgia, serif',
      fontStyle: style.fontStyle || 'italic',
      align: 'center', lineHeight: 1.4, rotation: 0,
    })
  }

  // ── Cover photo ───────────────────────────────────────────────────
  function setCoverPhoto(photo: Photo) {
    if (!album) return
    setAlbum({ ...album, cover_url: photo.url })
    setIsDirty(true)
    showToast('info', 'Cover selected. Click Save to persist.')
  }

  // ── State checks ──────────────────────────────────────────────────
  const hasElements = album?.pages.some(p => p.elements.length > 0) ?? false
  const isAILoading = aiGenerating || aiRefining
  const toastUI = (
    <Toast
      open={toast.open}
      message={toast.message}
      variant={toast.variant}
      onClose={() => setToast(t => ({ ...t, open: false }))}
    />
  )

  if (loadError) return <LoadError message={loadError} onRetry={() => setLoadAttempt(a => a + 1)} onBack={() => router.push('/dashboard')} />
  if (!album) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <div className="spinner" style={{ width: '22px', height: '22px' }} />
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Loading…</p>
    </div>
  )

  // ══════════════════════════════════════════════════════════════
  // MOBILE VIEW
  // ══════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        {toastUI}
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile topbar */}
        <div style={{ height: '54px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px', flexShrink: 0 }}>
          <button className="btn btn-icon" onClick={() => router.push('/dashboard')} style={{ width: '36px', height: '36px' }}><I.Back /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{catConfig.canvasLabel}</div>
          </div>
          <button className="btn btn-ai btn-sm" style={{ gap: '5px', height: '32px', fontSize: '12px' }} onClick={() => setShowAIStyle(true)} disabled={photos.length === 0 || isAILoading}>
            {aiGenerating ? <span className="spinner" style={{ width: '10px', height: '10px', borderTopColor: 'var(--accent)' }} /> : <I.Sparkle />}
            {aiGenerating ? 'Generating…' : 'AI Style'}
          </button>
          <button className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-ghost'}`} onClick={saveAlbum} disabled={saving || !isDirty} style={{ height: '32px', fontSize: '12px' }}>
            {saving ? <span className="spinner" style={{ width: '10px', height: '10px' }} /> : isDirty ? 'Save' : '✓'}
          </button>
        </div>

        {/* Mobile content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Upload */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>Photos ({photos.length})</p>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ padding: '14px' }}>
              <input {...getInputProps()} />
              {uploadProgress !== null ? (
                <div>
                  <div className="progress-bar" style={{ marginBottom: '4px' }}><div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} /></div>
                  <p style={{ fontSize: '11px', color: 'var(--accent)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>Uploading {uploadProgress}%</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Tap to select photos</p>
                </div>
              )}
            </div>
            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginTop: '8px' }}>
                {photos.slice(0, 8).map(p => (
                  <div key={p.id} style={{ aspectRatio: '1', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                {photos.length > 8 && <div style={{ aspectRatio: '1', borderRadius: '4px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>+{photos.length - 8}</div>}
              </div>
            )}
          </div>

          {/* Actions */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-ai" onClick={() => setShowAIStyle(true)} disabled={isAILoading} style={{ width: '100%', gap: '8px', height: '44px', justifyContent: 'center' }}>
                {aiGenerating ? <span className="spinner" style={{ width: '13px', height: '13px', borderTopColor: 'var(--accent)' }} /> : '✨'}
                {aiGenerating ? 'Generating Layout…' : 'AI Style — Generate Layout'}
              </button>
              {hasElements && (
                <button className="btn btn-secondary" onClick={() => setShowAIRefine(true)} disabled={isAILoading} style={{ width: '100%', gap: '8px', height: '40px', justifyContent: 'center' }}>
                  {aiRefining ? '✨ Restyling…' : '✨ AI Refine Style'}
                </button>
              )}
              {hasElements && (
                <button className="btn btn-primary" onClick={() => setShowExport(true)} style={{ width: '100%', gap: '6px', height: '42px', justifyContent: 'center' }}>
                  <I.Download /> Export PDF
                </button>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                💡 For full editing, use a desktop browser
              </p>
            </div>
          )}
        </div>

        {showAIStyle && <AIStyleModal onClose={() => setShowAIStyle(false)} onGenerate={generateAILayout} loading={aiGenerating} />}
        {showAIRefine && <AIRefineModal onClose={() => setShowAIRefine(false)} onRefine={refineWithAI} loading={aiRefining} />}
        {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={doExportPDF} />}
        </div>
      </>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // DESKTOP VIEW — Matches wireframe layout
  // ══════════════════════════════════════════════════════════════

  // Right panel tab definitions
  const RIGHT_TABS: { id: RightTab; icon: React.ReactNode; label: string }[] = [
    { id: 'bg', icon: <I.BgIcon />, label: 'BG' },
    { id: 'text', icon: <I.TextIcon />, label: 'Text' },
    { id: 'stickers', icon: <I.StickerIcon />, label: 'Stickers' },
    { id: 'pages', icon: <I.PagesIcon />, label: 'Pages' },
  ]

  return (
    <>
      {toastUI}
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ══════════ TOPBAR ════════════════════════════════════════ */}
      <header style={{
        height: '52px', flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: '8px',
        position: 'relative', zIndex: 20,
      }}>

        {/* Left — back + logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button className="btn btn-icon" onClick={() => router.push('/dashboard')} style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }} title="Dashboard"><I.Back /></button>
          <div style={{ width: '22px', height: '22px', background: 'var(--accent)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="11" rx="1.5" fill="#0a0a0a" /><rect x="13" y="3" width="8" height="5" rx="1.5" fill="#0a0a0a" opacity="0.8" /><rect x="13" y="10" width="8" height="11" rx="1.5" fill="#0a0a0a" opacity="0.6" /></svg>
          </div>
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 4px' }} />
          {/* Editable title */}
          {editingTitle ? (
            <input autoFocus value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => { if (album) setAlbum({ ...album, title }); setIsDirty(true); setEditingTitle(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { if (album) setAlbum({ ...album, title }); setIsDirty(true); setEditingTitle(false) } if (e.key === 'Escape') setEditingTitle(false) }}
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '14px', padding: '4px 10px', borderRadius: '6px', outline: 'none', width: '180px' }}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '14px', cursor: 'pointer', padding: '3px 7px', borderRadius: '5px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{title}</button>
          )}
        </div>

        {/* Center — AI buttons */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <button className="btn btn-ai" onClick={() => setShowAIStyle(true)} disabled={isAILoading || photos.length === 0}
            style={{ gap: '6px', height: '32px', fontSize: '12px', paddingLeft: '14px', paddingRight: '14px' }}
            title={photos.length === 0 ? 'Upload photos first' : 'Generate full album layout with AI'}
          >
            {aiGenerating ? <span className="spinner" style={{ width: '11px', height: '11px', borderTopColor: 'var(--accent)' }} /> : <I.Sparkle />}
            {aiGenerating ? 'Generating…' : '✦ AI Style'}
          </button>
          {hasElements && (
            <button className="btn btn-ai" onClick={() => setShowAIRefine(true)} disabled={isAILoading}
              style={{ gap: '6px', height: '32px', fontSize: '12px', paddingLeft: '14px', paddingRight: '14px' }}
              title="Restyle colours and typography with AI"
            >
              {aiRefining ? <span className="spinner" style={{ width: '11px', height: '11px', borderTopColor: 'var(--accent)' }} /> : <I.Sparkle />}
              {aiRefining ? 'Restyling…' : 'Refine'}
            </button>
          )}
          {/* Tool mode indicator */}
          {activeTool === 'text' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'var(--accent-muted)', border: '1px solid rgba(200,132,46,0.3)', borderRadius: 'var(--radius-full)', fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
              <I.TextIcon /> Text mode · click canvas
              <button onClick={() => setActiveTool('select')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          )}
        </div>

        {/* Right — undo, save, export, theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button className="btn btn-icon" onClick={undo} title="Undo ⌘Z" style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }}><I.Undo /></button>
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 2px' }} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => exportPdfAction?.()}
            disabled={!exportPdfAction || !album?.pages?.length}
            style={{ gap: '5px', height: '32px', fontSize: '12px', color: 'var(--text-secondary)' }}
            title="Export album as PDF"
          >
            <I.Download /> Export PDF
          </button>
          <button
            className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-ghost'}`}
            onClick={saveAlbum} disabled={saving || !isDirty}
            style={{ gap: '5px', minWidth: '68px', height: '32px', fontSize: '12px', color: isDirty ? undefined : 'var(--text-muted)' }}
          >
            {saving ? <span className="spinner" style={{ width: '10px', height: '10px', borderTopColor: isDirty ? '#0a0a0a' : 'var(--accent)' }} />
              : isDirty ? <><I.Save /> Save</> : <><I.Check /> Saved</>}
          </button>
          <button className="btn btn-icon" onClick={toggle} style={{ width: '30px', height: '30px', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <I.Sun /> : <I.Moon />}
          </button>
        </div>
      </header>

      {/* ══════════ BODY ══════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT PANEL ──────────────────────────── */}
        {/* Photos (top) + Frames (bottom) */}
        <aside style={{
          width: '196px', flexShrink: 0,
          background: 'var(--panel-bg)',
          borderRight: '1px solid var(--panel-border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* ── PHOTOS section ─────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                Photos {photos.length > 0 && <span style={{ color: 'var(--accent)' }}>({photos.length})</span>}
              </span>
            </div>

            {/* Dropzone */}
            <div style={{ padding: '0 8px', flexShrink: 0 }}>
              <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{ padding: '10px 8px', cursor: 'pointer' }}>
                <input {...getInputProps()} />
                {uploadProgress !== null ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="progress-bar" style={{ marginBottom: '4px' }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>{uploadProgress}%</span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '3px', display: 'flex', justifyContent: 'center' }}><I.ImageIcon /></div>
                    <p style={{ fontSize: '11px', color: isDragActive ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                      {isDragActive ? 'Drop here' : 'Drop or click to import'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Photo grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', alignContent: 'start' }}>
              {photos.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                  No photos yet
                </div>
              )}
              {photos.map(photo => (
                <div key={photo.id} title="Drag to canvas · right-click to set cover"
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: '4px', overflow: 'hidden', cursor: 'grab', border: '1px solid var(--border)' }}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('photoId', photo.id)
                    e.dataTransfer.setData('photoUrl', photo.url)
                    e.dataTransfer.setData('photoWidth', photo.width.toString())
                    e.dataTransfer.setData('photoHeight', photo.height.toString())
                    e.dataTransfer.setData('elementType', 'image')
                  }}
                  onContextMenu={e => { e.preventDefault(); setCoverPhoto(photo) }}
                >
                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── FRAMES section ─────────────────── */}
          <div style={{ flex: '0 0 auto', maxHeight: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '9px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Frames</span>
              <input type="file" accept="image/*" ref={frameInputRef} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFrame(e.target.files[0])} />
              <button className="btn btn-icon" style={{ width: '22px', height: '22px', padding: 0 }} onClick={() => frameInputRef.current?.click()} disabled={frameUploading} title="Upload PNG frame">
                {frameUploading ? <span className="spinner" style={{ width: '10px', height: '10px' }} /> : <I.Plus />}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', alignContent: 'start' }}>
              {frames.length === 0 && !frameUploading && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '12px 6px', color: 'var(--text-muted)', fontSize: '10px', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                  Upload PNG overlays with transparency
                </div>
              )}
              {frames.map(frame => (
                <div key={frame.id} title={frame.name} draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('frameId', frame.id)
                    e.dataTransfer.setData('photoUrl', frame.url)
                    e.dataTransfer.setData('photoWidth', frame.width.toString())
                    e.dataTransfer.setData('photoHeight', frame.height.toString())
                    e.dataTransfer.setData('elementType', 'frame')
                  }}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: '4px', overflow: 'hidden', background: 'repeating-conic-gradient(var(--bg-tertiary) 0% 25%, var(--bg-elevated) 0% 50%) 0 0 / 10px 10px', border: '1px solid var(--border)', cursor: 'grab' }}
                >
                  <img src={frame.url} alt={frame.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                  <button onClick={e => { e.stopPropagation(); deleteFrame(frame.id) }}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--danger)', width: '16px', height: '16px', borderRadius: '50%', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CANVAS AREA ──────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <AlbumCanvas
            canvasW={catConfig.canvasW}
            canvasH={catConfig.canvasH}
            exportDPI={catConfig.printDPI}
            activeTool={activeTool}
            onElementAdded={() => setActiveTool('select')}
            onExportReady={handleExportReady}
          />
        </main>

        {/* ── RIGHT PANEL ──────────────────────── */}
        {/* Vertical tab strip (48px) + content (rest) */}
        <aside style={{
          width: '300px', flexShrink: 0,
          background: 'var(--panel-bg)',
          borderLeft: '1px solid var(--panel-border)',
          display: 'flex', overflow: 'hidden',
        }}>

          {/* Vertical tab strip */}
          <div style={{
            width: '48px', flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            paddingTop: '8px', paddingBottom: '8px',
            gap: '2px',
            background: 'var(--bg-secondary)',
          }}>
            {RIGHT_TABS.map(tab => (
              <button key={tab.id} onClick={() => { setRightTab(tab.id); setSelectedElementId(null) }}
                title={tab.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', height: '52px', width: '100%', padding: 0,
                  background: rightTab === tab.id && !selectedElementId ? 'var(--accent-muted)' : 'transparent',
                  border: 'none',
                  borderLeft: rightTab === tab.id && !selectedElementId ? '2px solid var(--accent)' : '2px solid transparent',
                  color: rightTab === tab.id && !selectedElementId ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  fontSize: '9px', fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => {
                  if (rightTab !== tab.id || selectedElementId) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
                      ; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  if (rightTab !== tab.id || selectedElementId) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                  }
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            {/* Text tool shortcut tab */}
            <div style={{ flex: 1 }} />
            <button onClick={() => { setActiveTool(activeTool === 'text' ? 'select' : 'text'); setSelectedElementId(null) }}
              title="Text tool (T)"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px', height: '52px', width: '100%', padding: 0,
                background: activeTool === 'text' ? 'var(--accent-muted)' : 'transparent',
                border: 'none',
                borderLeft: activeTool === 'text' ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTool === 'text' ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 150ms ease',
                fontSize: '9px', fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
              onMouseEnter={e => { if (activeTool !== 'text') { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
              onMouseLeave={e => { if (activeTool !== 'text') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' } }}
            >
              <I.TextIcon />
              <span>+Text</span>
            </button>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* If element is selected → properties override tab content */}
            {selectedElementId ? (
              <PropertiesPanel pageIndex={currentPageIndex} />
            ) : (
              <>
                {/* Tab label header */}
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    {rightTab === 'bg' ? 'Background' : rightTab === 'text' ? 'Typography' : rightTab === 'stickers' ? 'Stickers' : 'Pages'}
                  </span>
                </div>

                {rightTab === 'bg' && (
                  <BgTabContent pageIndex={currentPageIndex} catConfig={catConfig} />
                )}
                {rightTab === 'text' && (
                  <TextTabContent pageIndex={currentPageIndex} catConfig={catConfig} onAddText={addTextElement} />
                )}
                {rightTab === 'stickers' && <StickersTabContent />}
                {rightTab === 'pages' && <PagesTabContent />}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ══════════ BOTTOM BAR ════════════════════════════════════ */}
      <footer style={{
        height: '30px', flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
      }}>
        {/* Ask for Help */}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowHelp(true)}
          style={{ gap: '6px', fontSize: '11px', height: '22px', padding: '0 10px', color: 'var(--text-muted)' }}
        >
          <I.Help /> Ask for Help
        </button>

        <div style={{ flex: 1 }} />

        {/* Canvas info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            ⌘S save · ⌘Z undo · Del remove · T text · Esc deselect
          </span>
          <div style={{ width: '1px', height: '12px', background: 'var(--border)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {catConfig.canvasW} × {catConfig.canvasH}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            {catConfig.canvasLabel}
          </span>
        </div>
      </footer>

      {/* ══════════ MODALS ════════════════════════════════════════ */}
      {showAIStyle && <AIStyleModal onClose={() => setShowAIStyle(false)} onGenerate={generateAILayout} loading={aiGenerating} />}
      {showAIRefine && <AIRefineModal onClose={() => setShowAIRefine(false)} onRefine={refineWithAI} loading={aiRefining} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={doExportPDF} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </div>
    </>
  )
}

