import { NextRequest, NextResponse } from 'next/server'

const CANVAS_W = 800
const CANVAS_H = 600
const MARGIN = 32

export async function POST(req: NextRequest) {
  const { photos, pageCount, prompt } = await req.json()

  console.log('API KEY EXISTS:', !!process.env.GEMINI_API_KEY)
  console.log('API KEY FIRST 8 CHARS:', process.env.GEMINI_API_KEY?.slice(0, 8))
  console.log('PHOTOS COUNT:', photos?.length)

  if (!photos || photos.length === 0) return NextResponse.json({ error: 'No photos' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

  const stylePrompt = prompt
    ? `The user wants this style/mood for their album: "${prompt}". Use this to guide every design decision — colors, fonts, spacing, layout style, caption tone, everything.`
    : 'Use a clean, modern editorial style.'

  const fullPrompt = `
You are an expert photo album designer. Design a complete photo album layout.

${stylePrompt}

Canvas: ${CANVAS_W}x${CANVAS_H}px, margin: ${MARGIN}px
Photos to use (id only): ${photos.map((p: any) => p.id).join(', ')}
Number of pages: ${pageCount}

Design rules:
- Apply the mood/style to background colors, font choices, text colors, and layout
- Vary layouts per page: single hero, two-column, three-photo grid, full-bleed, collage with slight rotations
- Add short evocative captions (3-8 words) that match the style/mood
- Background can be any color — dark, light, textured hex colors that match the mood
- Font options: "Playfair Display, serif" | "DM Sans, sans-serif" | "Georgia, serif" | "Helvetica Neue, sans-serif" | "Courier New, monospace"
- Text color should contrast well with background
- Slight rotations (-4 to 4 degrees) add personality for casual styles, keep 0 for minimal styles
- Leave breathing room — don't overcrowd pages

Return ONLY valid JSON, no explanation, no markdown:
{
  "pages": [
    {
      "id": "uid",
      "background": "#1a1a1a",
      "elements": [
        {
          "id": "uid",
          "type": "image",
          "photoId": "photo-id-here",
          "url": "__PLACEHOLDER__",
          "x": 32,
          "y": 32,
          "width": 500,
          "height": 380,
          "rotation": 0
        },
        {
          "id": "uid",
          "type": "text",
          "text": "caption here",
          "x": 32,
          "y": 430,
          "width": 400,
          "height": 40,
          "fontSize": 16,
          "fill": "#f5f0e8",
          "fontFamily": "Playfair Display, serif",
          "fontStyle": "italic",
          "align": "left",
          "lineHeight": 1.4,
          "rotation": 0
        }
      ]
    }
  ]
}
`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
        }),
      }
    )

    const data = await res.json()
    console.log('GEMINI FULL RESPONSE:', JSON.stringify(data, null, 2))
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('GEMINI RAW RESPONSE:', text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const layout = JSON.parse(jsonMatch[0])
    const photoMap = Object.fromEntries(photos.map((p: any) => [p.id, p.url]))

    layout.pages = layout.pages.map((page: any) => ({
      ...page,
      id: crypto.randomUUID(),
      elements: page.elements.map((el: any) => ({
        ...el,
        id: crypto.randomUUID(),
        url: el.photoId ? (photoMap[el.photoId] || el.url) : el.url,
      })),
    }))

    return NextResponse.json({ pages: layout.pages })
  } catch (err) {
    console.error('AI error:', err)
    return NextResponse.json({ pages: generateFallbackLayout(photos, pageCount) })
  }
}

function generateFallbackLayout(photos: any[], pageCount: number) {
  const pages = []
  const perPage = Math.ceil(photos.length / pageCount)
  for (let p = 0; p < pageCount; p++) {
    const pagePhotos = photos.slice(p * perPage, (p + 1) * perPage)
    const cols = Math.ceil(Math.sqrt(pagePhotos.length))
    const rows = Math.ceil(pagePhotos.length / cols)
    const w = (CANVAS_W - MARGIN * (cols + 1)) / cols
    const h = (CANVAS_H - MARGIN * (rows + 1) - 60) / rows
    const elements = pagePhotos.map((photo, i) => ({
      id: crypto.randomUUID(), type: 'image',
      photoId: photo.id, url: photo.url,
      x: MARGIN + (i % cols) * (w + MARGIN),
      y: MARGIN + Math.floor(i / cols) * (h + MARGIN),
      width: w, height: h, rotation: 0,
    }))
    pages.push({ id: crypto.randomUUID(), background: '#ffffff', elements })
  }
  return pages
}