'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

// ── Parse CSS linear-gradient to Konva gradient params ───────────────────────
function parseLinearGradient(css: string, w: number, h: number) {
  try {
    // Extract content between outer parens
    const inner = css.slice('linear-gradient('.length, css.lastIndexOf(')'))
    // Split on commas not inside parens (handles rgba(), hsl() etc.)
    const parts = inner.split(/,(?![^(]*\))/).map(s => s.trim())

    let angle = 135
    let stopIdx = 0
    if (/^\d+(\.\d+)?deg$/i.test(parts[0])) {
      angle = parseFloat(parts[0])
      stopIdx = 1
    } else if (/^to\s+/i.test(parts[0])) {
      // "to right", "to bottom left", etc. — approximate
      const dir = parts[0].toLowerCase()
      if (dir.includes('right')) angle = 90
      else if (dir.includes('left')) angle = 270
      else if (dir.includes('bottom')) angle = 180
      stopIdx = 1
    }

    const stopParts = parts.slice(stopIdx)
    const rad = ((angle - 90) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const len = Math.abs(w * cos) + Math.abs(h * sin)

    const colorStops: (number | string)[] = []
    stopParts.forEach((stop, i) => {
      // Each stop is "color [percentage]"
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
  } catch {
    return null
  }
}

// ── PhotoElement ──────────────────────────────────────────────────────────────
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
        fill="#2a1a1a"
        stroke="rgba(224,80,80,0.4)"
        strokeWidth={1}
        cornerRadius={4}
        onClick={onSelect} onTap={onSelect}
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
          const n = shapeRef.current
          if (!n) return
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

// ── TextElement ───────────────────────────────────────────────────────────────
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
          const n = shapeRef.current
          if (!n) return
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

// ── Context Menu ──────────────────────────────────────────────────────────────
type CtxMenu = { x: number; y: number; elementId: string } | null

function ContextMenu({ menu, onDelete, onFront, onBack, onClose }: {
  menu: CtxMenu
  onDelete: () => void
  onFront: () => void
  onBack: () => void
  onClose: () => void
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
      {[{ label: '↑ Bring to front', fn: onFront }, { label: '↓ Send to back', fn: onBack }].map(item => (
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

// ── Inline Text Editor ────────────────────────────────────────────────────────
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
      background: 'rgba(8,8,9,0.04)',
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

// ── Book spine / page chrome ──────────────────────────────────────────────────
function BookPageChrome({
  scaledW, scaledH, pageIndex, pageCount,
}: {
  scaledW: number; scaledH: number; pageIndex: number; pageCount: number
}) {
  return (
    <>
      {/* Top page "stack" — suggests physical pages behind */}
      {pageCount > 1 && pageIndex < pageCount - 1 && (
        <div style={{
          position: 'absolute',
          bottom: -5, left: 4, right: 4,
          height: scaledH,
          background: 'var(--bg-elevated)',
          borderRadius: '3px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          zIndex: -1,
        }} />
      )}
      {pageCount > 2 && pageIndex < pageCount - 2 && (
        <div style={{
          position: 'absolute',
          bottom: -9, left: 8, right: 8,
          height: scaledH,
          background: 'var(--bg-tertiary)',
          borderRadius: '3px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          zIndex: -2,
        }} />
      )}

      {/* Page number badge */}
      <div style={{
        position: 'absolute',
        bottom: 8, left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '999px',
        padding: '3px 12px',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.08em',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 5,
      }}>
        {pageIndex + 1} / {pageCount}
      </div>
    </>
  )
}

// ── Component props ───────────────────────────────────────────────────────────
type AlbumCanvasProps = {
  canvasW?: number
  canvasH?: number
  activeTool?: 'select' | 'text' | 'shape' | 'sticker'
  onElementAdded?: () => void
}

// ── Main AlbumCanvas ──────────────────────────────────────────────────────────
export default function AlbumCanvas({
  canvasW = 800,
  canvasH = 600,
  activeTool = 'select',
  onElementAdded,
}: AlbumCanvasProps) {
  const {
    album, currentPageIndex, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement, bringToFront, sendToBack,
  } = useAlbumStore()

  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [contextMenu, setContextMenu] = useState<CtxMenu>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const currentPage = album?.pages[currentPageIndex]
  const totalPages = album?.pages.length ?? 1

  // ── Responsive scale ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        const sw = (width - 80) / canvasW
        const sh = (height - 80) / canvasH
        setScale(Math.min(sw, sh, 1))
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [canvasW, canvasH])

  function commitEdit(newText: string) {
    if (!editingId) return
    updateElement(currentPageIndex, editingId, { text: newText })
    setEditingId(null)
  }

  function cancelEdit() { setEditingId(null) }

  // ── Stage click ───────────────────────────────────────────────────────
  function handleStageClick(e: any) {
    setContextMenu(null)
    if (editingId) return
    const isStage = e.target === e.target.getStage()
    if (!isStage) return
    setSelectedElementId(null)

    if (activeTool === 'text') {
      const pos = stageRef.current?.getPointerPosition()
      if (!pos) return
      const id = crypto.randomUUID()
      addElement(currentPageIndex, {
        id, type: 'text',
        text: 'Double-click to edit',
        x: pos.x / scale - 120,
        y: pos.y / scale - 12,
        width: 280, height: 36,
        fontSize: 20, fill: '#f4f0ea',
        fontFamily: 'Georgia, serif', fontStyle: 'italic',
        align: 'left', lineHeight: 1.4, rotation: 0,
      })
      setSelectedElementId(id)
      onElementAdded?.()
    }
  }

  // ── Drop handler ──────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
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
    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: isFrame ? 'frame' : 'image',
      photoId: isFrame ? (photoId || undefined) : photoId || undefined,
      frameId: isFrame ? (frameId || undefined) : undefined,
      url,
      x: isFrame ? 0 : Math.round(pos.x / scale - (pW * sc) / 2),
      y: isFrame ? 0 : Math.round(pos.y / scale - (pH * sc) / 2),
      width: isFrame ? canvasW : Math.round(pW * sc),
      height: isFrame ? canvasH : Math.round(pH * sc),
      rotation: 0,
    })
  }

  // ── Context menu ──────────────────────────────────────────────────────
  function handleContextMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = stageRef.current?.container()?.getBoundingClientRect()
    const pos = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setContextMenu({ x: rect.left + pos.x * scale, y: rect.top + pos.y * scale, elementId })
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!currentPage) return null

  const scaledW = Math.round(canvasW * scale)
  const scaledH = Math.round(canvasH * scale)

  const editingElement = editingId
    ? currentPage.elements.find(el => el.id === editingId) ?? null
    : null

  // ── Background — support solid hex or CSS linear-gradient ─────────────
  const bg = currentPage.background || '#0f0f0f'
  const gradient = bg.startsWith('linear-gradient')
    ? parseLinearGradient(bg, canvasW, canvasH)
    : null

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px', overflow: 'hidden', position: 'relative',
        // Dot grid background — feels like a design canvas
        backgroundImage: [
          'radial-gradient(circle, rgba(200,132,46,0.12) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '22px 22px',
        cursor: activeTool === 'text' ? 'crosshair' : 'default',
      }}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* ── Page / book chrome wrapper ─────────────────────────────── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>

        <BookPageChrome
          scaledW={scaledW}
          scaledH={scaledH}
          pageIndex={currentPageIndex}
          pageCount={totalPages}
        />

        {/* ── The canvas itself ──────────────────────────────────────── */}
        <div
          id="album-canvas-stage"
          style={{
            width: scaledW, height: scaledH,
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative',
            // Layered shadow — first ring is the accent border, rest are depth shadows
            boxShadow: [
              '0 0 0 1px rgba(200,132,46,0.20)',
              '0 4px 20px rgba(0,0,0,0.50)',
              '0 16px 56px rgba(0,0,0,0.40)',
              '0 32px 80px rgba(0,0,0,0.28)',
            ].join(', '),
          }}
        >
          <Stage
            ref={stageRef}
            width={canvasW} height={canvasH}
            scaleX={scale} scaleY={scale}
            onClick={handleStageClick}
          >
            <Layer>
              {/* ── Background — solid or gradient ── */}
              <Rect
                x={0} y={0} width={canvasW} height={canvasH}
                fill={gradient ? undefined : bg}
                fillLinearGradientStartPoint={gradient?.startPoint}
                fillLinearGradientEndPoint={gradient?.endPoint}
                fillLinearGradientColorStops={gradient?.colorStops as (string | number)[] | undefined}
              />

              {/* ── Elements ── */}
              {currentPage.elements.map(el => {
                const shared = {
                  element: el,
                  isSelected: selectedElementId === el.id,
                  onSelect: () => {
                    setSelectedElementId(el.id)
                  },
                  onUpdate: (u: Partial<PageElement>) => updateElement(currentPageIndex, el.id, u),
                }
                if (el.type === 'image' || el.type === 'frame') {
                  return <PhotoElement key={el.id} {...shared} />
                }
                return (
                  <TextElement
                    key={el.id}
                    {...shared}
                    isBeingEdited={editingId === el.id}
                    onStartEdit={() => { setSelectedElementId(el.id); setEditingId(el.id) }}
                  />
                )
              })}

              {/* ── Invisible hit rects for context menu ── */}
              {currentPage.elements.map(el => (
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
        </div>

        {/* ── Inline text editor overlay ────────────────────────────── */}
        {editingElement?.type === 'text' && (
          <InlineTextEditor
            element={editingElement}
            scale={scale}
            stageRef={stageRef}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        )}

        {/* ── Zoom badge ─────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: '10px', color: 'rgba(200,132,46,0.5)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {Math.round(scale * 100)}%
        </div>

        {/* ── Active tool hints ──────────────────────────────────────── */}
        {activeTool === 'text' && !editingId && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(200,132,46,0.35)',
            borderRadius: '6px', padding: '5px 16px',
            fontSize: '11px', color: 'rgba(200,132,46,0.9)',
            fontFamily: 'var(--font-body)', pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            Click anywhere on the canvas to add a text box
          </div>
        )}

        {editingId && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(200,132,46,0.35)',
            borderRadius: '6px', padding: '5px 16px',
            fontSize: '11px', color: 'rgba(200,132,46,0.9)',
            fontFamily: 'var(--font-body)', pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            ↵ Confirm · Esc Cancel · Shift+↵ New line
          </div>
        )}
      </div>

      {/* ── Context menu (portal-like, fixed position) ─────────────── */}
      <ContextMenu
        menu={contextMenu}
        onClose={closeContextMenu}
        onDelete={() => contextMenu && deleteElement(currentPageIndex, contextMenu.elementId)}
        onFront={() => contextMenu && bringToFront(currentPageIndex, contextMenu.elementId)}
        onBack={() => contextMenu && sendToBack(currentPageIndex, contextMenu.elementId)}
      />
    </div>
  )
}
