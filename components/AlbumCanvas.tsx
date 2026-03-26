'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

// ── Parse CSS linear-gradient → Konva gradient ───────────────────────────────
function parseLinearGradient(css: string, w: number, h: number) {
  try {
    const inner = css.slice('linear-gradient('.length, css.lastIndexOf(')'))
    const parts = inner.split(/,(?![^(]*\))/).map(s => s.trim())
    let angle = 135
    let stopIdx = 0
    if (/^\d+deg$/.test(parts[0])) {
      angle = parseInt(parts[0])
      stopIdx = 1
    }
    const stopParts = parts.slice(stopIdx)
    const rad = ((angle - 90) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const len = Math.abs(w * cos) + Math.abs(h * sin)
    const colorStops: (number | string)[] = []
    stopParts.forEach((stop, i) => {
      const color = stop.split(' ')[0].trim()
      colorStops.push(i / Math.max(stopParts.length - 1, 1), color)
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

  return (
    <>
      {status === 'failed' ? (
        <Rect
          x={element.x} y={element.y}
          width={element.width} height={element.height}
          fill="#2a1a1a"
          stroke="rgba(224,80,80,0.4)"
          strokeWidth={1}
          cornerRadius={4}
          onClick={onSelect}
          onTap={onSelect}
        />
      ) : (
        <KonvaImage
          ref={shapeRef}
          image={image}
          x={element.x} y={element.y}
          width={element.width} height={element.height}
          rotation={element.rotation}
          opacity={element.opacity ?? 1}
          draggable
          onClick={onSelect}
          onTap={onSelect}
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
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          borderStroke="rgba(200,132,46,0.9)"
          borderStrokeWidth={1.5}
          anchorFill="#1c1c21"
          anchorStroke="rgba(200,132,46,0.9)"
          anchorStrokeWidth={1.5}
          anchorSize={9}
          anchorCornerRadius={3}
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
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onStartEdit}
        onDblTap={onStartEdit}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current
          if (!n) return
          onUpdate({
            x: n.x(), y: n.y(),
            width: Math.max(40, n.width() * n.scaleX()),
            rotation: n.rotation(),
          })
          // ── FIX: always reset scale so text doesn't drift ──
          n.scaleX(1); n.scaleY(1)
          n.getLayer()?.batchDraw()
        }}
      />
      {isSelected && !isBeingEdited && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
          borderStroke="rgba(200,132,46,0.9)"
          borderStrokeWidth={1.5}
          anchorFill="#1c1c21"
          anchorStroke="rgba(200,132,46,0.9)"
          anchorStrokeWidth={1.5}
          anchorSize={9}
          anchorCornerRadius={3}
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
    // ── FIX: single stable listener, removed on close ──
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-ctx-menu]')) onClose()
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
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    textAlign: 'left',
  }

  return (
    <div
      data-ctx-menu
      style={{
        position: 'fixed', left: menu.x, top: menu.y,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
        zIndex: 1000, overflow: 'hidden', minWidth: '160px',
      }}
    >
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
      <button
        style={{ ...base, color: 'var(--danger)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        onClick={() => { onDelete(); onClose() }}
      >🗑 Delete</button>
    </div>
  )
}

// ── Inline Text Editor ────────────────────────────────────────────────────────
// Uses position:fixed relative to viewport for reliable placement
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
    // Place cursor at end
    ta.setSelectionRange(ta.value.length, ta.value.length)
    autoResize(ta)
  }, [])

  function autoResize(ta: HTMLTextAreaElement) {
    ta.style.height = 'auto'
    ta.style.height = Math.max(ta.scrollHeight, (element.fontSize || 18) * scale * 1.4 + 8) + 'px'
  }

  // ── FIX: use fixed positioning with viewport coordinates ──
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
      background: 'rgba(8,8,9,0.015)',
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

// ── Props ─────────────────────────────────────────────────────────────────────
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

  // ── Responsive scale ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        const sw = (width - 56) / canvasW
        const sh = (height - 56) / canvasH
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

  // ── Stage click ──────────────────────────────────────────────────
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

  // ── Drop ──────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const type = e.dataTransfer.getData('elementType') || 'image'
    const photoId = e.dataTransfer.getData('photoId')
    const frameId = e.dataTransfer.getData('frameId')
    const url = e.dataTransfer.getData('photoUrl')
    const pW = parseInt(e.dataTransfer.getData('photoWidth')) || canvasW
    const pH = parseInt(e.dataTransfer.getData('photoHeight')) || canvasH
    if (!url || !stageRef.current) return
    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition() || { x: canvasW / 2, y: canvasH / 2 }
    const isFrame = type === 'frame'
    const maxW = isFrame ? canvasW : Math.min(canvasW * 0.7, 420)
    const sc = Math.min(maxW / pW, maxW / pH, 1)
    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: isFrame ? 'frame' : 'image',
      photoId: isFrame ? (photoId || undefined) : undefined,
      frameId: isFrame ? (frameId || undefined) : undefined,
      url,
      x: isFrame ? 0 : Math.round(pos.x / scale - (pW * sc) / 2),
      y: isFrame ? 0 : Math.round(pos.y / scale - (pH * sc) / 2),
      width: isFrame ? canvasW : Math.round(pW * sc),
      height: isFrame ? canvasH : Math.round(pH * sc),
      rotation: 0,
    })
  }

  // ── Context menu ──────────────────────────────────────────────────
  function handleContextMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = stageRef.current?.container()?.getBoundingClientRect()
    const pos = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setContextMenu({
      x: rect.left + pos.x * scale,
      y: rect.top + pos.y * scale,
      elementId,
    })
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!currentPage) return null

  const scaledW = Math.round(canvasW * scale)
  const scaledH = Math.round(canvasH * scale)

  const editingElement = editingId
    ? currentPage.elements.find(el => el.id === editingId) ?? null
    : null

  // ── Background: parse gradient or use solid color ─────────────────
  const bg = currentPage.background || '#0f0f0f'
  const gradient = bg.startsWith('linear-gradient') ? parseLinearGradient(bg, canvasW, canvasH) : null

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '28px', overflow: 'hidden', position: 'relative',
        backgroundImage: 'radial-gradient(circle, rgba(200,132,46,0.07) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        cursor: activeTool === 'text' ? 'text' : 'default',
      }}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {/* Canvas frame */}
      <div
        id="album-canvas-stage"
        style={{
          width: scaledW, height: scaledH, flexShrink: 0, borderRadius: '2px',
          overflow: 'hidden',
          boxShadow: [
            '0 0 0 1px rgba(200,132,46,0.15)',
            '0 8px 32px rgba(0,0,0,0.65)',
            '0 32px 80px rgba(0,0,0,0.45)',
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
            {/* ── Background — gradient or solid ── */}
            <Rect
              x={0} y={0} width={canvasW} height={canvasH}
              fill={gradient ? undefined : bg}
              fillLinearGradientStartPoint={gradient?.startPoint}
              fillLinearGradientEndPoint={gradient?.endPoint}
              fillLinearGradientColorStops={gradient?.colorStops as any}
            />

            {/* ── Elements ── */}
            {currentPage.elements.map(el => {
              const shared = {
                element: el,
                isSelected: selectedElementId === el.id,
                onSelect: () => {
                  if (editingId && editingId !== el.id) commitEdit(
                    (document.querySelector('textarea[data-inlineedit]') as HTMLTextAreaElement)?.value ?? ''
                  )
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

            {/* Context menu hit targets */}
            {currentPage.elements.map(el => (
              <Rect
                key={`ctx-${el.id}`}
                x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation}
                fill="transparent"
                onContextMenu={e => handleContextMenu(e, el.id)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Inline text textarea overlay (fixed positioning = no scroll issues) */}
      {editingElement?.type === 'text' && (
        <InlineTextEditor
          element={editingElement}
          scale={scale}
          stageRef={stageRef}
          onCommit={commitEdit}
          onCancel={cancelEdit}
        />
      )}

      {/* Zoom % */}
      <div style={{
        position: 'absolute', bottom: '10px', right: '14px',
        fontSize: '10px', color: 'rgba(200,132,46,0.4)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
        userSelect: 'none', pointerEvents: 'none',
      }}>
        {Math.round(scale * 100)}%
      </div>

      {/* Active tool hint */}
      {activeTool === 'text' && !editingId && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(200,132,46,0.3)',
          borderRadius: '6px', padding: '4px 14px',
          fontSize: '11px', color: 'rgba(200,132,46,0.85)',
          fontFamily: 'var(--font-body)', pointerEvents: 'none',
        }}>
          Click anywhere to add a text box
        </div>
      )}

      {editingId && (
        <div style={{
          position: 'absolute', bottom: '10px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(200,132,46,0.3)',
          borderRadius: '6px', padding: '4px 14px',
          fontSize: '11px', color: 'rgba(200,132,46,0.85)',
          fontFamily: 'var(--font-body)', pointerEvents: 'none',
        }}>
          Enter to confirm · Esc to cancel · Shift+Enter for new line
        </div>
      )}

      {/* Context Menu */}
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
