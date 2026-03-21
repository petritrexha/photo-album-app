'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

// ── Constants (defaults — overridden by props) ────────────────────────────────
const DEFAULT_W = 800
const DEFAULT_H = 600

const FONTS = [
  { label: 'Cormorant',  value: 'Cormorant Garamond, serif' },
  { label: 'Playfair',   value: 'Playfair Display, serif' },
  { label: 'DM Sans',    value: 'DM Sans, sans-serif' },
  { label: 'Georgia',    value: 'Georgia, serif' },
  { label: 'Helvetica',  value: 'Helvetica Neue, sans-serif' },
  { label: 'Courier',    value: 'Courier New, monospace' },
]

// ── PhotoElement ──────────────────────────────────────────────────────────────
function PhotoElement({ element, isSelected, onSelect, onUpdate, isEditing }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (u: Partial<PageElement>) => void
  isEditing?: boolean
}) {
  const [image] = useImage(element.url || '', 'anonymous')
  const shapeRef = useRef<any>(null)
  const trRef    = useRef<any>(null)

  useEffect(() => {
    if (isSelected && !isEditing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, isEditing])

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
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current
          onUpdate({
            x: n.x(), y: n.y(),
            width:  Math.max(20, n.width()  * n.scaleX()),
            height: Math.max(20, n.height() * n.scaleY()),
            rotation: n.rotation(),
          })
          n.scaleX(1); n.scaleY(1)
        }}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          borderStroke="rgba(212,140,58,0.9)"
          borderStrokeWidth={1.5}
          borderDash={[]}
          anchorFill="#1c1c21"
          anchorStroke="rgba(212,140,58,0.9)"
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
  const trRef    = useRef<any>(null)

  useEffect(() => {
    if (isSelected && !isBeingEdited && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected, isBeingEdited])

  const fontStyle = [
    element.fontStyle?.includes('bold')   ? 'bold'   : '',
    element.fontStyle?.includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal'

  return (
    <>
      <Text
        ref={shapeRef}
        text={isBeingEdited ? '' : (element.text || 'Double-click to edit')}
        x={element.x} y={element.y}
        width={element.width || 280}
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
          onUpdate({ x: n.x(), y: n.y(), width: n.width() * n.scaleX(), rotation: n.rotation() })
          n.scaleX(1); n.scaleY(1)
        }}
      />
      {isSelected && !isBeingEdited && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
          borderStroke="rgba(212,140,58,0.9)"
          borderStrokeWidth={1.5}
          anchorFill="#1c1c21"
          anchorStroke="rgba(212,140,58,0.9)"
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
    const h = () => onClose()
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [menu, onClose])

  if (!menu) return null

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '8px 14px',
    background: 'none', border: 'none',
    color: 'var(--text-primary)', fontSize: '12px',
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    textAlign: 'left', transition: 'background var(--transition-fast)',
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: menu.x, top: menu.y,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000, overflow: 'hidden', minWidth: '160px',
      }}
    >
      {[
        { label: '↑ Bring to front', action: onFront },
        { label: '↓ Send to back',   action: onBack },
      ].map(item => (
        <button key={item.label} style={itemStyle}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          onClick={() => { item.action(); onClose() }}
        >{item.label}</button>
      ))}
      <div style={{ height: '1px', background: 'var(--border)' }} />
      <button
        style={{ ...itemStyle, color: 'var(--danger)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        onClick={() => { onDelete(); onClose() }}
      >🗑 Delete</button>
    </div>
  )
}

