'use client'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

const CANVAS_W = 800
const CANVAS_H = 600

type Template = {
  id: string
  name: string
  description: string
  emoji: string
  background: string
  accent: string
  textColor: string
  fontFamily: string
  buildLayout: (photos: { id: string; url: string; width: number; height: number }[]) => {
    background: string
    elements: Omit<PageElement, 'id'>[]
  }[]
}

function caption(text: string, x: number, y: number, w: number, color: string, font: string, size = 15, align: 'left' | 'center' | 'right' = 'left', style = 'italic'): Omit<PageElement, 'id'> {
  return { type: 'text', text, x, y, width: w, height: 40, fontSize: size, fill: color, fontFamily: font, fontStyle: style, align, lineHeight: 1.4, rotation: 0 }
}

const TEMPLATES: Template[] = [
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Romantic layouts with dark backgrounds & gold accents',
    emoji: '💍',
    background: '#1a1410',
    accent: '#d4af5a',
    textColor: '#f5f0e8',
    fontFamily: 'Playfair Display, serif',
    buildLayout: (photos) => {
      const pages = []
      const m = 32
      // Page 1: hero full-bleed
      if (photos[0]) {
        pages.push({
          background: '#1a1410',
          elements: [
            { type: 'image' as const, photoId: photos[0].id, url: photos[0].url, x: 0, y: 0, width: CANVAS_W, height: CANVAS_H - 80, rotation: 0 },
            caption('A Beautiful Beginning', m, CANVAS_H - 64, CANVAS_W - m * 2, '#d4af5a', 'Playfair Display, serif', 22, 'center', 'italic'),
          ],
        })
      }
      // Remaining photos: two per page
      for (let i = 1; i < photos.length; i += 2) {
        const left = photos[i]
        const right = photos[i + 1]
        const w = (CANVAS_W - m * 3) / 2
        const h = CANVAS_H - m * 2 - 60
        const elements: Omit<PageElement, 'id'>[] = []
        if (left) elements.push({ type: 'image', photoId: left.id, url: left.url, x: m, y: m, width: w, height: h, rotation: -1 })
        if (right) elements.push({ type: 'image', photoId: right.id, url: right.url, x: m + w + m, y: m, width: w, height: h, rotation: 1 })
        elements.push(caption('Forever & Always', m, CANVAS_H - 52, CANVAS_W - m * 2, '#d4af5a', 'Playfair Display, serif', 14, 'center', 'italic'))
        pages.push({ background: '#1a1410', elements })
      }
      return pages
    },
  },
  {
    id: 'travel',
    name: 'Travel',
    description: 'Adventurous collage-style with vivid colors',
    emoji: '✈️',
    background: '#0d1b2a',
    accent: '#f4a261',
    textColor: '#e8f4f8',
    fontFamily: 'DM Sans, sans-serif',
    buildLayout: (photos) => {
      const pages = []
      const m = 24
      for (let i = 0; i < photos.length; i += 3) {
        const group = photos.slice(i, i + 3)
        const elements: Omit<PageElement, 'id'>[] = []
        if (group[0]) {
          elements.push({ type: 'image', photoId: group[0].id, url: group[0].url, x: m, y: m, width: CANVAS_W - m * 2, height: 320, rotation: 0 })
        }
        const smallW = (CANVAS_W - m * 3) / 2
        const smallH = CANVAS_H - 320 - m * 3 - 40
        if (group[1]) elements.push({ type: 'image', photoId: group[1].id, url: group[1].url, x: m, y: 320 + m * 2, width: smallW, height: smallH, rotation: -2 })
        if (group[2]) elements.push({ type: 'image', photoId: group[2].id, url: group[2].url, x: m + smallW + m, y: 320 + m * 2, width: smallW, height: smallH, rotation: 2 })
        elements.push(caption('Wanderlust', m, CANVAS_H - 36, CANVAS_W - m * 2, '#f4a261', 'DM Sans, sans-serif', 13, 'left', 'bold'))
        pages.push({ background: '#0d1b2a', elements })
      }
      return pages
    },
  },
  {
    id: 'birthday',
    name: 'Birthday',
    description: 'Playful grid with warm pastel backgrounds',
    emoji: '🎂',
    background: '#fff8f0',
    accent: '#e8734a',
    textColor: '#3d1f0a',
    fontFamily: 'DM Sans, sans-serif',
    buildLayout: (photos) => {
      const pages = []
      const m = 20
      for (let i = 0; i < photos.length; i += 4) {
        const group = photos.slice(i, i + 4)
        const cols = Math.min(group.length, 2)
        const rows = Math.ceil(group.length / cols)
        const w = (CANVAS_W - m * (cols + 1)) / cols
        const h = (CANVAS_H - m * (rows + 1) - 48) / rows
        const elements: Omit<PageElement, 'id'>[] = group.map((p, j) => ({
          type: 'image' as const, photoId: p.id, url: p.url,
          x: m + (j % cols) * (w + m),
          y: m + Math.floor(j / cols) * (h + m),
          width: w, height: h, rotation: (j % 3 === 0 ? -2 : j % 3 === 1 ? 0 : 2),
        }))
        elements.push(caption('Celebrate!', m, CANVAS_H - 40, CANVAS_W - m * 2, '#e8734a', 'DM Sans, sans-serif', 16, 'center', 'bold'))
        pages.push({ background: '#fff8f0', elements })
      }
      return pages
    },
  },
  {
    id: 'baby',
    name: 'Baby',
    description: 'Soft pastels, gentle layouts, tender captions',
    emoji: '🍼',
    background: '#f0f4ff',
    accent: '#7b9cde',
    textColor: '#2d3a5e',
    fontFamily: 'Playfair Display, serif',
    buildLayout: (photos) => {
      const pages = []
      const m = 40
      for (let i = 0; i < photos.length; i += 2) {
        const main = photos[i]
        const secondary = photos[i + 1]
        const elements: Omit<PageElement, 'id'>[] = []
        if (secondary) {
          const w = (CANVAS_W - m * 3) / 2
          const h = CANVAS_H - m * 2 - 56
          elements.push({ type: 'image', photoId: main.id, url: main.url, x: m, y: m, width: w, height: h, rotation: 0 })
          elements.push({ type: 'image', photoId: secondary.id, url: secondary.url, x: m + w + m, y: m + 30, width: w, height: h - 30, rotation: 0 })
        } else {
          const w = CANVAS_W - m * 2
          const h = CANVAS_H - m * 2 - 56
          elements.push({ type: 'image', photoId: main.id, url: main.url, x: m, y: m, width: w, height: h, rotation: 0 })
        }
        elements.push(caption('So tiny, so loved', m, CANVAS_H - 48, CANVAS_W - m * 2, '#7b9cde', 'Playfair Display, serif', 14, 'center', 'italic'))
        pages.push({ background: '#f0f4ff', elements })
      }
      return pages
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'White space, single photos, clean typography',
    emoji: '◻',
    background: '#fafafa',
    accent: '#1a1a1a',
    textColor: '#1a1a1a',
    fontFamily: 'Helvetica Neue, sans-serif',
    buildLayout: (photos) => {
      return photos.map((p) => {
        const imgW = CANVAS_W - 120
        const imgH = CANVAS_H - 140
        return {
          background: '#fafafa',
          elements: [
            { type: 'image' as const, photoId: p.id, url: p.url, x: 60, y: 48, width: imgW, height: imgH, rotation: 0 },
            caption('—', 60, CANVAS_H - 56, imgW, '#aaaaaa', 'Helvetica Neue, sans-serif', 12, 'center', ''),
          ],
        }
      })
    },
  },
]

