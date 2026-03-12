'use client'
import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

const FONTS = [
  { label: 'Playfair', value: 'Playfair Display, serif' },
  { label: 'Modern', value: 'DM Sans, sans-serif' },
  { label: 'Classic', value: 'Georgia, serif' },
  { label: 'Clean', value: 'Helvetica Neue, sans-serif' },
  { label: 'Mono', value: 'Courier New, monospace' },
  { label: 'Script', value: 'Palatino Linotype, serif' },
]

function PhotoElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<PageElement>) => void
}) {
  const [image] = useImage(element.url || '', 'anonymous')
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)

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
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current
          onUpdate({
            x: node.x(), y: node.y(),
            width: Math.max(40, node.width() * node.scaleX()),
            height: Math.max(40, node.height() * node.scaleY()),
            rotation: node.rotation(),
          })
          node.scaleX(1); node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} rotateEnabled keepRatio={false}
          boundBoxFunc={(old, n) => n.width < 40 || n.height < 40 ? old : n} />
      )}
    </>
  )
}

function TextElement({ element, isSelected, onSelect, onUpdate }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<PageElement>) => void
}) {
  const shapeRef = useRef<any>(null)
  const trRef = useRef<any>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  const fontStyle = [
    element.fontStyle?.includes('bold') ? 'bold' : '',
    element.fontStyle?.includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal'

  return (
    <>
      <Text
        ref={shapeRef}
        text={element.text || 'Double-click to edit'}
        x={element.x} y={element.y}
        width={element.width || 300}
        fontSize={element.fontSize || 18}
        fill={element.fill || '#333333'}
        fontFamily={element.fontFamily || 'Georgia, serif'}
        fontStyle={fontStyle}
        textDecoration={element.fontStyle?.includes('underline') ? 'underline' : ''}
        align={element.align || 'left'}
        lineHeight={element.lineHeight || 1.4}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current
          onUpdate({ x: node.x(), y: node.y(), width: node.width() * node.scaleX(), rotation: node.rotation() })
          node.scaleX(1); node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']} />
      )}
    </>
  )
}

