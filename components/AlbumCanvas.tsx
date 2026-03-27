'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type LayoutTemplate =
  | 'scrapbook'       // overlapping, slight rotations (template2.png left side)
  | 'grid-top-bottom' // 2 top + 1 wide bottom (template2.png right side)
  | 'two-tall-bottom' // 2 tall cols + wide bottom strip (template3.png left)
  | 'top-wide-grid'   // wide top + 2×2 grid (template3.png right)
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
// GRADIENT PARSER (for Konva backgrounds)
// ─────────────────────────────────────────────────────────────────────────────

function parseLinearGradient(css: string, w: number, h: number) {
  try {
    const inner = css.slice('linear-gradient('.length, css.lastIndexOf(')'))
    const parts = inner.split(/,(?![^(]*\))/).map(s => s.trim())
    let angle = 135
    let stopIdx = 0
    if (/^\d+(\.\d+)?deg$/i.test(parts[0])) {
      angle = parseFloat(parts[0]); stopIdx = 1
    } else if (/^to\s+/i.test(parts[0])) {
      const dir = parts[0].toLowerCase()
      if (dir.includes('right')) angle = 90
      else if (dir.includes('left')) angle = 270
      else if (dir.includes('bottom')) angle = 180
      stopIdx = 1
    }
    const stopParts = parts.slice(stopIdx)
    const rad = ((angle - 90) * Math.PI) / 180
    const cos = Math.cos(rad); const sin = Math.sin(rad)
    const len = Math.abs(w * cos) + Math.abs(h * sin)
    const colorStops: (number | string)[] = []
    stopParts.forEach((stop, i) => {
      const bits = stop.trim().split(/\s+(?=[\d.]+%)/)
      const color = bits[0].trim()
      const pct = bits[1] ? parseFloat(bits[1]) / 100 : i / Math.max(stopParts.length - 1, 1)
      colorStops.push(pct, color)
    })
    return {
      startPoint: { x: w / 2 - (cos * len) / 2, y: h / 2 - (sin * len) / 2 },
      endPoint: { x: w / 2 + (cos * len) / 2, y: h / 2 + (sin * len) / 2 },
      colorStops,
    }
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT BACKGROUNDS (desk themes)
// ─────────────────────────────────────────────────────────────────────────────

const THEME_ENVIRONMENTS: Record<LayoutTheme, { bg: string; grain: number; vignette: string }> = {
  wedding: {
    bg: 'radial-gradient(ellipse at 30% 20%, #2a1f18 0%, #1a1208 40%, #0d0a06 100%)',
    grain: 0.04,
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,3,2,0.85) 100%)',
  },
  travel: {
    bg: 'radial-gradient(ellipse at 70% 30%, #0d1a2a 0%, #091420 50%, #050d15 100%)',
    grain: 0.03,
    vignette: 'radial-gradient(ellipse at center, transparent 45%, rgba(3,8,14,0.9) 100%)',
  },
  minimalist: {
    bg: 'radial-gradient(ellipse at center, #18181c 0%, #0e0e11 60%, #080809 100%)',
    grain: 0.02,
    vignette: 'radial-gradient(ellipse at center, transparent 55%, rgba(4,4,5,0.8) 100%)',
  },
  birthday: {
    bg: 'radial-gradient(ellipse at 40% 60%, #1a0d0a 0%, #120808 50%, #080505 100%)',
    grain: 0.035,
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(6,3,3,0.88) 100%)',
  },
  family: {
    bg: 'radial-gradient(ellipse at 60% 40%, #1a140a 0%, #110e06 50%, #080600 100%)',
    grain: 0.03,
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,4,2,0.85) 100%)',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE SLOT DEFINITIONS (fractions of a single page canvas)
// ─────────────────────────────────────────────────────────────────────────────

const M = 0.04 // margin

type SlotDef = { xP: number; yP: number; wP: number; hP: number; rot?: number }