export default function TemplatesModal({ onClose }: { onClose: () => void }) {
  const { album, photos, setAlbum, setIsDirty } = useAlbumStore()

  function applyTemplate(template: Template) {
    if (!album || photos.length === 0) {
      alert('Upload some photos first so the template can fill in layouts.')
      return
    }

    const photoData = photos.map(p => ({ id: p.id, url: p.url, width: p.width, height: p.height }))
    const rawPages = template.buildLayout(photoData)

    const pages = rawPages.map(rp => ({
      id: crypto.randomUUID(),
      background: rp.background,
      elements: rp.elements.map(el => ({ ...el, id: crypto.randomUUID() })),
    }))

    setAlbum({ ...album, pages })
    setIsDirty(true)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 400, color: '#f5f0e8', margin: 0 }}>
            Album Templates
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '32px', lineHeight: 1.6 }}>
          Apply a template to instantly lay out your photos. This replaces all current pages.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {TEMPLATES.map(t => (
            <div key={t.id}
              style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#d48c3a')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
            >
              {/* Preview swatch */}
              <div style={{ height: '90px', background: t.background, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', position: 'relative' }}>
                <div style={{ width: '54px', height: '42px', background: t.accent, borderRadius: '3px', opacity: 0.6 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ width: '36px', height: '28px', background: t.accent, borderRadius: '2px', opacity: 0.4 }} />
                  <div style={{ width: '36px', height: '28px', background: t.accent, borderRadius: '2px', opacity: 0.4 }} />
                </div>
                <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontFamily: t.fontFamily, fontSize: '9px', color: t.textColor, opacity: 0.7 }}>
                  {t.fontFamily.split(',')[0]}
                </div>
              </div>

              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>{t.emoji}</span>
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#f5f0e8' }}>{t.name}</span>
                </div>
                <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', marginBottom: '14px', lineHeight: 1.5 }}>
                  {t.description}
                </p>
                <button
                  onClick={() => applyTemplate(t)}
                  style={{ width: '100%', background: '#d48c3a', border: 'none', color: '#0e0e0e', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px' }}
                >
                  Apply Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