export default function AlbumCanvas() {
  const { album, currentPageIndex, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement } = useAlbumStore()
  const stageRef = useRef<any>(null)
  const currentPage = album?.pages[currentPageIndex]

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const photoId = e.dataTransfer.getData('photoId')
    const photoUrl = e.dataTransfer.getData('photoUrl')
    const photoW = parseInt(e.dataTransfer.getData('photoWidth')) || 800
    const photoH = parseInt(e.dataTransfer.getData('photoHeight')) || 600
    if (!photoId || !stageRef.current) return

    const stage = stageRef.current
    const pos = stage.getPointerPosition() || { x: 200, y: 150 }
    const maxW = 350
    const scale = Math.min(maxW / photoW, maxW / photoH, 1)

    addElement(currentPageIndex, {
      id: crypto.randomUUID(), type: 'image',
      photoId, url: photoUrl,
      x: pos.x - (photoW * scale) / 2,
      y: pos.y - (photoH * scale) / 2,
      width: Math.round(photoW * scale),
      height: Math.round(photoH * scale),
      rotation: 0,
    })
  }

  function addTextBox() {
    addElement(currentPageIndex, {
      id: crypto.randomUUID(), type: 'text',
      text: 'Your caption here',
      x: 100, y: CANVAS_HEIGHT - 100,
      width: 300, height: 30,
      fontSize: 18,
      fill: '#333333',
      fontFamily: 'Georgia, serif',
      fontStyle: '',
      align: 'left',
      lineHeight: 1.4,
      rotation: 0,
    })
  }

  function updateBg(color: string) {
    if (!album) return
    const pages = album.pages.map((p, i) =>
      i === currentPageIndex ? { ...p, background: color } : p
    )
    useAlbumStore.getState().setAlbum({ ...album, pages })
    useAlbumStore.getState().setIsDirty(true)
  }

  const selectedEl = currentPage?.elements.find(e => e.id === selectedElementId)
  const isTextSelected = selectedEl?.type === 'text'

  function toggleStyle(style: string) {
    if (!selectedEl || !selectedElementId) return
    const current = selectedEl.fontStyle || ''
    const has = current.includes(style)
    const next = has ? current.replace(style, '').trim() : (current + ' ' + style).trim()
    updateElement(currentPageIndex, selectedElementId, { fontStyle: next })
  }

  if (!currentPage) return null

  const btnBase: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px'
  }
  const btnActive: React.CSSProperties = { ...btnBase, background: '#d48c3a', color: '#0e0e0e', border: '1px solid #d48c3a' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '800px' }}>

        {/* Add text */}
        <button onClick={addTextBox} style={btnBase}>+ Text</button>

        {/* Background */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
          color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          BG:
          <input type="color" defaultValue={currentPage.background}
            onChange={(e) => updateBg(e.target.value)}
            style={{ width: '28px', height: '26px', borderRadius: '3px',
              border: '1px solid #2a2a2a', cursor: 'pointer', background: 'none' }} />
        </label>

        {/* Text controls — only show when text is selected */}
        {isTextSelected && selectedEl && selectedElementId && (
          <>
            <div style={{ width: '1px', height: '24px', background: '#2a2a2a' }} />

            {/* Text input */}
            <input value={selectedEl.text || ''}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId, { text: e.target.value })}
              style={{ ...btnBase, border: '1px solid #3a3a3a', width: '160px', outline: 'none' }}
              placeholder="Edit text..." />

            {/* Font picker */}
            <select value={selectedEl.fontFamily || 'Georgia, serif'}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId, { fontFamily: e.target.value })}
              style={{ ...btnBase, cursor: 'pointer' }}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            {/* Font size */}
            <input type="number" value={selectedEl.fontSize || 18} min={8} max={120}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId, { fontSize: parseInt(e.target.value) })}
              style={{ ...btnBase, width: '58px', outline: 'none' }}
              title="Font size" />

            {/* Color */}
            <input type="color" value={selectedEl.fill || '#333333'}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId, { fill: e.target.value })}
              style={{ width: '28px', height: '26px', borderRadius: '3px',
                border: '1px solid #2a2a2a', cursor: 'pointer', background: 'none' }}
              title="Text color" />

            {/* Bold / Italic / Underline */}
            <button onClick={() => toggleStyle('bold')}
              style={selectedEl.fontStyle?.includes('bold') ? btnActive : btnBase}>
              <b>B</b>
            </button>
            <button onClick={() => toggleStyle('italic')}
              style={selectedEl.fontStyle?.includes('italic') ? btnActive : btnBase}>
              <i>I</i>
            </button>
            <button onClick={() => toggleStyle('underline')}
              style={selectedEl.fontStyle?.includes('underline') ? btnActive : btnBase}>
              <u>U</u>
            </button>

            {/* Alignment */}
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} onClick={() => updateElement(currentPageIndex, selectedElementId, { align: a })}
                style={(selectedEl.align || 'left') === a ? btnActive : btnBase}>
                {a === 'left' ? '⬛▪▪' : a === 'center' ? '▪⬛▪' : '▪▪⬛'}
              </button>
            ))}

            {/* Line height */}
            <select value={selectedEl.lineHeight || 1.4}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId, { lineHeight: parseFloat(e.target.value) })}
              style={{ ...btnBase, cursor: 'pointer' }} title="Line height">
              {[1, 1.2, 1.4, 1.6, 1.8, 2].map(v => (
                <option key={v} value={v}>↕ {v}</option>
              ))}
            </select>

            <div style={{ width: '1px', height: '24px', background: '#2a2a2a' }} />

            {/* Delete */}
            <button onClick={() => deleteElement(currentPageIndex, selectedElementId)}
              style={{ ...btnBase, background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#e05555' }}>
              Delete
            </button>
          </>
        )}

        {/* Delete image */}
        {selectedEl?.type === 'image' && selectedElementId && (
          <button onClick={() => deleteElement(currentPageIndex, selectedElementId)}
            style={{ ...btnBase, background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#e05555' }}>
            Delete photo
          </button>
        )}
      </div>

      {/* Canvas */}
      <div id="album-canvas-stage"
        onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)', borderRadius: '2px' }}>
        <Stage ref={stageRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          onClick={(e) => { if (e.target === e.target.getStage()) setSelectedElementId(null) }}>
          <Layer>
            <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={currentPage.background} />
            {currentPage.elements.map((el) =>
              el.type === 'image' ? (
                <PhotoElement key={el.id} element={el}
                  isSelected={selectedElementId === el.id}
                  onSelect={() => setSelectedElementId(el.id)}
                  onUpdate={(u) => updateElement(currentPageIndex, el.id, u)} />
              ) : (
                <TextElement key={el.id} element={el}
                  isSelected={selectedElementId === el.id}
                  onSelect={() => setSelectedElementId(el.id)}
                  onUpdate={(u) => updateElement(currentPageIndex, el.id, u)} />
              )
            )}
          </Layer>
        </Stage>
      </div>

      <p style={{ color: '#333', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
        Page {currentPageIndex + 1} of {album?.pages.length} · Drag photos from panel →
      </p>
    </div>
  )
}