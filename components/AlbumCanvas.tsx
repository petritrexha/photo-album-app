'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

const CANVAS_WIDTH  = 800
const CANVAS_HEIGHT = 600

const FONTS = [
  { label: 'Cormorant',  value: 'Cormorant Garamond, serif' },
  { label: 'Playfair',   value: 'Playfair Display, serif' },
  { label: 'DM Sans',    value: 'DM Sans, sans-serif' },
  { label: 'Georgia',    value: 'Georgia, serif' },
  { label: 'Helvetica',  value: 'Helvetica Neue, sans-serif' },
  { label: 'Courier',    value: 'Courier New, monospace' },
]

// ── PhotoElement ───────────────────────────────────────────────────
function PhotoElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (u: Partial<PageElement>) => void
}) {
  const [image] = useImage(element.url || '', 'anonymous')
  const shapeRef = useRef<any>(null)
  const trRef    = useRef<any>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

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
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          borderStroke="var(--accent, #d48c3a)"
          anchorFill="var(--bg-surface, #1c1c21)"
          anchorStroke="var(--accent, #d48c3a)"
          anchorStrokeWidth={1.5}
          anchorSize={9}
          anchorCornerRadius={2}
          boundBoxFunc={(old, n) => (n.width < 20 || n.height < 20 ? old : n)}
        />
      )}
    </>
  )
}

// ── TextElement ────────────────────────────────────────────────────
function TextElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (u: Partial<PageElement>) => void
}) {
  const shapeRef = useRef<any>(null)
  const trRef    = useRef<any>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  const fontStyle = [
    element.fontStyle?.includes('bold')   ? 'bold'   : '',
    element.fontStyle?.includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal'

  return (
    <>
      <Text
        ref={shapeRef}
        text={element.text || 'Double-click to edit'}
        x={element.x} y={element.y}
        width={element.width || 280}
        fontSize={element.fontSize || 18}
        fill={element.fill || '#f4f0ea'}
        fontFamily={element.fontFamily || 'Georgia, serif'}
        fontStyle={fontStyle}
        textDecoration={element.fontStyle?.includes('underline') ? 'underline' : ''}
        align={element.align || 'left'}
        lineHeight={element.lineHeight || 1.4}
        opacity={element.opacity ?? 1}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={e => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const n = shapeRef.current
          onUpdate({ x: n.x(), y: n.y(), width: n.width() * n.scaleX(), rotation: n.rotation() })
          n.scaleX(1); n.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
          borderStroke="var(--accent, #d48c3a)"
          anchorFill="var(--bg-surface, #1c1c21)"
          anchorStroke="var(--accent, #d48c3a)"
          anchorStrokeWidth={1.5}
          anchorSize={9}
          anchorCornerRadius={2}
        />
      )}
    </>
  )
}

// ── Context Menu ───────────────────────────────────────────────────
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    textAlign: 'left',
    transition: 'background var(--transition-fast)',
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        overflow: 'hidden',
        minWidth: '160px',
      }}
    >
      {[
        { label: '↑ Bring to front', action: onFront },
        { label: '↓ Send to back',   action: onBack },
      ].map(item => (
        <button
          key={item.label}
          style={itemStyle}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          onClick={() => { item.action(); onClose() }}
        >
          {item.label}
        </button>
      ))}
      <div style={{ height: '1px', background: 'var(--border)' }} />
      <button
        style={{ ...itemStyle, color: 'var(--danger)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-muted)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        onClick={() => { onDelete(); onClose() }}
      >
        🗑 Delete
      </button>
    </div>
  )
}

