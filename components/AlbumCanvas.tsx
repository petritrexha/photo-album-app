'use client'
import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva'
import useImage from 'use-image'
import { useAlbumStore } from '@/lib/store'
import type { PageElement } from '@/lib/supabase'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

// Single image element on canvas
function PhotoElement({ element, isSelected, onSelect, onUpdate, onDelete }: {
  element: PageElement
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<PageElement>) => void
  onDelete: () => void
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
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
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
          boundBoxFunc={(old, newBox) => newBox.width < 40 || newBox.height < 40 ? old : newBox}
        />
      )}
    </>
  )
}

// Text element on canvas
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

  return (
    <>
      <Text
        ref={shapeRef}
        text={element.text || 'Double-click to edit'}
        x={element.x} y={element.y}
        fontSize={element.fontSize || 18}
        fill={element.fill || '#333333'}
        fontFamily="Georgia, serif"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onUpdate({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={(e) => {
          const node = shapeRef.current
          onUpdate({ x: node.x(), y: node.y(), rotation: node.rotation() })
          node.scaleX(1); node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer ref={trRef} rotateEnabled enabledAnchors={['middle-left', 'middle-right']} />
      )}
    </>
  )
}

export default function AlbumCanvas() {
  const { album, currentPageIndex, selectedElementId, setSelectedElementId,
    addElement, updateElement, deleteElement } = useAlbumStore()

  const stageRef = useRef<any>(null)
  const [bgColor, setBgColor] = useState('#ffffff')

  const currentPage = album?.pages[currentPageIndex]

  useEffect(() => {
    if (currentPage) setBgColor(currentPage.background)
  }, [currentPage])

  // Drag-from-sidebar drop onto canvas
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const photoId = e.dataTransfer.getData('photoId')
    const photoUrl = e.dataTransfer.getData('photoUrl')
    const photoW = parseInt(e.dataTransfer.getData('photoWidth')) || 800
    const photoH = parseInt(e.dataTransfer.getData('photoHeight')) || 600

    if (!photoId || !stageRef.current) return

    const stage = stageRef.current
    const pos = stage.getPointerPosition() || { x: 200, y: 150 }

    // Scale photo to reasonable size
    const maxW = 350
    const scale = Math.min(maxW / photoW, maxW / photoH, 1)
    const w = Math.round(photoW * scale)
    const h = Math.round(photoH * scale)

    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: 'image',
      photoId,
      url: photoUrl,
      x: pos.x - w / 2,
      y: pos.y - h / 2,
      width: w,
      height: h,
      rotation: 0,
    })
  }

  function addTextBox() {
    addElement(currentPageIndex, {
      id: crypto.randomUUID(),
      type: 'text',
      text: 'Add your caption here',
      x: 100,
      y: CANVAS_HEIGHT - 80,
      width: 300,
      height: 30,
      fontSize: 16,
      fill: '#333333',
      rotation: 0,
    })
  }

  const selectedElement = currentPage?.elements.find(e => e.id === selectedElementId)

  if (!currentPage) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Element toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={addTextBox}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
            padding: '7px 14px', borderRadius: '4px', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          + Text
        </button>

        {/* Background color picker */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
          color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
          Background:
          <input type="color" value={bgColor}
            onChange={(e) => {
              setBgColor(e.target.value)
              if (album) {
                const pages = album.pages.map((p, i) =>
                  i === currentPageIndex ? { ...p, background: e.target.value } : p
                )
                useAlbumStore.getState().setAlbum({ ...album, pages })
                useAlbumStore.getState().setIsDirty(true)
              }
            }}
            style={{ width: '32px', height: '28px', borderRadius: '4px', cursor: 'pointer',
              border: '1px solid #2a2a2a', background: 'none' }}
          />
        </label>

        {/* Selected element controls */}
        {selectedElement?.type === 'text' && (
          <>
            <input
              value={selectedElement.text || ''}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId!, { text: e.target.value })}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
                padding: '6px 10px', borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px', width: '200px', outline: 'none' }}
              placeholder="Edit text..."
            />
            <input type="color" value={selectedElement.fill || '#333333'}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId!, { fill: e.target.value })}
              style={{ width: '32px', height: '28px', borderRadius: '4px', cursor: 'pointer',
                border: '1px solid #2a2a2a', background: 'none' }}
              title="Text color"
            />
            <input type="number" value={selectedElement.fontSize || 16} min={8} max={120}
              onChange={(e) => updateElement(currentPageIndex, selectedElementId!,
                { fontSize: parseInt(e.target.value) })}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f0e8',
                padding: '6px 10px', borderRadius: '4px', width: '64px',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none' }}
              title="Font size"
            />
          </>
        )}

        {selectedElementId && (
          <button onClick={() => deleteElement(currentPageIndex, selectedElementId)}
            style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#e05555',
              padding: '7px 14px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
            Delete
          </button>
        )}
      </div>

      {/* Canvas */}
      <div
        id="album-canvas-stage"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)', borderRadius: '2px' }}>
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={(e) => { if (e.target === e.target.getStage()) setSelectedElementId(null) }}>
          <Layer>
            {/* Background */}
            <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={bgColor} />

            {/* Elements */}
            {currentPage.elements.map((element) => {
              if (element.type === 'image') {
                return (
                  <PhotoElement
                    key={element.id}
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={() => setSelectedElementId(element.id)}
                    onUpdate={(updates) => updateElement(currentPageIndex, element.id, updates)}
                    onDelete={() => deleteElement(currentPageIndex, element.id)}
                  />
                )
              }
              if (element.type === 'text') {
                return (
                  <TextElement
                    key={element.id}
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={() => setSelectedElementId(element.id)}
                    onUpdate={(updates) => updateElement(currentPageIndex, element.id, updates)}
                  />
                )
              }
              return null
            })}
          </Layer>
        </Stage>
      </div>

      <p style={{ color: '#333', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>
        Page {currentPageIndex + 1} of {album?.pages.length} · Drag photos from the panel →
      </p>
    </div>
  )
}