const TEMPLATE_SLOTS: Record<LayoutTemplate, SlotDef[]> = {
  'full-bleed': [
    { xP: 0, yP: 0, wP: 1, hP: 1 },
  ],
  'scrapbook': [
    { xP: 0.04, yP: 0.05, wP: 0.48, hP: 0.44, rot: -2.5 },
    { xP: 0.08, yP: 0.38, wP: 0.42, hP: 0.52, rot: 1.5 },
    { xP: 0.44, yP: 0.14, wP: 0.52, hP: 0.48, rot: 2 },
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

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO ELEMENT
// ─────────────────────────────────────────────────────────────────────────────

function PhotoElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (u: Partial<PageElement>) => void
}) {
  const [image, status] = useImage(element.url || '', 'anonymous')
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  if (status === 'failed') {
    return (
      <Rect
        x={element.x} y={element.y}
        width={element.width} height={element.height}
        rotation={element.rotation}
        fill="#1a1010" stroke="rgba(224,80,80,0.3)" strokeWidth={1}
        cornerRadius={3} onClick={onSelect} onTap={onSelect}
      />
    )
  }

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={element.x} y={element.y}
        width={element.width} height={element.height}
        rotation={element.rotation}
        opacity={element.opacity ?? 1}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current; if (!n) return
          onUpdate({
            x: n.x(), y: n.y(),
            width: Math.max(20, n.width() * n.scaleX()),
            height: Math.max(20, n.height() * n.scaleY()),
            rotation: n.rotation(),
          })
          n.scaleX(1); n.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
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
  element: PageElement
  isSelected: boolean
  isBeingEdited: boolean
  onSelect: () => void
  onUpdate: (u: Partial<PageElement>) => void
  onStartEdit: () => void
}) {
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)

  useEffect(() => {
    if (isSelected && !isBeingEdited && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, isBeingEdited])

  const fontStyle = [
    element.fontStyle?.includes('bold') ? 'bold' : '',
    element.fontStyle?.includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal'

  return (
    <>
      <Text
        ref={shapeRef}
        text={isBeingEdited ? '' : (element.text || '')}
        x={element.x} y={element.y}
        width={element.width || 280}
        rotation={element.rotation || 0}
        fontSize={element.fontSize || 18}
        fill={isBeingEdited ? 'transparent' : (element.fill || '#f4f0ea')}
        fontFamily={element.fontFamily || 'Georgia, serif'}
        fontStyle={fontStyle}
        textDecoration={element.fontStyle?.includes('underline') ? 'underline' : ''}
        align={element.align || 'left'}
        lineHeight={element.lineHeight || 1.4}
        opacity={isBeingEdited ? 0 : (element.opacity ?? 1)}
        draggable={!isBeingEdited}
        onClick={onSelect} onTap={onSelect}
        onDblClick={onStartEdit} onDblTap={onStartEdit}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current; if (!n) return
          onUpdate({
            x: n.x(), y: n.y(),
            width: Math.max(40, n.width() * n.scaleX()),
            rotation: n.rotation(),
          })
          n.scaleX(1); n.scaleY(1)
          n.getLayer()?.batchDraw()
        }}
      />
      {isSelected && !isBeingEdited && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
          borderStroke="rgba(200,132,46,0.9)" borderStrokeWidth={1.5}
          anchorFill="#1c1c21" anchorStroke="rgba(200,132,46,0.9)"
          anchorStrokeWidth={1.5} anchorSize={9} anchorCornerRadius={3}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE TEXT EDITOR OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function InlineTextEditor({ element, scale, stageRef, onCommit, onCancel }: {
  element: PageElement
  scale: number
  stageRef: React.RefObject<any>
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
    autoResize(ta)
  }, [])

  function autoResize(ta: HTMLTextAreaElement) {
    ta.style.height = 'auto'
    ta.style.height = Math.max(ta.scrollHeight, (element.fontSize || 18) * scale * 1.4 + 8) + 'px'
  }

  const getStyle = (): React.CSSProperties | null => {
    if (!stageRef.current) return null
    const container = stageRef.current.container() as HTMLElement
    const rect = container.getBoundingClientRect()
    const fontStyleStr = element.fontStyle || ''
    const fs = (element.fontSize || 18) * scale
    return {
      position: 'fixed',
      left: Math.round(rect.left + element.x * scale),
      top: Math.round(rect.top + element.y * scale),
      width: Math.round(Math.max((element.width || 200) * scale, 80)),
      minHeight: Math.round(fs * (element.lineHeight || 1.4) + 8),
      fontSize: Math.round(fs),
      fontFamily: element.fontFamily || 'Georgia, serif',
      fontWeight: fontStyleStr.includes('bold') ? 'bold' : 'normal',
      fontStyle: fontStyleStr.includes('italic') ? 'italic' : 'normal',
      textDecoration: fontStyleStr.includes('underline') ? 'underline' : 'none',
      color: element.fill || '#f4f0ea',
      lineHeight: String(element.lineHeight || 1.4),
      textAlign: (element.align as any) || 'left',
      background: 'rgba(8,8,9,0.06)',
      border: '1.5px dashed rgba(200,132,46,0.8)',
      borderRadius: '3px',
      padding: '2px 4px',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      zIndex: 9999,
      boxSizing: 'border-box',
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      transformOrigin: 'top left',
      caretColor: '#c8842e',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }
  }

  const style = getStyle()
  if (!style) return null

  return (
    <textarea
      ref={taRef}
      defaultValue={element.text || ''}
      style={style}
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
    const handle = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-ctx-menu]')) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menu, onClose])

  if (!menu) return null

  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '8px 14px',
    background: 'none', border: 'none',
    color: 'var(--text-primary)', fontSize: '12px',
    cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
  }

  return (
    <div data-ctx-menu style={{
      position: 'fixed', left: menu.x, top: menu.y,
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
      zIndex: 1000, overflow: 'hidden', minWidth: '160px',
    }}>
      {[
        { label: '↑ Bring to front', fn: onFront },
        { label: '↓ Send to back', fn: onBack },
      ].map(item => (
        <button key={item.label} style={base}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          onClick={() => { item.fn(); onClose() }}
        >{item.label}</button>
      ))}
      <div style={{ height: '1px', background: 'var(--border)' }} />
      <button style={{ ...base, color: 'var(--danger)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        onClick={() => { onDelete(); onClose() }}
      >🗑 Delete</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE PAGE CANVAS
// ─────────────────────────────────────────────────────────────────────────────

function PageCanvas({
  pageIndex,
  canvasW,
  canvasH,
  scale,
  activeTool,
  editingId,
  setEditingId,
  onElementAdded,
  side,
}: {
  pageIndex: number
  canvasW: number
  canvasH: number
  scale: number
  activeTool: 'select' | 'text'
  editingId: string | null
  setEditingId: (id: string | null) => void
  onElementAdded?: () => void
  side: 'left' | 'right'
}) {
  const {
    album,
    selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement, bringToFront, sendToBack,
    currentPageIndex, setCurrentPageIndex,
  } = useAlbumStore()

  const stageRef = useRef<any>(null)
  const [contextMenu, setContextMenu] = useState<CtxMenu>(null)

  const isActive = pageIndex === (album?.pages.length ? currentPageIndex : 0)
  const page = album?.pages[pageIndex]

  function commitEdit(newText: string) {
    if (!editingId) return
    updateElement(pageIndex, editingId, { text: newText })
    setEditingId(null)
  }

  function handleStageClick(e: any) {
    setContextMenu(null)
    // Mark this page as active
    setCurrentPageIndex(pageIndex)

    if (editingId) return
    const isStage = e.target === e.target.getStage()
    if (!isStage) return
    setSelectedElementId(null)

    if (activeTool === 'text') {
      const pos = stageRef.current?.getPointerPosition()
      if (!pos) return
      const id = crypto.randomUUID()
      addElement(pageIndex, {
        id, type: 'text',
        text: 'Double-click to edit',
        x: pos.x / scale - 120,
        y: pos.y / scale - 12,
        width: 280, height: 36,
        fontSize: 18, fill: '#f4f0ea',
        fontFamily: 'Cormorant Garamond, serif',
        fontStyle: 'italic',
        align: 'left', lineHeight: 1.4, rotation: 0,
      })
      setSelectedElementId(id)
      onElementAdded?.()
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setCurrentPageIndex(pageIndex)
    const elementType = e.dataTransfer.getData('elementType') || 'image'
    const photoId = e.dataTransfer.getData('photoId')
    const frameId = e.dataTransfer.getData('frameId')
    const url = e.dataTransfer.getData('photoUrl')
    const pW = parseInt(e.dataTransfer.getData('photoWidth')) || canvasW
    const pH = parseInt(e.dataTransfer.getData('photoHeight')) || canvasH
    if (!url || !stageRef.current) return
    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition() || { x: canvasW / 2, y: canvasH / 2 }
    const isFrame = elementType === 'frame'
    const maxW = isFrame ? canvasW : Math.min(canvasW * 0.7, 420)
    const sc = Math.min(maxW / pW, maxW / pH, 1)
    addElement(pageIndex, {
      id: crypto.randomUUID(),
      type: isFrame ? 'frame' : 'image',
      photoId: isFrame ? undefined : photoId || undefined,
      frameId: isFrame ? (frameId || undefined) : undefined,
      url,
      x: isFrame ? 0 : Math.round(pos.x / scale - (pW * sc) / 2),
      y: isFrame ? 0 : Math.round(pos.y / scale - (pH * sc) / 2),
      width: isFrame ? canvasW : Math.round(pW * sc),
      height: isFrame ? canvasH : Math.round(pH * sc),
      rotation: 0,
    })
  }

  function handleContextMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = stageRef.current?.container()?.getBoundingClientRect()
    const pos = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setContextMenu({ x: rect.left + pos.x * scale, y: rect.top + pos.y * scale, elementId })
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!page) return null

  const bg = page.background || '#0f0f0f'
  const gradient = bg.startsWith('linear-gradient') ? parseLinearGradient(bg, canvasW, canvasH) : null

  const scaledW = Math.round(canvasW * scale)
  const scaledH = Math.round(canvasH * scale)

  const editingElement = editingId ? page.elements.find(el => el.id === editingId) ?? null : null

  return (
    <div
      style={{ position: 'relative', width: scaledW, height: scaledH, flexShrink: 0 }}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* Active page indicator border glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
        boxShadow: isActive
          ? `inset 0 0 0 1.5px rgba(200,132,46,0.5), 0 0 24px rgba(200,132,46,0.12)`
          : 'none',
        transition: 'box-shadow 250ms ease',
      }} />

      <Stage
        ref={stageRef}
        width={canvasW} height={canvasH}
        scaleX={scale} scaleY={scale}
        onClick={handleStageClick}
        style={{ cursor: activeTool === 'text' ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0} y={0} width={canvasW} height={canvasH}
            fill={gradient ? undefined : bg}
            fillLinearGradientStartPoint={gradient?.startPoint}
            fillLinearGradientEndPoint={gradient?.endPoint}
            fillLinearGradientColorStops={gradient?.colorStops as (string | number)[] | undefined}
          />

          {/* Elements */}
          {page.elements.map(el => {
            const shared = {
              element: el,
              isSelected: selectedElementId === el.id,
              onSelect: () => { setCurrentPageIndex(pageIndex); setSelectedElementId(el.id) },
              onUpdate: (u: Partial<PageElement>) => updateElement(pageIndex, el.id, u),
            }
            if (el.type === 'image' || el.type === 'frame') {
              return <PhotoElement key={el.id} {...shared} />
            }
            return (
              <TextElement
                key={el.id} {...shared}
                isBeingEdited={editingId === el.id}
                onStartEdit={() => { setCurrentPageIndex(pageIndex); setSelectedElementId(el.id); setEditingId(el.id) }}
              />
            )
          })}

          {/* Context menu hit rects */}
          {page.elements.map(el => (
            <Rect
              key={`ctx-${el.id}`}
              x={el.x} y={el.y}
              width={el.width} height={el.height}
              rotation={el.rotation || 0}
              fill="transparent"
              onContextMenu={e => handleContextMenu(e, el.id)}
            />
          ))}
        </Layer>
      </Stage>

      {/* Inline text editor */}
      {editingElement?.type === 'text' && (
        <InlineTextEditor
          element={editingElement}
          scale={scale}
          stageRef={stageRef}
          onCommit={commitEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* Page label */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.1em', pointerEvents: 'none', userSelect: 'none', zIndex: 6,
        textTransform: 'uppercase',
      }}>
        {side} · {pageIndex + 1}
      </div>

      {/* Context menu */}
      <ContextMenu
        menu={contextMenu} onClose={closeContextMenu}
        onDelete={() => contextMenu && deleteElement(pageIndex, contextMenu.elementId)}
        onFront={() => contextMenu && bringToFront(pageIndex, contextMenu.elementId)}
        onBack={() => contextMenu && sendToBack(pageIndex, contextMenu.elementId)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK SPINE
// ─────────────────────────────────────────────────────────────────────────────

function BookSpine({ height }: { height: number }) {
  return (
    <div style={{
      width: '28px',
      height,
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Spine shadow left */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '12px', height: '100%',
        background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Center strip */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '4px', height: '100%',
        background: 'linear-gradient(to bottom, #2a1f0e, #1a1208, #2a1f0e)',
        boxShadow: '0 0 8px rgba(0,0,0,0.8)',
      }} />
      {/* Spine shadow right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '12px', height: '100%',
        background: 'linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Binding stitches */}
      {Array.from({ length: Math.floor(height / 40) }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          top: 20 + i * 40,
          width: '2px', height: '10px',
          background: 'rgba(200,132,46,0.35)',
          borderRadius: '1px',
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOK PAGE SHADOWS & CORNERS (skeuomorphic chrome)
// ─────────────────────────────────────────────────────────────────────────────

function PageCurl({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      [side === 'right' ? 'right' : 'left']: 0,
      width: 28,
      height: 28,
      pointerEvents: 'none',
      zIndex: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        [side === 'right' ? 'right' : 'left']: 0,
        width: 32,
        height: 32,
        background: 'conic-gradient(from 0deg, rgba(0,0,0,0.4) 0deg, rgba(30,22,14,0.6) 45deg, transparent 90deg)',
        transform: side === 'right' ? 'rotate(0deg)' : 'rotate(90deg)',
        borderRadius: side === 'right' ? '0 0 0 100%' : '0 0 100% 0',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE APPLY TOOL (places photo slots on current page)
// ─────────────────────────────────────────────────────────────────────────────

function TemplateOverlay({
  template,
  canvasW,
  canvasH,
  scale,
  side,
}: {
  template: LayoutTemplate | null
  canvasW: number
  canvasH: number
  scale: number
  side: 'left' | 'right'
}) {
  if (!template || template === 'custom') return null
  const slots = TEMPLATE_SLOTS[template] || []

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7,
    }}>
      {slots.map((slot, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: slot.xP * canvasW * scale,
          top: slot.yP * canvasH * scale,
          width: slot.wP * canvasW * scale,
          height: slot.hP * canvasH * scale,
          border: '1px dashed rgba(200,132,46,0.3)',
          borderRadius: 2,
          transform: slot.rot ? `rotate(${slot.rot}deg)` : undefined,
          transformOrigin: 'center center',
          background: 'rgba(200,132,46,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 9, color: 'rgba(200,132,46,0.3)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>slot {i + 1}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONFIGURATOR SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  padding: '7px 10px',
  borderRadius: '8px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
}

function LayoutConfigurator({
  config,
  onChange,
  onApplyTemplate,
}: {
  config: SpreadConfig
  onChange: (c: Partial<SpreadConfig>) => void
  onApplyTemplate: (side: 'left' | 'right', template: LayoutTemplate) => void
}) {
  const [open, setOpen] = useState(false)

  const TEMPLATES_OPTS: { value: LayoutTemplate; label: string }[] = [
    { value: 'full-bleed', label: 'Full bleed' },
    { value: 'scrapbook', label: 'Scrapbook (3 photos)' },
    { value: 'grid-top-bottom', label: 'Grid + Wide bottom' },
    { value: 'two-tall-bottom', label: '2 tall + strip' },
    { value: 'top-wide-grid', label: 'Wide top + grid' },
    { value: 'custom', label: 'Custom (free)' },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: open ? 'var(--accent-muted)' : 'var(--bg-elevated)',
          border: `1px solid ${open ? 'rgba(200,132,46,0.4)' : 'var(--border)'}`,
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          borderRadius: '8px', padding: '6px 12px',
          fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 600,
          cursor: 'pointer', transition: 'all 150ms ease',
          letterSpacing: '0.03em',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        Layout
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '280px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
          padding: '16px', zIndex: 300,
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
            Spread Layout Config
          </div>

          {/* Theme */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: '5px' }}>Theme</label>
            <div style={{ position: 'relative' }}>
              <select value={config.theme} onChange={e => onChange({ theme: e.target.value as LayoutTheme })} style={SELECT_STYLE}>
                {(['wedding', 'travel', 'minimalist', 'birthday', 'family'] as LayoutTheme[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <svg style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>

          {/* Style */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: '5px' }}>Style</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              {(['clean', 'overlapping', 'framed'] as LayoutStyle[]).map(s => (
                <button key={s} onClick={() => onChange({ layoutStyle: s })} style={{
                  flex: 1, padding: '6px 0', fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 500,
                  borderRadius: '6px', border: '1px solid',
                  background: config.layoutStyle === s ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                  borderColor: config.layoutStyle === s ? 'rgba(200,132,46,0.4)' : 'var(--border)',
                  color: config.layoutStyle === s ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms',
                  textTransform: 'capitalize',
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Photos per page */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: '5px' }}>Photos / page</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              {([1, 2, 4, 6] as PhotosPerPage[]).map(n => (
                <button key={n} onClick={() => onChange({ photosPerPage: n })} style={{
                  flex: 1, padding: '6px 0', fontSize: '12px', fontFamily: 'var(--font-mono)',
                  borderRadius: '6px', border: '1px solid',
                  background: config.photosPerPage === n ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                  borderColor: config.photosPerPage === n ? 'rgba(200,132,46,0.4)' : 'var(--border)',
                  color: config.photosPerPage === n ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms',
                }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Per-page template pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(['left', 'right'] as const).map(side => (
              <div key={side}>
                <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: '5px' }}>
                  {side} template
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={side === 'left' ? config.leftTemplate : config.rightTemplate}
                    onChange={e => {
                      const t = e.target.value as LayoutTemplate
                      onChange(side === 'left' ? { leftTemplate: t } : { rightTemplate: t })
                      onApplyTemplate(side, t)
                    }}
                    style={{ ...SELECT_STYLE, fontSize: '11px', padding: '6px 8px' }}
                  >
                    {TEMPLATES_OPTS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setOpen(false)}
            style={{
              width: '100%', padding: '7px', background: 'var(--accent)', border: 'none',
              color: '#0a0a0a', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
            }}
          >Apply</button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

function ZoomControls({ zoom, onChange }: { zoom: number; onChange: (z: number) => void }) {
  const levels = [0.4, 0.6, 0.75, 1.0]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '4px 6px',
    }}>
      <button
        onClick={() => onChange(Math.max(0.3, zoom - 0.1))}
        style={{ width: '22px', height: '22px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >−</button>

      <div style={{ display: 'flex', gap: '2px' }}>
        {levels.map(l => (
          <button key={l} onClick={() => onChange(l)} style={{
            padding: '2px 7px', fontSize: '10px', fontFamily: 'var(--font-mono)',
            background: Math.abs(zoom - l) < 0.05 ? 'var(--accent-muted)' : 'none',
            color: Math.abs(zoom - l) < 0.05 ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
          }}>{Math.round(l * 100)}%</button>
        ))}
      </div>

      <button
        onClick={() => onChange(Math.min(1.4, zoom + 0.1))}
        style={{ width: '22px', height: '22px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >+</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE NAVIGATOR — thumbnail strip at bottom
// ─────────────────────────────────────────────────────────────────────────────

function SpreadNavigator() {
  const { album, currentPageIndex, setCurrentPageIndex } = useAlbumStore()
  if (!album || album.pages.length < 3) return null

  // Group pages into spreads (pairs)
  const spreads: number[][] = []
  for (let i = 0; i < album.pages.length; i += 2) {
    spreads.push([i, i + 1].filter(j => j < album.pages.length))
  }

  const currentSpread = Math.floor(currentPageIndex / 2)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      overflowX: 'auto',
      padding: '0 4px',
    }}>
      {spreads.map((spread, si) => (
        <button key={si} onClick={() => setCurrentPageIndex(spread[0])} style={{
          display: 'flex', gap: '2px', padding: '4px',
          background: si === currentSpread ? 'var(--accent-muted)' : 'none',
          border: `1px solid ${si === currentSpread ? 'rgba(200,132,46,0.4)' : 'var(--border)'}`,
          borderRadius: '5px', cursor: 'pointer', flexShrink: 0, transition: 'all 150ms',
        }}>
          {spread.map(pi => {
            const page = album.pages[pi]
            return (
              <div key={pi} style={{
                width: 24, height: 18,
                background: page?.background?.startsWith('#') ? page.background : 'var(--bg-tertiary)',
                borderRadius: '2px', border: '1px solid rgba(255,255,255,0.06)',
              }} />
            )
          })}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type AlbumCanvasProps = {
  canvasW?: number
  canvasH?: number
  activeTool?: 'select' | 'text'
  onElementAdded?: () => void
}

export default function AlbumCanvas({
  canvasW = 800,
  canvasH = 600,
  activeTool = 'select',
  onElementAdded,
}: AlbumCanvasProps) {
  const { album, currentPageIndex, setCurrentPageIndex, addElement, deleteElement, undo } = useAlbumStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.75)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTemplateOverlay, setShowTemplateOverlay] = useState(false)
  const [spreadConfig, setSpreadConfig] = useState<SpreadConfig>({
    photosPerPage: 2,
    layoutStyle: 'clean',
    theme: 'wedding',
    leftTemplate: 'custom',
    rightTemplate: 'custom',
  })

  // Derive spread: left page = even index, right page = odd index
  const leftPageIndex = Math.floor(currentPageIndex / 2) * 2
  const rightPageIndex = leftPageIndex + 1
  const hasRightPage = album ? rightPageIndex < album.pages.length : false

  const scaledPageW = Math.round(canvasW * zoom)
  const scaledPageH = Math.round(canvasH * zoom)

  // Total spread width: page + spine + page (or just page if single)
  const spineWidth = 28

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if (e.key === 'ArrowRight') { if (album && rightPageIndex + 2 < album.pages.length) setCurrentPageIndex(leftPageIndex + 2) }
      if (e.key === 'ArrowLeft') { if (leftPageIndex >= 2) setCurrentPageIndex(leftPageIndex - 2) }
      if (e.key === 't' && !(e.ctrlKey || e.metaKey)) setShowTemplateOverlay(v => !v)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [album, leftPageIndex, rightPageIndex, setCurrentPageIndex, undo])

  function handleApplyTemplate(side: 'left' | 'right', template: LayoutTemplate) {
    const pageIdx = side === 'left' ? leftPageIndex : rightPageIndex
    if (!album || pageIdx >= album.pages.length || template === 'custom') return
    // Template overlay will show guide lines
    setShowTemplateOverlay(true)
  }

  const env = THEME_ENVIRONMENTS[spreadConfig.theme]

  if (!album) return null

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        // ENVIRONMENT BACKGROUND — the "desk" / darkroom surface
        background: env.bg,
      }}
    >
      {/* ── Grain texture overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: env.grain,
        mixBlendMode: 'overlay',
      }} />

      {/* ── Vignette overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: env.vignette,
      }} />

      {/* ── TOOLBAR ROW ── */}
      <div style={{
        position: 'relative', zIndex: 20,
        height: '44px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '8px',
        background: 'rgba(8,8,9,0.65)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => { if (leftPageIndex >= 2) setCurrentPageIndex(leftPageIndex - 2) }}
            disabled={leftPageIndex < 2}
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
              color: leftPageIndex < 2 ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)',
              cursor: leftPageIndex < 2 ? 'not-allowed' : 'pointer', transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (leftPageIndex >= 2) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)') }}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 6px', letterSpacing: '0.04em', minWidth: '70px', textAlign: 'center' }}>
            pp. {leftPageIndex + 1}–{Math.min(rightPageIndex + 1, album?.pages.length ?? 1)} / {album?.pages.length ?? 1}
          </div>

          <button
            onClick={() => { if (album && rightPageIndex + 1 < album.pages.length) setCurrentPageIndex(leftPageIndex + 2) }}
            disabled={!album || rightPageIndex + 1 >= album.pages.length}
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
              color: (!album || rightPageIndex + 1 >= album.pages.length) ? 'rgba(255,255,255,0.15)' : 'var(--text-secondary)',
              cursor: (!album || rightPageIndex + 1 >= album.pages.length) ? 'not-allowed' : 'pointer', transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (album && rightPageIndex + 1 < album.pages.length) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)') }}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)' }} />

        {/* Layout configurator */}
        <LayoutConfigurator
          config={spreadConfig}
          onChange={c => setSpreadConfig(prev => ({ ...prev, ...c }))}
          onApplyTemplate={handleApplyTemplate}
        />

        {/* Template overlay toggle */}
        <button
          onClick={() => setShowTemplateOverlay(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: showTemplateOverlay ? 'var(--accent-muted)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showTemplateOverlay ? 'rgba(200,132,46,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: showTemplateOverlay ? 'var(--accent)' : 'var(--text-muted)',
            borderRadius: '7px', padding: '5px 10px', fontSize: '11px',
            fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 150ms',
            fontWeight: 600, letterSpacing: '0.03em',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          {showTemplateOverlay ? 'Hide Guides' : 'Show Guides'}
        </button>

        <div style={{ flex: 1 }} />

        {/* Spread navigator thumbnails */}
        <SpreadNavigator />

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)' }} />

        {/* Zoom */}
        <ZoomControls zoom={zoom} onChange={setZoom} />
      </div>

      {/* ── SPREAD CANVAS AREA ── */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        padding: '32px',
      }}>

        {/* The Book */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          // Book shadow — deep, atmospheric, multiple layers
          filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.9)) drop-shadow(0 8px 24px rgba(0,0,0,0.7))',
        }}>

          {/* ── LEFT PAGE ── */}
          <div style={{
            position: 'relative',
            width: scaledPageW,
            height: scaledPageH,
            flexShrink: 0,
            overflow: 'hidden',
            // Subtle inner page shadow from spine side
            boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.3)',
          }}>
            <PageCanvas
              pageIndex={leftPageIndex}
              canvasW={canvasW} canvasH={canvasH}
              scale={zoom}
              activeTool={activeTool}
              editingId={editingId}
              setEditingId={setEditingId}
              onElementAdded={onElementAdded}
              side="left"
            />

            {showTemplateOverlay && (
              <TemplateOverlay
                template={spreadConfig.leftTemplate}
                canvasW={canvasW} canvasH={canvasH}
                scale={zoom} side="left"
              />
            )}

            <PageCurl side="left" />

            {/* Left page edge shadow */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '20px', height: '100%',
              background: 'linear-gradient(to left, rgba(0,0,0,0) 0%, transparent 100%)',
              pointerEvents: 'none', zIndex: 6,
            }} />
          </div>

          {/* ── SPINE ── */}
          <BookSpine height={scaledPageH} />

          {/* ── RIGHT PAGE ── */}
          {hasRightPage ? (
            <div style={{
              position: 'relative',
              width: scaledPageW,
              height: scaledPageH,
              flexShrink: 0,
              overflow: 'hidden',
              boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.3)',
            }}>
              <PageCanvas
                pageIndex={rightPageIndex}
                canvasW={canvasW} canvasH={canvasH}
                scale={zoom}
                activeTool={activeTool}
                editingId={editingId}
                setEditingId={setEditingId}
                onElementAdded={onElementAdded}
                side="right"
              />

              {showTemplateOverlay && (
                <TemplateOverlay
                  template={spreadConfig.rightTemplate}
                  canvasW={canvasW} canvasH={canvasH}
                  scale={zoom} side="right"
                />
              )}

              <PageCurl side="right" />

              {/* Right page edge shadow */}
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '20px', height: '100%',
                background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, transparent 100%)',
                pointerEvents: 'none', zIndex: 6,
              }} />
            </div>
          ) : (
            /* Blank right page (last odd-count page) */
            <div style={{
              width: scaledPageW, height: scaledPageH,
              background: '#1a1510',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.35)',
            }}>
              <div style={{
                textAlign: 'center',
                color: 'rgba(200,132,46,0.15)',
                fontFamily: 'var(--font-display)',
                fontSize: Math.round(zoom * 20),
                letterSpacing: '0.15em',
                userSelect: 'none',
              }}>
                —
              </div>
            </div>
          )}

          {/* ── TOP BOOK EDGE (depth) ── */}
          <div style={{
            position: 'absolute',
            top: -6, left: 0, right: 0, height: 6,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)',
            pointerEvents: 'none', zIndex: 12,
          }} />
          {/* ── BOTTOM BOOK EDGE (shadow) ── */}
          <div style={{
            position: 'absolute',
            bottom: -4, left: 4, right: 4, height: 4,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
            borderRadius: '0 0 4px 4px',
            pointerEvents: 'none', zIndex: 12,
          }} />
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        position: 'relative', zIndex: 20,
        height: '30px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '16px',
        background: 'rgba(8,8,9,0.65)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>

        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          ← → turn pages · T toggle guides · ⌘Z undo
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: '10px', color: 'rgba(200,132,46,0.4)', fontFamily: 'var(--font-mono)' }}>
          {spreadConfig.theme} · {spreadConfig.layoutStyle}
        </span>

        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.08)' }} />

        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
          {canvasW}×{canvasH} · {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  )
}
