import { NextRequest, NextResponse } from 'next/server'

const CANVAS_W = 800
const CANVAS_H = 600
const MARGIN = 32

export async function POST(req: NextRequest) {
  const { photos, pageCount } = await req.json()
  if (!photos || photos.length === 0) return NextResponse.json({ error: 'No photos' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const prompt = `You are a photo album layout designer. Given ${photos.length} photos across ${pageCount} pages.
Each page is ${CANVAS_W}x${CANVAS_H}px with ${MARGIN}px margins.
Photos: ${photos.map((p: any) => `id:${p.id}`).join(', ')}
Return ONLY valid JSON:
{"pages":[{"id":"uid","background":"#ffffff","elements":[{"id":"uid","type":"image","photoId":"photo-id","url":"__PLACEHOLDER__","x":32,"y":32,"width":400,"height":300,"rotation":0}]}]}
Generate ${pageCount} pages, use all photos, vary layouts beautifully.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }) }
    )
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const layout = JSON.parse(jsonMatch[0])
    const photoMap = Object.fromEntries(photos.map((p: any) => [p.id, p.url]))
    layout.pages = layout.pages.map((page: any) => ({
      ...page, id: crypto.randomUUID(),
      elements: page.elements.map((el: any) => ({ ...el, id: crypto.randomUUID(), url: photoMap[el.photoId] || el.url })),
    }))
    return NextResponse.json({ pages: layout.pages })
  } catch (err) {
    return NextResponse.json({ pages: generateFallbackLayout(photos, pageCount) })
  }
}

function generateFallbackLayout(photos: any[], pageCount: number) {
  const pages = []
  const perPage = Math.ceil(photos.length / pageCount)
  for (let p = 0; p < pageCount; p++) {
    const pagePhotos = photos.slice(p * perPage, (p + 1) * perPage)
    const elements = pagePhotos.map((photo, i) => {
      const cols = Math.ceil(Math.sqrt(pagePhotos.length))
      const rows = Math.ceil(pagePhotos.length / cols)
      const w = (CANVAS_W - MARGIN * (cols + 1)) / cols
      const h = (CANVAS_H - MARGIN * (rows + 1) - 60) / rows
      return { id: crypto.randomUUID(), type: 'image', photoId: photo.id, url: photo.url,
        x: MARGIN + (i % cols) * (w + MARGIN), y: MARGIN + Math.floor(i / cols) * (h + MARGIN),
        width: w, height: h, rotation: 0 }
    })
    pages.push({ id: crypto.randomUUID(), background: '#ffffff', elements })
  }
  return pages
}