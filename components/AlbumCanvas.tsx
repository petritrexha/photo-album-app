'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type LayoutTemplate =
  | 'scrapbook'
  | 'grid-top-bottom'
  | 'two-tall-bottom'
  | 'top-wide-grid'
  | 'full-bleed'
  | 'custom'

type LayoutTheme = 'wedding' | 'travel' | 'minimalist' | 'birthday' | 'family'
type LayoutStyle = 'clean' | 'overlapping' | 'framed'
type PhotosPerPage = 1 | 2 | 4 | 6

type SpreadConfig = {
  photosPerPage: PhotosPerPage
  layoutStyle: LayoutStyle
  theme: LayoutTheme
  leftTemplate: LayoutTemplate
  rightTemplate: LayoutTemplate
}

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE-STRICT GRID SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const M = 0.04

type SlotDef = {
  id: string
  xP: number
  yP: number
  wP: number
  hP: number
  rot?: number
  arLabel?: string
}

function computeArLabel(wP: number, hP: number, cW: number, cH: number): string {
  const w = wP * cW; const h = hP * cH; const r = w / h
  if (Math.abs(r - 1) < 0.08) return '1:1'
  if (Math.abs(r - 4 / 3) < 0.10) return '4:3'
  if (Math.abs(r - 3 / 4) < 0.10) return '3:4'
  if (Math.abs(r - 16 / 9) < 0.10) return '16:9'
  if (Math.abs(r - 3 / 2) < 0.10) return '3:2'
  if (Math.abs(r - 2 / 3) < 0.10) return '2:3'
  return `${w.toFixed(0)}×${h.toFixed(0)}px`
}

const RAW_SLOTS: Record<LayoutTemplate, Omit<SlotDef, 'id' | 'arLabel'>[]> = {
  'full-bleed': [{ xP: 0, yP: 0, wP: 1, hP: 1 }],
  'scrapbook': [
    { xP: 0.04, yP: 0.05, wP: 0.48, hP: 0.44, rot: -2.5 },
    { xP: 0.08, yP: 0.38, wP: 0.42, hP: 0.52, rot: 1.5 },
    { xP: 0.44, yP: 0.14, wP: 0.52, hP: 0.48, rot: 2.0 },
  ],
  'grid-top-bottom': [
    { xP: M, yP: M, wP: 0.46, hP: 0.46 },
    { xP: 0.54, yP: M, wP: 0.42, hP: 0.30 },
    { xP: M, yP: 0.54, wP: 1 - M * 2, hP: 0.42 },
  ],
  'two-tall-bottom': [
    { xP: M, yP: M, wP: 0.44, hP: 0.68 },
    { xP: 0.52, yP: M, wP: 0.44, hP: 0.68 },
    { xP: M, yP: 0.76, wP: 1 - M * 2, hP: 0.18 },
  ],
  'top-wide-grid': [
    { xP: M, yP: M, wP: 1 - M * 2, hP: 0.32 },
    { xP: M, yP: 0.40, wP: 0.46, hP: 0.26 },
    { xP: 0.54, yP: 0.40, wP: 0.42, hP: 0.26 },
    { xP: M, yP: 0.70, wP: 0.46, hP: 0.24 },
  ],
  'custom': [],
}

const SLOT_IDS = ['A', 'B', 'C', 'D', 'E', 'F']

function buildSlots(template: LayoutTemplate, cW: number, cH: number): SlotDef[] {
  return RAW_SLOTS[template].map((raw, i) => ({
    ...raw,
    id: SLOT_IDS[i] ?? `S${i}`,
    arLabel: computeArLabel(raw.wP, raw.hP, cW, cH),
  }))
}

export function buildGridPromptSection(
  template: LayoutTemplate, canvasW: number, canvasH: number,
): string {
  if (template === 'custom' || template === 'full-bleed') return ''
  const slots = buildSlots(template, canvasW, canvasH)
  const lines = slots.map(s =>
    `  Slot ${s.id}: x=${Math.round(s.xP * canvasW)}px y=${Math.round(s.yP * canvasH)}px ` +
    `width=${Math.round(s.wP * canvasW)}px height=${Math.round(s.hP * canvasH)}px ` +
    `AR=${s.arLabel} Method=Crop-to-fit,NoStretching` +
    (s.rot ? ` Rotation=${s.rot}deg` : ''),
  )
  return [
    `GRID LAYOUT "${template}" — STRICT COORDINATE CONSTRAINTS (canvas ${canvasW}×${canvasH}):`,
    ...lines,
    'RULES: Place each photo at the EXACT coordinates above. Never stretch, widen or',
    'narrow. Use center-crop (object-fit:cover). Each slot ID must appear exactly once.',
  ].join('\n')
}

// ─── CROP-TO-FIT MATH ────────────────────────────────────────────────────────
type CropFitProps = { imgX: number; imgY: number; imgW: number; imgH: number }

function computeImageFit(
  naturalW: number, naturalH: number,
  slotW: number, slotH: number,
  fit: 'cover' | 'contain' = 'cover',
): CropFitProps {
  const slotAR = slotW / slotH
  const imgAR = naturalW / naturalH
  let renderedW: number, renderedH: number
  const shouldWidthDrive = fit === 'cover' ? imgAR <= slotAR : imgAR > slotAR
  if (shouldWidthDrive) {
    renderedW = slotW
    renderedH = slotW / imgAR
  } else {
    renderedH = slotH
    renderedW = slotH * imgAR
  }
  return { imgX: (slotW - renderedW) / 2, imgY: (slotH - renderedH) / 2, imgW: renderedW, imgH: renderedH }
}