// ── Main AlbumCanvas ────────────────────────────────────────────────
export default function AlbumCanvas() {
  const {
    album, currentPageIndex, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement, bringToFront, sendToBack,
  } = useAlbumStore()

  const stageRef     = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale]         = useState(1)
  const [contextMenu, setContextMenu] = useState<CtxMenu>(null)

  const currentPage = album?.pages[currentPageIndex]

  // ── Responsive scale ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      const h = entries[0].contentRect.height
      if (w > 0 && h > 0) {
        const scaleW = w / CANVAS_WIDTH
        const scaleH = h / CANVAS_HEIGHT
        setScale(Math.min(scaleW, scaleH, 1))
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Drop ──────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const type    = e.dataTransfer.getData('elementType') || 'image'
    const photoId = e.dataTransfer.getData('photoId')
    const frameId = e.dataTransfer.getData('frameId')
    const url     = e.dataTransfer.getData('photoUrl')
    const pW      = parseInt(e.dataTransfer.getData('photoWidth'))  || 800
    const pH      = parseInt(e.dataTransfer.getData('photoHeight')) || 600

    if (!stageRef.current) return
    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition() || { x: 200, y: 150 }

    const isFrame = type === 'frame'
    const maxW = isFrame ? CANVAS_WIDTH : 350
    const sc = Math.min(maxW / pW, maxW / pH, 1)

    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: isFrame ? 'frame' : 'image',
      photoId: !isFrame ? (photoId || undefined) : undefined,
      frameId: isFrame  ? (frameId || undefined) : undefined,
      url,
      x: isFrame ? 0 : pos.x / scale - (pW * sc) / 2,
      y: isFrame ? 0 : pos.y / scale - (pH * sc) / 2,
      width:  isFrame ? CANVAS_WIDTH : Math.round(pW * sc),
      height: isFrame ? CANVAS_HEIGHT : Math.round(pH * sc),
      rotation: 0,
    })
  }

  // ── Context menu ──────────────────────────────────────────────
  function handleContextMenu(e: any, elementId: string) {
    e.evt.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const pos  = stageRef.current?.getPointerPosition()
    if (!rect || !pos) return
    setSelectedElementId(elementId)
    setContextMenu({ x: rect.left + pos.x * scale, y: rect.top + pos.y * scale, elementId })
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!currentPage) return null

  const selectedEl = currentPage.elements.find(e => e.id === selectedElementId)
  const isText     = selectedEl?.type === 'text'
  const isImage    = selectedEl?.type === 'image' || selectedEl?.type === 'frame'

  // ── Text style toggle ─────────────────────────────────────────
  function toggleStyle(style: string) {
    if (!selectedEl || !selectedElementId) return
    const cur  = selectedEl.fontStyle || ''
    const has  = cur.includes(style)
    const next = has ? cur.replace(style, '').trim() : `${cur} ${style}`.trim()
    updateElement(currentPageIndex, selectedElementId, { fontStyle: next })
  }

  // ── Toolbar base style ────────────────────────────────────────
  const tBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '28px',
  padding: '0 8px',
  background: 'var(--bg-tertiary)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  whiteSpace: 'nowrap' as const,
}
const tBtnActive: React.CSSProperties = {
  ...tBtn,
  background: 'var(--accent-muted)',
  color: 'var(--accent)',
  borderColor: 'transparent',
}
  const tSep: React.CSSProperties = {
    width: '1px',
    height: '20px',
    background: 'var(--border)',
    flexShrink: 0,
  }

  const scaledW = Math.round(CANVAS_WIDTH  * scale)
  const scaledH = Math.round(CANVAS_HEIGHT * scale)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Canvas Toolbar ── */}
      <div className="canvas-toolbar" style={{ overflowX: 'auto' }}>

        {/* Global controls (always shown) */}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '6px', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
          {Math.round(scale * 100)}%
        </span>
        <div style={tSep} />

        {/* Text-element controls */}
        {isText && selectedEl && selectedElementId && (
          <>
            {/* Text input */}
            <input
              value={selectedEl.text || ''}
              onChange={e => updateElement(currentPageIndex, selectedElementId, { text: e.target.value })}
              placeholder="Text…"
              style={{
                ...tBtn,
                width: '140px',
                border: '1px solid var(--border-focus)',
                color: 'var(--text-primary)',
                background: 'var(--bg-tertiary)',
                outline: 'none',
                paddingLeft: '8px',
                paddingRight: '8px',
              }}
            />

            {/* Font family */}
            <select
              value={selectedEl.fontFamily || 'Georgia, serif'}
              onChange={e => updateElement(currentPageIndex, selectedElementId, { fontFamily: e.target.value })}
              style={{ ...tBtn, cursor: 'pointer', paddingRight: '4px' }}
            >
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            {/* Font size */}
            <input
              type="number"
              value={selectedEl.fontSize || 18}
              min={6} max={160}
              onChange={e => updateElement(currentPageIndex, selectedElementId, { fontSize: parseInt(e.target.value) || 18 })}
              style={{ ...tBtn, width: '52px', outline: 'none' }}
            />

            {/* Color */}
            <input
              type="color"
              value={selectedEl.fill?.startsWith('#') ? selectedEl.fill : '#f4f0ea'}
              onChange={e => updateElement(currentPageIndex, selectedElementId, { fill: e.target.value })}
              style={{ width: '26px', height: '26px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '2px', background: 'var(--bg-tertiary)' }}
              title="Text color"
            />

            <div style={tSep} />

            {/* Bold / Italic / Underline */}
            {[
              { style: 'bold',      label: 'B', css: { fontWeight: 700 } },
              { style: 'italic',    label: 'I', css: { fontStyle: 'italic' } },
              { style: 'underline', label: 'U', css: { textDecoration: 'underline' } },
            ].map(s => (
              <button
                key={s.style}
                onClick={() => toggleStyle(s.style)}
                style={{
                  ...(selectedEl.fontStyle?.includes(s.style) ? tBtnActive : tBtn),
                  ...s.css,
                  width: '28px',
                  padding: 0,
                }}
              >
                {s.label}
              </button>
            ))}

            <div style={tSep} />

            {/* Alignment */}
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => updateElement(currentPageIndex, selectedElementId, { align: a })}
                style={(selectedEl.align || 'left') === a ? tBtnActive : tBtn}
                title={`Align ${a}`}
              >
                {a === 'left' ? '⫷' : a === 'center' ? '≡' : '⫸'}
              </button>
            ))}

            {/* Line height */}
            <select
              value={selectedEl.lineHeight || 1.4}
              onChange={e => updateElement(currentPageIndex, selectedElementId, { lineHeight: parseFloat(e.target.value) })}
              style={{ ...tBtn, cursor: 'pointer' }}
              title="Line height"
            >
              {[1, 1.2, 1.4, 1.6, 1.8, 2].map(v => (
                <option key={v} value={v}>↕ {v}</option>
              ))}
            </select>

            <div style={tSep} />
          </>
        )}

        {/* Image element controls */}
        {isImage && selectedElementId && (
          <>
            <button
              onClick={() => bringToFront(currentPageIndex, selectedElementId)}
              style={tBtn}
              title="Bring to front"
            >
              ↑ Front
            </button>
            <button
              onClick={() => sendToBack(currentPageIndex, selectedElementId)}
              style={tBtn}
              title="Send to back"
            >
              ↓ Back
            </button>
            <div style={tSep} />
          </>
        )}

        {/* Delete — shown when anything selected */}
        {selectedElementId && (
          <button
            onClick={() => deleteElement(currentPageIndex, selectedElementId)}
            style={{
              ...tBtn,
              color: 'var(--danger)',
              background: 'var(--danger-muted)',
              borderColor: 'transparent',
            }}
          >
            Delete
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Help hint */}
        <span style={{ fontSize: '11px', color: 'var(--text-ghost)', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
          {selectedEl ? 'Drag to move · handles to resize' : 'Click to select · drag photos in'}
        </span>
      </div>

      {/* ── Canvas stage ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <div
          id="album-canvas-stage"
          style={{
            width: scaledW,
            height: scaledH,
            boxShadow: '0 8px 48px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
            borderRadius: '3px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Stage
            ref={stageRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            scaleX={scale}
            scaleY={scale}
            onClick={e => { if (e.target === e.target.getStage()) setSelectedElementId(null) }}
          >
            <Layer>
              {/* Background */}
              <Rect
                x={0} y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill={currentPage.background?.startsWith('linear') ? '#1a1a1a' : (currentPage.background || '#0a0a0a')}
              />

              {/* Elements */}
              {currentPage.elements.map(el => {
                const sharedProps = {
                  element: el,
                  isSelected: selectedElementId === el.id,
                  onSelect: () => setSelectedElementId(el.id),
                  onUpdate: (u: Partial<PageElement>) => updateElement(currentPageIndex, el.id, u),
                }
                if (el.type === 'image' || el.type === 'frame') {
                  return <PhotoElement key={el.id} {...sharedProps} />
                }
                return <TextElement key={el.id} {...sharedProps} />
              })}

              {/* Invisible hit areas for context menu */}
              {currentPage.elements.map(el => (
                <Rect
                  key={`ctx-${el.id}`}
                  x={el.x} y={el.y}
                  width={el.width} height={el.height}
                  rotation={el.rotation}
                  fill="transparent"
                  onContextMenu={e => handleContextMenu(e, el.id)}
                  onClick={() => setSelectedElementId(el.id)}
                />
              ))}
            </Layer>
          </Stage>
        </div>
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