// ── Inline text editing textarea ──────────────────────────────────────────────
function InlineTextEditor({ element, scale, stageRef, containerRef, onCommit, onCancel }: {
  element: PageElement
  scale: number
  stageRef: React.RefObject<any>
  containerRef: React.RefObject<HTMLDivElement>
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!taRef.current) return
    taRef.current.focus()
    taRef.current.select()
    // Auto-resize
    taRef.current.style.height = 'auto'
    taRef.current.style.height = taRef.current.scrollHeight + 'px'
  }, [])

  // Calculate position relative to containerRef
  const getStyle = (): React.CSSProperties => {
    if (!stageRef.current || !containerRef.current) return {}
    const stageEl = stageRef.current.container() as HTMLElement
    const stageRect = stageEl.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    const left = element.x * scale + (stageRect.left - containerRect.left)
    const top  = element.y * scale + (stageRect.top  - containerRect.top)
    const width = Math.max((element.width || 200) * scale, 80)
    const fontSize = (element.fontSize || 18) * scale
    const fontStyleStr = element.fontStyle || ''

    return {
      position: 'absolute',
      left:  Math.round(left),
      top:   Math.round(top),
      width: Math.round(width),
      minHeight: Math.round(fontSize * (element.lineHeight || 1.4) + 8),
      fontSize: Math.round(fontSize),
      fontFamily: element.fontFamily || 'Georgia, serif',
      fontWeight: fontStyleStr.includes('bold') ? 'bold' : 'normal',
      fontStyle: fontStyleStr.includes('italic') ? 'italic' : 'normal',
      textDecoration: fontStyleStr.includes('underline') ? 'underline' : 'none',
      color: element.fill || '#f4f0ea',
      lineHeight: String(element.lineHeight || 1.4),
      textAlign: (element.align as any) || 'left',
      background: 'rgba(0,0,0,0.01)',
      border: '1.5px dashed rgba(212,140,58,0.75)',
      borderRadius: '3px',
      padding: '2px 4px',
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      zIndex: 50,
      boxSizing: 'border-box',
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      transformOrigin: 'top left',
      caretColor: '#d48c3a',
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { onCancel(); return }
    // Shift+Enter = newline; Enter alone = commit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCommit(taRef.current?.value ?? element.text ?? '')
    }
    // Auto-resize
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = taRef.current.scrollHeight + 'px'
    }
  }

  return (
    <textarea
      ref={taRef}
      defaultValue={element.text || ''}
      style={getStyle()}
      onKeyDown={handleKeyDown}
      onBlur={e => onCommit(e.target.value)}
      onChange={e => {
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
      }}
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
  canvasW = DEFAULT_W,
  canvasH = DEFAULT_H,
  activeTool = 'select',
  onElementAdded,
}: AlbumCanvasProps) {
  const {
    album, currentPageIndex, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement, bringToFront, sendToBack,
  } = useAlbumStore()

  const stageRef     = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]             = useState(1)
  const [contextMenu, setContextMenu] = useState<CtxMenu>(null)
  const [editingId, setEditingId]     = useState<string | null>(null)

  const currentPage = album?.pages[currentPageIndex]

  // ── Responsive scale ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        const sw = width  / canvasW
        const sh = height / canvasH
        setScale(Math.min(sw, sh, 1))
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [canvasW, canvasH])

  // ── Commit inline text edit ─────────────────────────────────────
  function commitEdit(newText: string) {
    if (!editingId) return
    updateElement(currentPageIndex, editingId, { text: newText })
    setEditingId(null)
  }
  function cancelEdit() { setEditingId(null) }

  // ── Stage click — handle tool actions ───────────────────────────
  function handleStageClick(e: any) {
    // Close context menu
    setContextMenu(null)

    const isStage = e.target === e.target.getStage()
    if (editingId) return // let the textarea handle things

    if (isStage) {
      setSelectedElementId(null)

      if (activeTool === 'text') {
        const pos = stageRef.current?.getPointerPosition()
        if (!pos) return
        const id = crypto.randomUUID()
        addElement(currentPageIndex, {
          id, type: 'text',
          text: 'Double-click to edit',
          x: pos.x / scale - 100,
          y: pos.y / scale - 15,
          width: 280, height: 36,
          fontSize: 20,
          fill: '#f4f0ea',
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          align: 'left', lineHeight: 1.4, rotation: 0,
        })
        setSelectedElementId(id)
        onElementAdded?.()
      }
    }
  }

  // ── Drop ────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const type    = e.dataTransfer.getData('elementType') || 'image'
    const photoId = e.dataTransfer.getData('photoId')
    const frameId = e.dataTransfer.getData('frameId')
    const url     = e.dataTransfer.getData('photoUrl')
    const pW      = parseInt(e.dataTransfer.getData('photoWidth'))  || canvasW
    const pH      = parseInt(e.dataTransfer.getData('photoHeight')) || canvasH

    if (!stageRef.current) return
    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition() || { x: canvasW / 2, y: canvasH / 2 }

    const isFrame = type === 'frame'
    const maxW = isFrame ? canvasW : Math.min(canvasW * 0.7, 400)
    const sc = Math.min(maxW / pW, maxW / pH, 1)

    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: isFrame ? 'frame' : 'image',
      photoId: !isFrame ? (photoId || undefined) : undefined,
      frameId: isFrame  ? (frameId || undefined) : undefined,
      url,
      x: isFrame ? 0 : pos.x / scale - (pW * sc) / 2,
      y: isFrame ? 0 : pos.y / scale - (pH * sc) / 2,
      width:  isFrame ? canvasW : Math.round(pW * sc),
      height: isFrame ? canvasH : Math.round(pH * sc),
      rotation: 0,
    })
  }

  // ── Context menu ─────────────────────────────────────────────────
  function handleContextMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const pos  = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setContextMenu({
      x: rect.left + pos.x * scale,
      y: rect.top  + pos.y * scale,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Canvas Stage ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px',
          overflow: 'hidden',
          position: 'relative',
          // Subtle dot grid background for the canvas area
          backgroundImage: `radial-gradient(circle, rgba(212,140,58,0.08) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {/* ── Canvas frame with premium shadow ── */}
        <div
          id="album-canvas-stage"
          style={{
            width: scaledW,
            height: scaledH,
            boxShadow: [
              '0 0 0 1px rgba(212,140,58,0.15)',
              '0 8px 32px rgba(0,0,0,0.6)',
              '0 32px 80px rgba(0,0,0,0.4)',
              '0 2px 8px rgba(0,0,0,0.3)',
            ].join(', '),
            borderRadius: '2px',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: activeTool === 'text' ? 'text' : 'default',
          }}
        >
          <Stage
            ref={stageRef}
            width={canvasW}
            height={canvasH}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
          >
            <Layer>
              {/* Background */}
              <Rect
                x={0} y={0}
                width={canvasW} height={canvasH}
                fill={
                  currentPage.background?.startsWith('linear')
                    ? '#1a1a1a'
                    : (currentPage.background || '#0f0f0f')
                }
              />

              {/* Elements */}
              {currentPage.elements.map(el => {
                const shared = {
                  element: el,
                  isSelected: selectedElementId === el.id,
                  onSelect: () => {
                    if (editingId && editingId !== el.id) {
                      const ta = document.querySelector('textarea[data-editing]') as HTMLTextAreaElement | null
                      if (ta) commitEdit(ta.value)
                    }
                    setSelectedElementId(el.id)
                  },
                  onUpdate: (u: Partial<PageElement>) => updateElement(currentPageIndex, el.id, u),
                }
                if (el.type === 'image' || el.type === 'frame') {
                  return <PhotoElement key={el.id} {...shared} isEditing={editingId !== null} />
                }
                return (
                  <TextElement
                    key={el.id}
                    {...shared}
                    isBeingEdited={editingId === el.id}
                    onStartEdit={() => {
                      setSelectedElementId(el.id)
                      setEditingId(el.id)
                    }}
                  />
                )
              })}

              {/* Invisible hit targets for context menu */}
              {currentPage.elements.map(el => (
                <Rect
                  key={`ctx-${el.id}`}
                  x={el.x} y={el.y}
                  width={el.width} height={el.height}
                  rotation={el.rotation}
                  fill="transparent"
                  onContextMenu={e => handleContextMenu(e, el.id)}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* ── Inline text textarea overlay ── */}
        {editingElement && editingElement.type === 'text' && (
          <InlineTextEditor
            element={editingElement}
            scale={scale}
            stageRef={stageRef}
            containerRef={containerRef}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        )}

        {/* ── Zoom label ── */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '14px',
          fontSize: '10px',
          color: 'rgba(212,140,58,0.4)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {Math.round(scale * 100)}%
        </div>

        {/* ── Editing hint ── */}
        {editingId && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(212,140,58,0.3)',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '11px',
            color: 'rgba(212,140,58,0.8)',
            fontFamily: 'var(--font-body)',
            pointerEvents: 'none',
          }}>
            Enter to confirm · Esc to cancel · Shift+Enter for new line
          </div>
        )}
      </div>

      {/* ── Context Menu ── */}
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