function toHighQualityUrl(url: string): string {
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/q_100,f_png/') : url
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseLinearGradient(css: string, w: number, h: number) {
  try {
    const inner = css.slice('linear-gradient('.length, css.lastIndexOf(')'))
    const parts = inner.split(/,(?![^(]*\))/).map(s => s.trim())
    let angle = 135; let stopIdx = 0
    if (/^\d+(\.\d+)?deg$/i.test(parts[0])) { angle = parseFloat(parts[0]); stopIdx = 1 }
    else if (/^to\s+/i.test(parts[0])) {
      const d = parts[0].toLowerCase()
      if (d.includes('right')) angle = 90
      else if (d.includes('left')) angle = 270
      else if (d.includes('bottom')) angle = 180
      stopIdx = 1
    }
    const rad = ((angle - 90) * Math.PI) / 180
    const cos = Math.cos(rad); const sin = Math.sin(rad)
    const len = Math.abs(w * cos) + Math.abs(h * sin)
    const colorStops: (number | string)[] = []
    parts.slice(stopIdx).forEach((stop, i, arr) => {
      const bits = stop.trim().split(/\s+(?=[\d.]+%)/)
      const pct = bits[1] ? parseFloat(bits[1]) / 100 : i / Math.max(arr.length - 1, 1)
      colorStops.push(pct, bits[0].trim())
    })
    return {
      startPoint: { x: w / 2 - (cos * len) / 2, y: h / 2 - (sin * len) / 2 },
      endPoint: { x: w / 2 + (cos * len) / 2, y: h / 2 + (sin * len) / 2 },
      colorStops,
    }
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT BACKGROUNDS
// ─────────────────────────────────────────────────────────────────────────────

const THEME_ENVS: Record<LayoutTheme, { bg: string; grain: number; vignette: string }> = {
  wedding: { bg: 'radial-gradient(ellipse at 30% 20%, #2a1f18 0%, #1a1208 40%, #0d0a06 100%)', grain: 0.040, vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,3,2,0.85) 100%)' },
  travel: { bg: 'radial-gradient(ellipse at 70% 30%, #0d1a2a 0%, #091420 50%, #050d15 100%)', grain: 0.030, vignette: 'radial-gradient(ellipse at center, transparent 45%, rgba(3,8,14,0.9) 100%)' },
  minimalist: { bg: 'radial-gradient(ellipse at center, #18181c 0%, #0e0e11 60%, #080809 100%)', grain: 0.020, vignette: 'radial-gradient(ellipse at center, transparent 55%, rgba(4,4,5,0.8) 100%)' },
  birthday: { bg: 'radial-gradient(ellipse at 40% 60%, #1a0d0a 0%, #120808 50%, #080505 100%)', grain: 0.035, vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(6,3,3,0.88) 100%)' },
  family: { bg: 'radial-gradient(ellipse at 60% 40%, #1a140a 0%, #110e06 50%, #080600 100%)', grain: 0.030, vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,4,2,0.85) 100%)' },
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG LAYOUT PREVIEWS
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE_PREVIEWS: Record<LayoutTemplate, React.ReactNode> = {
  custom: (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" stroke="rgba(200,132,46,0.3)" strokeWidth="1" strokeDasharray="3 2" fill="rgba(200,132,46,0.04)" />
      <text x="28" y="22" textAnchor="middle" fill="rgba(200,132,46,0.35)" fontSize="7" fontFamily="monospace">free</text>
    </svg>
  ),
  'full-bleed': (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.5)" strokeWidth="1" />
      <text x="28" y="22" textAnchor="middle" fill="rgba(200,132,46,0.7)" fontSize="6" fontFamily="monospace">A</text>
    </svg>
  ),
  scrapbook: (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(200,132,46,0.15)" strokeWidth="0.5" />
      <rect x="3" y="2" width="26" height="18" rx="1" fill="rgba(200,132,46,0.22)" stroke="rgba(200,132,46,0.5)" strokeWidth="0.8" transform="rotate(-2.5 16 11)" />
      <text x="16" y="13" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace" transform="rotate(-2.5 16 13)">A</text>
      <rect x="3" y="18" width="22" height="20" rx="1" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.45)" strokeWidth="0.8" transform="rotate(1.5 14 28)" />
      <text x="14" y="30" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace" transform="rotate(1.5 14 30)">B</text>
      <rect x="25" y="6" width="28" height="20" rx="1" fill="rgba(200,132,46,0.15)" stroke="rgba(200,132,46,0.4)" strokeWidth="0.8" transform="rotate(2 39 16)" />
      <text x="39" y="18" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace" transform="rotate(2 39 18)">C</text>
    </svg>
  ),
  'grid-top-bottom': (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(200,132,46,0.15)" strokeWidth="0.5" />
      <rect x="3" y="3" width="24" height="18" rx="1" fill="rgba(200,132,46,0.22)" stroke="rgba(200,132,46,0.5)" strokeWidth="0.8" />
      <text x="15" y="14" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">A</text>
      <rect x="29" y="3" width="24" height="12" rx="1" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.45)" strokeWidth="0.8" />
      <text x="41" y="10" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">B</text>
      <rect x="3" y="23" width="50" height="15" rx="1" fill="rgba(200,132,46,0.15)" stroke="rgba(200,132,46,0.4)" strokeWidth="0.8" />
      <text x="28" y="32" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">C</text>
    </svg>
  ),
  'two-tall-bottom': (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(200,132,46,0.15)" strokeWidth="0.5" />
      <rect x="3" y="3" width="23" height="26" rx="1" fill="rgba(200,132,46,0.22)" stroke="rgba(200,132,46,0.5)" strokeWidth="0.8" />
      <text x="14" y="17" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">A</text>
      <rect x="29" y="3" width="24" height="26" rx="1" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.45)" strokeWidth="0.8" />
      <text x="41" y="17" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">B</text>
      <rect x="3" y="31" width="50" height="7" rx="1" fill="rgba(200,132,46,0.15)" stroke="rgba(200,132,46,0.4)" strokeWidth="0.8" />
      <text x="28" y="36.5" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="4.5" fontFamily="monospace">C</text>
    </svg>
  ),
  'top-wide-grid': (
    <svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="54" height="38" rx="2" fill="rgba(0,0,0,0.2)" stroke="rgba(200,132,46,0.15)" strokeWidth="0.5" />
      <rect x="3" y="3" width="50" height="12" rx="1" fill="rgba(200,132,46,0.22)" stroke="rgba(200,132,46,0.5)" strokeWidth="0.8" />
      <text x="28" y="10.5" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">A</text>
      <rect x="3" y="17" width="24" height="10" rx="1" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.45)" strokeWidth="0.8" />
      <text x="15" y="23.5" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">B</text>
      <rect x="29" y="17" width="24" height="10" rx="1" fill="rgba(200,132,46,0.18)" stroke="rgba(200,132,46,0.45)" strokeWidth="0.8" />
      <text x="41" y="23.5" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">C</text>
      <rect x="3" y="29" width="24" height="9" rx="1" fill="rgba(200,132,46,0.15)" stroke="rgba(200,132,46,0.4)" strokeWidth="0.8" />
      <text x="15" y="35" textAnchor="middle" fill="rgba(200,132,46,0.8)" fontSize="5" fontFamily="monospace">D</text>
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// CROP-FITTED PHOTO ELEMENT
// ─────────────────────────────────────────────────────────────────────────────

function PhotoElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement; isSelected: boolean
  onSelect: () => void; onUpdate: (u: Partial<PageElement>) => void
}) {
  const imageUrl = element.url || ''
  const [image, status] = useImage(imageUrl, 'anonymous')
  const groupRef = useRef<any>(null)
  const trRef = useRef<any>(null)

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  if (status === 'failed') {
    return (
      <Rect x={element.x} y={element.y} width={element.width} height={element.height}
        rotation={element.rotation} fill="#1a1010" stroke="rgba(224,80,80,0.3)"
        strokeWidth={1} cornerRadius={3} onClick={onSelect} onTap={onSelect} />
    )
  }

  const naturalW = image?.width ?? element.width
  const naturalH = image?.height ?? element.height
  const fitMode = element.fit ?? (element.type === 'frame' ? 'contain' : 'cover')
  const { imgX, imgY, imgW, imgH } = computeImageFit(naturalW, naturalH, element.width, element.height, fitMode)

  return (
    <>
      <Group
        ref={groupRef}
        x={element.x} y={element.y}
        width={element.width} height={element.height}
        rotation={element.rotation}
        opacity={element.opacity ?? 1}
        clipX={0} clipY={0} clipWidth={element.width} clipHeight={element.height}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = groupRef.current; if (!n) return
          onUpdate({
            x: n.x(), y: n.y(),
            width: Math.max(20, n.width() * n.scaleX()),
            height: Math.max(20, n.height() * n.scaleY()),
            rotation: n.rotation(),
          })
          n.scaleX(1); n.scaleY(1)
        }}
      >
        <KonvaImage image={image} x={imgX} y={imgY} width={imgW} height={imgH} listening={false} />
      </Group>

      {isSelected && (
        <Transformer ref={trRef}
          rotateEnabled keepRatio={false}
          borderStroke="rgba(200,132,46,0.9)" borderStrokeWidth={1.5}
          anchorFill="#1c1c21" anchorStroke="rgba(200,132,46,0.9)"
          anchorStrokeWidth={1.5} anchorSize={9} anchorCornerRadius={3}
          boundBoxFunc={(old, n) => (n.width < 20 || n.height < 20 ? old : n)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT ELEMENT
// ─────────────────────────────────────────────────────────────────────────────

function TextElement({ element, isSelected, isBeingEdited, onSelect, onUpdate, onStartEdit }: {
  element: PageElement; isSelected: boolean; isBeingEdited: boolean
  onSelect: () => void; onUpdate: (u: Partial<PageElement>) => void; onStartEdit: () => void
}) {
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)

  useEffect(() => {
    if (isSelected && !isBeingEdited && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, isBeingEdited])

  const fs = [
    element.fontStyle?.includes('bold') ? 'bold' : '',
    element.fontStyle?.includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal'

  return (
    <>
      <Text ref={shapeRef}
        text={isBeingEdited ? '' : (element.text || '')}
        x={element.x} y={element.y}
        width={element.width || 280} rotation={element.rotation || 0}
        fontSize={element.fontSize || 18}
        fill={isBeingEdited ? 'transparent' : (element.fill || '#f4f0ea')}
        fontFamily={element.fontFamily || 'Georgia, serif'}
        fontStyle={fs}
        textDecoration={element.fontStyle?.includes('underline') ? 'underline' : ''}
        align={element.align || 'left'} lineHeight={element.lineHeight || 1.4}
        opacity={isBeingEdited ? 0 : (element.opacity ?? 1)}
        draggable={!isBeingEdited}
        onClick={onSelect} onTap={onSelect}
        onDblClick={onStartEdit} onDblTap={onStartEdit}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current; if (!n) return
          onUpdate({ x: n.x(), y: n.y(), width: Math.max(40, n.width() * n.scaleX()), rotation: n.rotation() })
          n.scaleX(1); n.scaleY(1); n.getLayer()?.batchDraw()
        }}
      />
      {isSelected && !isBeingEdited && (
        <Transformer ref={trRef} rotateEnabled enabledAnchors={['middle-left', 'middle-right']}
          borderStroke="rgba(200,132,46,0.9)" borderStrokeWidth={1.5}
          anchorFill="#1c1c21" anchorStroke="rgba(200,132,46,0.9)"
          anchorStrokeWidth={1.5} anchorSize={9} anchorCornerRadius={3} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE TEXT EDITOR
// ─────────────────────────────────────────────────────────────────────────────

function InlineTextEditor({ element, scale, stageRef, onCommit, onCancel }: {
  element: PageElement; scale: number; stageRef: React.RefObject<any>
  onCommit: (text: string) => void; onCancel: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const ta = taRef.current; if (!ta) return
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); autoResize(ta)
  }, [])
  function autoResize(ta: HTMLTextAreaElement) {
    ta.style.height = 'auto'
    ta.style.height = Math.max(ta.scrollHeight, (element.fontSize || 18) * scale * 1.4 + 8) + 'px'
  }
  const style = (() => {
    if (!stageRef.current) return null
    const r = (stageRef.current.container() as HTMLElement).getBoundingClientRect()
    const fss = element.fontStyle || ''
    return {
      position: 'fixed' as const,
      left: Math.round(r.left + element.x * scale),
      top: Math.round(r.top + element.y * scale),
      width: Math.round(Math.max((element.width || 200) * scale, 80)),
      minHeight: Math.round((element.fontSize || 18) * scale * (element.lineHeight || 1.4) + 8),
      fontSize: Math.round((element.fontSize || 18) * scale),
      fontFamily: element.fontFamily || 'Georgia, serif',
      fontWeight: fss.includes('bold') ? 'bold' : 'normal',
      fontStyle: fss.includes('italic') ? 'italic' : 'normal',
      textDecoration: fss.includes('underline') ? 'underline' : 'none',
      color: element.fill || '#f4f0ea',
      lineHeight: String(element.lineHeight || 1.4),
      textAlign: (element.align as any) || 'left',
      background: 'rgba(8,8,9,0.06)',
      border: '1.5px dashed rgba(200,132,46,0.8)',
      borderRadius: '3px', padding: '2px 4px', outline: 'none',
      resize: 'none' as const, overflow: 'hidden', zIndex: 9999,
      boxSizing: 'border-box' as const,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      transformOrigin: 'top left', caretColor: '#c8842e',
      whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
    }
  })()
  if (!style) return null
  return (
    <textarea ref={taRef} defaultValue={element.text || ''} style={style}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommit(taRef.current?.value ?? ''); return }
        requestAnimationFrame(() => taRef.current && autoResize(taRef.current))
      }}
      onBlur={e => onCommit(e.target.value)}
      onChange={e => autoResize(e.target)}
      spellCheck={false}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT MENU
// ─────────────────────────────────────────────────────────────────────────────

type CtxMenu = { x: number; y: number; elementId: string } | null

function ContextMenu({ menu, onDelete, onFront, onBack, onClose }: {
  menu: CtxMenu; onDelete: () => void; onFront: () => void; onBack: () => void; onClose: () => void
}) {
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-ctx]')) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu, onClose])
  if (!menu) return null
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }
  return (
    <div data-ctx style={{ position: 'fixed', left: menu.x, top: menu.y, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 1000, overflow: 'hidden', minWidth: 160 }}>
      {[{ label: '↑ Bring to front', fn: onFront }, { label: '↓ Send to back', fn: onBack }].map(it => (
        <button key={it.label} style={row}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          onClick={() => { it.fn(); onClose() }}>{it.label}</button>
      ))}
      <div style={{ height: 1, background: 'var(--border)' }} />
      <button style={{ ...row, color: 'var(--danger)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        onClick={() => { onDelete(); onClose() }}>🗑 Delete</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CANVAS
// ─────────────────────────────────────────────────────────────────────────────

function PageCanvas({
  pageIndex, canvasW, canvasH, scale,
  activeTool, editingId, setEditingId, onElementAdded, side,
}: {
  pageIndex: number; canvasW: number; canvasH: number; scale: number
  activeTool: 'select' | 'text'; editingId: string | null
  setEditingId: (id: string | null) => void; onElementAdded?: () => void
  side: 'left' | 'right'
}) {
  const {
    album, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement, bringToFront, sendToBack,
    currentPageIndex, setCurrentPageIndex,
  } = useAlbumStore()

  const stageRef = useRef<any>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null)
  const isActive = pageIndex === (album?.pages.length ? currentPageIndex : 0)
  const page = album?.pages[pageIndex]

  const commitEdit = (text: string) => { if (editingId) { updateElement(pageIndex, editingId, { text }); setEditingId(null) } }

  function handleStageClick(e: any) {
    setCtxMenu(null); setCurrentPageIndex(pageIndex)
    if (editingId) return
    if (e.target !== e.target.getStage()) return
    setSelectedElementId(null)
    if (activeTool === 'text') {
      const pos = stageRef.current?.getPointerPosition(); if (!pos) return
      const id = crypto.randomUUID()
      addElement(pageIndex, { id, type: 'text', text: 'Double-click to edit', x: pos.x / scale - 120, y: pos.y / scale - 12, width: 280, height: 36, fontSize: 18, fill: '#f4f0ea', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', align: 'left', lineHeight: 1.4, rotation: 0 })
      setSelectedElementId(id); onElementAdded?.()
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setCurrentPageIndex(pageIndex)
    const isFrame = e.dataTransfer.getData('elementType') === 'frame'
    const url = e.dataTransfer.getData('photoUrl')
    const pW = parseInt(e.dataTransfer.getData('photoWidth')) || canvasW
    const pH = parseInt(e.dataTransfer.getData('photoHeight')) || canvasH
    if (!url || !stageRef.current) return
    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition() || { x: canvasW / 2, y: canvasH / 2 }
    const sc = Math.min(Math.min(canvasW * 0.7, 420) / pW, Math.min(canvasW * 0.7, 420) / pH, 1)
    addElement(pageIndex, {
      id: crypto.randomUUID(), type: isFrame ? 'frame' : 'image',
      photoId: isFrame ? undefined : (e.dataTransfer.getData('photoId') || undefined),
      frameId: isFrame ? (e.dataTransfer.getData('frameId') || undefined) : undefined,
      url,
      x: isFrame ? 0 : Math.round(pos.x / scale - (pW * sc) / 2),
      y: isFrame ? 0 : Math.round(pos.y / scale - (pH * sc) / 2),
      width: isFrame ? canvasW : Math.round(pW * sc),
      height: isFrame ? canvasH : Math.round(pH * sc),
      rotation: 0,
    })
  }

  function handleCtxMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = stageRef.current?.container()?.getBoundingClientRect()
    const pos = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setCtxMenu({ x: rect.left + pos.x * scale, y: rect.top + pos.y * scale, elementId })
  }

  const closeCtx = useCallback(() => setCtxMenu(null), [])

  if (!page) return null

  const bg = page.background || '#0f0f0f'
  const grad = bg.startsWith('linear-gradient') ? parseLinearGradient(bg, canvasW, canvasH) : null
  const editEl = editingId ? page.elements.find(el => el.id === editingId) ?? null : null

  return (
    <div style={{ position: 'relative', width: Math.round(canvasW * scale), height: Math.round(canvasH * scale), flexShrink: 0 }}
      onDrop={handleDrop} onDragOver={e => e.preventDefault()}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, boxShadow: isActive ? 'inset 0 0 0 1.5px rgba(200,132,46,0.5), 0 0 24px rgba(200,132,46,0.12)' : 'none', transition: 'box-shadow 250ms' }} />

      <Stage ref={stageRef} width={canvasW} height={canvasH} scaleX={scale} scaleY={scale}
        onClick={handleStageClick} style={{ cursor: activeTool === 'text' ? 'crosshair' : 'default' }}>
        <Layer>
          <Rect x={0} y={0} width={canvasW} height={canvasH}
            fill={grad ? undefined : bg}
            fillLinearGradientStartPoint={grad?.startPoint}
            fillLinearGradientEndPoint={grad?.endPoint}
            fillLinearGradientColorStops={grad?.colorStops as (string | number)[] | undefined}
          />
          {page.elements.map(el => {
            const shared = { element: el, isSelected: selectedElementId === el.id, onSelect: () => { setCurrentPageIndex(pageIndex); setSelectedElementId(el.id) }, onUpdate: (u: Partial<PageElement>) => updateElement(pageIndex, el.id, u) }
            if (el.type === 'image' || el.type === 'frame') return <PhotoElement key={el.id} {...shared} />
            return <TextElement key={el.id} {...shared} isBeingEdited={editingId === el.id} onStartEdit={() => { setCurrentPageIndex(pageIndex); setSelectedElementId(el.id); setEditingId(el.id) }} />
          })}
          {page.elements.map(el => (
            <Rect key={`ctx-${el.id}`} x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation || 0} fill="transparent" onContextMenu={e => handleCtxMenu(e, el.id)} />
          ))}
        </Layer>
      </Stage>

      {editEl?.type === 'text' && <InlineTextEditor element={editEl} scale={scale} stageRef={stageRef} onCommit={commitEdit} onCancel={() => setEditingId(null)} />}

      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', pointerEvents: 'none', userSelect: 'none', zIndex: 6, textTransform: 'uppercase' }}>
        {side} · {pageIndex + 1}
      </div>

      <ContextMenu menu={ctxMenu} onClose={closeCtx}
        onDelete={() => ctxMenu && deleteElement(pageIndex, ctxMenu.elementId)}
        onFront={() => ctxMenu && bringToFront(pageIndex, ctxMenu.elementId)}
        onBack={() => ctxMenu && sendToBack(pageIndex, ctxMenu.elementId)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE GUIDE OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function TemplateOverlay({ template, canvasW, canvasH, scale }: {
  template: LayoutTemplate; canvasW: number; canvasH: number; scale: number
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  if (!template || template === 'custom') return null
  const slots = buildSlots(template, canvasW, canvasH)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
      {slots.map(s => {
        const x = s.xP * canvasW * scale
        const y = s.yP * canvasH * scale
        const w = s.wP * canvasW * scale
        const h = s.hP * canvasH * scale
        const isH = hovered === s.id
        return (
          <div key={s.id}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'absolute', left: x, top: y, width: w, height: h,
              border: `1px dashed ${isH ? 'rgba(200,132,46,0.85)' : 'rgba(200,132,46,0.3)'}`,
              borderRadius: 2,
              transform: s.rot ? `rotate(${s.rot}deg)` : undefined,
              transformOrigin: 'center center',
              background: isH ? 'rgba(200,132,46,0.09)' : 'rgba(200,132,46,0.03)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '4px 5px', transition: 'border-color 120ms, background 120ms',
              pointerEvents: 'all', cursor: 'default',
            }}>
            <span style={{ fontSize: 8, color: isH ? 'rgba(200,132,46,0.95)' : 'rgba(200,132,46,0.4)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
              {s.id}
            </span>
            {isH && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(8,8,9,0.94)', border: '1px solid rgba(200,132,46,0.3)', borderRadius: 6, padding: '5px 9px', zIndex: 20, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.55)', pointerEvents: 'none' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.04em', lineHeight: 1.65 }}>
                  Slot {s.id} · AR {s.arLabel}<br />
                  x={Math.round(s.xP * canvasW)} y={Math.round(s.yP * canvasH)}<br />
                  {Math.round(s.wP * canvasW)} × {Math.round(s.hP * canvasH)} px
                  {s.rot ? <><br />↻ {s.rot}°</> : null}
                </div>
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(200,132,46,0.3)' }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING-STATE LAYOUT CONFIGURATOR
// ─────────────────────────────────────────────────────────────────────────────

const SEL: React.CSSProperties = {
  width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 12,
  padding: '7px 10px', borderRadius: 8, outline: 'none', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
}

type TplOpt = { value: LayoutTemplate; label: string; count: string }
const TPL_OPTS: TplOpt[] = [
  { value: 'full-bleed', label: 'Full bleed', count: '1' },
  { value: 'scrapbook', label: 'Scrapbook — overlap', count: '3' },
  { value: 'grid-top-bottom', label: 'Grid + wide bottom', count: '3' },
  { value: 'two-tall-bottom', label: '2 tall + strip', count: '3' },
  { value: 'top-wide-grid', label: 'Wide top + grid', count: '4' },
  { value: 'custom', label: 'Custom (free)', count: '—' },
]

function TemplateSelect({
  live, pending, onChange,
}: { live: LayoutTemplate; pending: LayoutTemplate; onChange: (t: LayoutTemplate) => void }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<LayoutTemplate | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const currentLabel = TPL_OPTS.find(o => o.value === pending)?.label ?? 'Custom'
  const isDirty = pending !== live

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        width: '100%', background: 'var(--bg-tertiary)',
        border: `1px solid ${isDirty ? 'rgba(200,132,46,0.55)' : 'var(--border)'}`,
        color: isDirty ? 'var(--accent)' : 'var(--text-primary)',
        borderRadius: 8, padding: '7px 10px', fontSize: 12,
        fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'border-color 120ms, color 120ms',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 500 }}>
          {TPL_OPTS.map(opt => {
            const isActive = opt.value === pending
            const isHov = hovered === opt.value
            return (
              <div key={opt.value}
                onMouseEnter={() => setHovered(opt.value)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer', background: isActive ? 'rgba(200,132,46,0.12)' : isHov ? 'var(--bg-tertiary)' : 'transparent', transition: 'background 100ms' }}
              >
                <div style={{ flexShrink: 0, width: 56, height: 40, opacity: isHov || isActive ? 1 : 0.32, transition: 'opacity 120ms', borderRadius: 3, overflow: 'hidden' }}>
                  {TEMPLATE_PREVIEWS[opt.value]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', color: isActive ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{opt.count} photo{opt.count === '1' ? '' : 's'}</div>
                </div>
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LayoutConfigurator({ config, onCommit }: { config: SpreadConfig; onCommit: (c: SpreadConfig) => void }) {
  const [pending, setPending] = useState<SpreadConfig>(config)
  const [open, setOpen] = useState(false)
  useEffect(() => { setPending(config) }, [config])

  const hasPending = JSON.stringify(pending) !== JSON.stringify(config)

  function p<K extends keyof SpreadConfig>(k: K, v: SpreadConfig[K]) {
    setPending(prev => ({ ...prev, [k]: v }))
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: open ? 'var(--accent-muted)' : hasPending ? 'rgba(200,132,46,0.08)' : 'var(--bg-elevated)',
        border: `1px solid ${open || hasPending ? 'rgba(200,132,46,0.4)' : 'var(--border)'}`,
        color: open || hasPending ? 'var(--accent)' : 'var(--text-secondary)',
        borderRadius: 8, padding: '6px 12px', fontSize: 12,
        fontFamily: 'var(--font-body)', fontWeight: 600,
        cursor: 'pointer', transition: 'all 150ms', letterSpacing: '0.03em', position: 'relative',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        Layout
        {hasPending && <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 300, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 16, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>Spread Layout</span>
            {hasPending && (
              <button onClick={() => setPending(config)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline', padding: 0 }}>Discard</button>
            )}
          </div>

          {hasPending && (
            <div style={{ background: 'rgba(200,132,46,0.08)', border: '1px solid rgba(200,132,46,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
              ⚡ Unsaved changes — click <strong>Apply</strong> to update the canvas.
            </div>
          )}

          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 5 }}>Desk Theme</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['wedding', 'travel', 'minimalist', 'birthday', 'family'] as LayoutTheme[]).map(t => (
                <button key={t} onClick={() => p('theme', t)} style={{
                  padding: '5px 9px', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 500,
                  borderRadius: 6, border: '1px solid',
                  background: pending.theme === t ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                  borderColor: pending.theme === t ? 'rgba(200,132,46,0.4)' : 'var(--border)',
                  color: pending.theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms', textTransform: 'capitalize',
                  opacity: !!(pending.theme !== t && config.theme === t) ? 0.5 : 1,
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 5 }}>Photo Style</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['clean', 'overlapping', 'framed'] as LayoutStyle[]).map(s => (
                <button key={s} onClick={() => p('layoutStyle', s)} style={{
                  flex: 1, padding: '6px 0', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 500, borderRadius: 6, border: '1px solid',
                  background: pending.layoutStyle === s ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                  borderColor: pending.layoutStyle === s ? 'rgba(200,132,46,0.4)' : 'var(--border)',
                  color: pending.layoutStyle === s ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms', textTransform: 'capitalize',
                }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['left', 'right'] as const).map(side => (
              <div key={side}>
                <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 5 }}>
                  {side === 'left' ? '← Left' : 'Right →'}
                </label>
                <TemplateSelect
                  live={side === 'left' ? config.leftTemplate : config.rightTemplate}
                  pending={side === 'left' ? pending.leftTemplate : pending.rightTemplate}
                  onChange={t => p(side === 'left' ? 'leftTemplate' : 'rightTemplate', t)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              disabled={!hasPending}
              onClick={() => { onCommit(pending); setOpen(false) }}
              style={{
                flex: 2, padding: '8px', border: 'none',
                background: hasPending ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: hasPending ? '#0a0a0a' : 'var(--text-muted)',
                borderRadius: 8, fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: hasPending ? 'pointer' : 'not-allowed',
                transition: 'background 200ms, color 200ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {hasPending ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Apply Changes
                </>
              ) : 'No Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK CHROME
// ─────────────────────────────────────────────────────────────────────────────

function BookSpine({ height }: { height: number }) {
  return (
    <div style={{ width: 28, height, flexShrink: 0, position: 'relative', zIndex: 10 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 12, height: '100%', background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 4, height: '100%', background: 'linear-gradient(to bottom, #2a1f0e, #1a1208, #2a1f0e)', boxShadow: '0 0 8px rgba(0,0,0,0.8)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: '100%', background: 'linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)', pointerEvents: 'none' }} />
      {Array.from({ length: Math.floor(height / 40) }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 20 + i * 40, width: 2, height: 10, background: 'rgba(200,132,46,0.35)', borderRadius: 1 }} />
      ))}
    </div>
  )
}

function PageCurl({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, [side === 'right' ? 'right' : 'left']: 0, width: 28, height: 28, pointerEvents: 'none', zIndex: 8, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, [side === 'right' ? 'right' : 'left']: 0, width: 32, height: 32, background: 'conic-gradient(from 0deg, rgba(0,0,0,0.4) 0deg, rgba(30,22,14,0.6) 45deg, transparent 90deg)', transform: side === 'right' ? 'rotate(0deg)' : 'rotate(90deg)', borderRadius: side === 'right' ? '0 0 0 100%' : '0 0 100% 0' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM + SPREAD NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────

function ZoomControls({ zoom, onChange }: { zoom: number; onChange: (z: number) => void }) {
  const levels = [0.4, 0.6, 0.75, 1.0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 6px' }}>
      <button onClick={() => onChange(Math.max(0.3, zoom - 0.1))} style={{ width: 22, height: 22, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>−</button>
      {levels.map(l => <button key={l} onClick={() => onChange(l)} style={{ padding: '2px 7px', fontSize: 10, fontFamily: 'var(--font-mono)', background: Math.abs(zoom - l) < 0.05 ? 'var(--accent-muted)' : 'none', color: Math.abs(zoom - l) < 0.05 ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{Math.round(l * 100)}%</button>)}
      <button onClick={() => onChange(Math.min(1.4, zoom + 0.1))} style={{ width: 22, height: 22, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>+</button>
    </div>
  )
}

function SpreadNavigator() {
  const { album, currentPageIndex, setCurrentPageIndex } = useAlbumStore()
  if (!album || album.pages.length < 3) return null
  const spreads: number[][] = []
  for (let i = 0; i < album.pages.length; i += 2) spreads.push([i, i + 1].filter(j => j < album.pages.length))
  const cur = Math.floor(currentPageIndex / 2)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '0 4px' }}>
      {spreads.map((spread, si) => (
        <button key={si} onClick={() => setCurrentPageIndex(spread[0])} style={{ display: 'flex', gap: 2, padding: 4, background: si === cur ? 'var(--accent-muted)' : 'none', border: `1px solid ${si === cur ? 'rgba(200,132,46,0.4)' : 'var(--border)'}`, borderRadius: 5, cursor: 'pointer', flexShrink: 0, transition: 'all 150ms' }}>
          {spread.map(pi => <div key={pi} style={{ width: 24, height: 18, background: album.pages[pi]?.background?.startsWith('#') ? album.pages[pi].background : 'var(--bg-tertiary)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT — renders every page to an off-screen canvas, then stitches a PDF
// Uses the native Canvas 2D API so it works without Konva stage refs and works
// for ALL pages, not just the currently visible spread.
// ─────────────────────────────────────────────────────────────────────────────

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    // Append cache-buster only for same-origin / Supabase URLs to sidestep
    // browser cache entries that lack CORS headers
    img.src = url.includes('?') ? url : `${url}?cb=${Date.now()}`
  })
}

async function renderPageToCanvas(
  page: { background: string; elements: PageElement[] },
  canvasW: number,
  canvasH: number,
  scaleMultiplier = 1,
): Promise<HTMLCanvasElement> {
  const offCanvas = document.createElement('canvas')
  const scaledW = Math.max(1, Math.round(canvasW * scaleMultiplier))
  const scaledH = Math.max(1, Math.round(canvasH * scaleMultiplier))
  offCanvas.width = scaledW
  offCanvas.height = scaledH
  const ctx = offCanvas.getContext('2d')!
  ctx.setTransform(scaleMultiplier, 0, 0, scaleMultiplier, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // ── Background ──────────────────────────────────────────────────────────
  const bg = page.background || '#0f0f0f'
  if (bg.startsWith('linear-gradient')) {
    const parsed = parseLinearGradient(bg, canvasW, canvasH)
    if (parsed) {
      const grad = ctx.createLinearGradient(
        parsed.startPoint.x, parsed.startPoint.y,
        parsed.endPoint.x, parsed.endPoint.y
      )
      for (let i = 0; i < parsed.colorStops.length; i += 2) {
        try {
          grad.addColorStop(parsed.colorStops[i] as number, parsed.colorStops[i + 1] as string)
        } catch { /* skip bad stop */ }
      }
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = '#1a1a1a'
    }
  } else {
    ctx.fillStyle = bg
  }
  ctx.fillRect(0, 0, canvasW, canvasH)

  // ── Elements — images first, then text on top ───────────────────────────
  const sorted = [...page.elements].sort((a, b) => {
    if (a.type === 'text' && b.type !== 'text') return 1
    if (a.type !== 'text' && b.type === 'text') return -1
    return 0
  })

  for (const el of sorted) {
    if ((el.type === 'image' || el.type === 'frame') && el.url) {
      const sourceUrl = el.type === 'image' ? toHighQualityUrl(el.url) : el.url
      const img = await loadImage(sourceUrl)
      if (!img) continue

      ctx.save()

      // Apply rotation around the element's centre
      const cx = el.x + el.width / 2
      const cy = el.y + el.height / 2
      if (el.rotation) {
        ctx.translate(cx, cy)
        ctx.rotate((el.rotation * Math.PI) / 180)
        ctx.translate(-cx, -cy)
      }

      // Clip to the slot rectangle
      ctx.beginPath()
      ctx.rect(el.x, el.y, el.width, el.height)
      ctx.clip()

      // Crop-fit the photo (object-fit: cover) — same math as Konva
      const fitMode = el.fit ?? (el.type === 'frame' ? 'contain' : 'cover')
      const { imgX, imgY, imgW, imgH } = computeImageFit(
        img.naturalWidth, img.naturalHeight,
        el.width, el.height,
        fitMode,
      )
      ctx.drawImage(img, el.x + imgX, el.y + imgY, imgW, imgH)

      ctx.restore()
    } else if (el.type === 'text' && el.text) {
      ctx.save()

      // Rotation
      const textCx = el.x + (el.width || 200) / 2
      const textCy = el.y + (el.fontSize || 18) / 2
      if (el.rotation) {
        ctx.translate(textCx, textCy)
        ctx.rotate((el.rotation * Math.PI) / 180)
        ctx.translate(-textCx, -textCy)
      }

      // Font
      const fStyle = el.fontStyle || ''
      const bold = fStyle.includes('bold') ? 'bold' : ''
      const italic = fStyle.includes('italic') ? 'italic' : ''
      const fontSize = el.fontSize || 18
      ctx.font = [italic, bold, `${fontSize}px`, el.fontFamily || 'Georgia, serif']
        .filter(Boolean).join(' ')
      ctx.fillStyle = el.fill || '#f4f0ea'
      ctx.textBaseline = 'top'

      const align = (el.align || 'left') as CanvasTextAlign
      ctx.textAlign = align
      const maxWidth = el.width || 200
      const xPos = align === 'center'
        ? el.x + maxWidth / 2
        : align === 'right'
          ? el.x + maxWidth
          : el.x

      // Word-wrap
      const lineH = fontSize * (el.lineHeight || 1.4)
      let lineY = el.y
      const rawLines = el.text.split('\n')

      for (const rawLine of rawLines) {
        const words = rawLine.split(' ')
        let line = ''
        for (const word of words) {
          const test = line ? `${line} ${word}` : word
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, xPos, lineY)
            line = word
            lineY += lineH
          } else {
            line = test
          }
        }
        if (line) ctx.fillText(line, xPos, lineY)
        lineY += lineH
      }

      ctx.restore()
    }
  }

  return offCanvas
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PROGRESS OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function ExportOverlay({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(8,8,9,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      {/* Animated ring */}
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(200,132,46,0.15)" strokeWidth="4" />
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(200,132,46,0.9)" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 26}`}
          strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
          style={{ transition: 'stroke-dashoffset 300ms ease', transformOrigin: '32px 32px', transform: 'rotate(-90deg)' }}
        />
        <text x="32" y="37" textAnchor="middle" fill="rgba(200,132,46,0.9)" fontSize="12" fontFamily="monospace">{pct}%</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
          Exporting album to PDF…
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          Page {Math.min(current + 1, total)} of {total}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export type AlbumCanvasProps = {
  canvasW?: number
  canvasH?: number
  exportDPI?: number
  activeTool?: 'select' | 'text'
  onElementAdded?: () => void
  onExportReady?: ((action: (() => Promise<void>) | null) => void) | undefined
}

export default function AlbumCanvas({ canvasW = 800, canvasH = 600, exportDPI = 300, activeTool = 'select', onElementAdded, onExportReady }: AlbumCanvasProps) {
  const { album, currentPageIndex, setCurrentPageIndex, undo } = useAlbumStore()

  const [zoom, setZoom] = useState(0.75)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showGuides, setShowGuides] = useState(false)
  const [activeConfig, setActiveConfig] = useState<SpreadConfig>({
    photosPerPage: 2, layoutStyle: 'clean', theme: 'wedding',
    leftTemplate: 'custom', rightTemplate: 'custom',
  })

  // ── PDF export state ────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const exportScale = Math.max(2, Math.min(4, exportDPI / 96))

  const exportToPDF = useCallback(async () => {
    if (!album || exporting) return
    setExporting(true)
    const total = album.pages.length
    setExportProgress({ current: 0, total })

    try {
      // Dynamic import — only loaded when actually exporting
      const { default: jsPDF } = await import('jspdf')

      // Ensure Google Fonts / custom fonts have loaded
      await document.fonts.ready

      const isLandscape = canvasW >= canvasH
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < album.pages.length; i++) {
        setExportProgress({ current: i, total })

        if (i > 0) pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait')

        const offCanvas = await renderPageToCanvas(album.pages[i], canvasW, canvasH, exportScale)
        const dataUrl = offCanvas.toDataURL('image/png')
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST')
      }

      setExportProgress({ current: total, total })

      // Small delay so the user sees 100% before the dialog appears
      await new Promise(r => setTimeout(r, 300))

      const safeName = (album.title || 'album')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      pdf.save(`${safeName}.pdf`)

    } catch (err: any) {
      console.error('PDF export failed:', err)
      // Show a user-facing error without crashing
      alert(`Export failed: ${err?.message || 'Unknown error'}.\n\nMake sure all photos have finished loading and try again.`)
    } finally {
      setExporting(false)
      setExportProgress({ current: 0, total: 0 })
    }
  }, [album, canvasW, canvasH, exportScale, exporting])

  useEffect(() => {
    onExportReady?.(exportToPDF)
    return () => onExportReady?.(null)
  }, [exportToPDF, onExportReady])

  const leftIdx = Math.floor(currentPageIndex / 2) * 2
  const rightIdx = leftIdx + 1
  const hasRight = album ? rightIdx < album.pages.length : false
  const scaledW = Math.round(canvasW * zoom)
  const scaledH = Math.round(canvasH * zoom)
  const env = THEME_ENVS[activeConfig.theme]

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'ArrowRight' && album && rightIdx + 1 < album.pages.length) setCurrentPageIndex(leftIdx + 2)
      if (e.key === 'ArrowLeft' && leftIdx >= 2) setCurrentPageIndex(leftIdx - 2)
      if (e.key === 'g') setShowGuides(v => !v)
      // Keyboard shortcut for export
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'e') { e.preventDefault(); exportToPDF() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [album, leftIdx, rightIdx, setCurrentPageIndex, undo, exportToPDF])

  if (!album) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: env.bg }}>

      {/* Export progress overlay */}
      {exporting && <ExportOverlay current={exportProgress.current} total={exportProgress.total} />}

      {/* Grain + Vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: env.grain, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: env.vignette }} />

      {/* ── TOOLBAR ── */}
      <div style={{ position: 'relative', zIndex: 20, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, background: 'rgba(8,8,9,0.65)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Page nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => { if (leftIdx >= 2) setCurrentPageIndex(leftIdx - 2) }}
            disabled={leftIdx < 2}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: leftIdx < 2 ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)', cursor: leftIdx < 2 ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (leftIdx >= 2) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)') }}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 6px', letterSpacing: '0.04em', minWidth: 70, textAlign: 'center' }}>
            pp. {leftIdx + 1}–{Math.min(rightIdx + 1, album.pages.length)} / {album.pages.length}
          </span>
          <button
            onClick={() => { if (album && rightIdx + 1 < album.pages.length) setCurrentPageIndex(leftIdx + 2) }}
            disabled={!album || rightIdx + 1 >= album.pages.length}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: (!album || rightIdx + 1 >= album.pages.length) ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)', cursor: (!album || rightIdx + 1 >= album.pages.length) ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (album && rightIdx + 1 < album.pages.length) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)') }}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* Layout configurator */}
        <LayoutConfigurator config={activeConfig} onCommit={setActiveConfig} />

        {/* Guide toggle */}
        <button onClick={() => setShowGuides(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: showGuides ? 'var(--accent-muted)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showGuides ? 'rgba(200,132,46,0.35)' : 'rgba(255,255,255,0.08)'}`, color: showGuides ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 150ms', fontWeight: 600, letterSpacing: '0.03em' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          {showGuides ? 'Hide Guides' : 'Show Guides'}
          <span style={{ fontSize: 9, opacity: 0.55, fontFamily: 'var(--font-mono)' }}>[G]</span>
        </button>

        <div style={{ flex: 1 }} />
        <SpreadNavigator />
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
        <ZoomControls zoom={zoom} onChange={setZoom} />

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

        {/* ── PDF Export Button ── */}
        {false && <button
          onClick={exportToPDF}
          disabled={exporting || !album?.pages?.length}
          title="Export album as PDF (⌘⇧E)"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: exporting ? 'rgba(200,132,46,0.05)' : 'rgba(200,132,46,0.1)',
            border: '1px solid rgba(200,132,46,0.35)',
            color: exporting ? 'rgba(200,132,46,0.4)' : 'var(--accent)',
            borderRadius: 8, padding: '5px 12px', fontSize: 11,
            fontFamily: 'var(--font-body)', fontWeight: 700,
            cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'all 150ms', letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!exporting) (e.currentTarget.style.background = 'rgba(200,132,46,0.18)') }}
          onMouseLeave={e => (e.currentTarget.style.background = exporting ? 'rgba(200,132,46,0.05)' : 'rgba(200,132,46,0.1)')}
        >
          {exporting ? (
            /* Spinner */
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-18 0" />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>}
      </div>

      {/* ── SPREAD AREA ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: 32 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.9)) drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}>

          {/* LEFT */}
          <div style={{ position: 'relative', width: scaledW, height: scaledH, flexShrink: 0, overflow: 'hidden', boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.3)' }}>
            <PageCanvas pageIndex={leftIdx} canvasW={canvasW} canvasH={canvasH} scale={zoom} activeTool={activeTool} editingId={editingId} setEditingId={setEditingId} onElementAdded={onElementAdded} side="left" />
            {showGuides && <TemplateOverlay template={activeConfig.leftTemplate} canvasW={canvasW} canvasH={canvasH} scale={zoom} />}
            <PageCurl side="left" />
          </div>

          <BookSpine height={scaledH} />

          {/* RIGHT */}
          {hasRight ? (
            <div style={{ position: 'relative', width: scaledW, height: scaledH, flexShrink: 0, overflow: 'hidden', boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.3)' }}>
              <PageCanvas pageIndex={rightIdx} canvasW={canvasW} canvasH={canvasH} scale={zoom} activeTool={activeTool} editingId={editingId} setEditingId={setEditingId} onElementAdded={onElementAdded} side="right" />
              {showGuides && <TemplateOverlay template={activeConfig.rightTemplate} canvasW={canvasW} canvasH={canvasH} scale={zoom} />}
              <PageCurl side="right" />
            </div>
          ) : (
            <div style={{ width: scaledW, height: scaledH, background: '#1a1510', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.35)' }}>
              <span style={{ color: 'rgba(200,132,46,0.15)', fontFamily: 'var(--font-display)', fontSize: Math.round(zoom * 20), letterSpacing: '0.15em', userSelect: 'none' }}>—</span>
            </div>
          )}

          {/* Book edges */}
          <div style={{ position: 'absolute', top: -6, left: 0, right: 0, height: 6, background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)', pointerEvents: 'none', zIndex: 12 }} />
          <div style={{ position: 'absolute', bottom: -4, left: 4, right: 4, height: 4, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', borderRadius: '0 0 4px 4px', pointerEvents: 'none', zIndex: 12 }} />
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ position: 'relative', zIndex: 20, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, background: 'rgba(8,8,9,0.65)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>← → pages · G guides · ⌘Z undo · ⌘⇧E export</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'rgba(200,132,46,0.4)', fontFamily: 'var(--font-mono)' }}>{activeConfig.theme} · {activeConfig.layoutStyle}</span>
        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>{canvasW}×{canvasH} · {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  )
}
