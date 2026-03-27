import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT TEMPLATE SYSTEM
//
// Instead of asking Claude to invent pixel coordinates (which produces chaotic
// results), we define a library of pre-tested, visually balanced layouts.
// Claude only decides:
//   1. Which template to use for each page
//   2. Which photo goes in which slot
//   3. Background colour + caption text + caption styling
//
// All coordinates are expressed as percentages (0–1) of canvas dimensions so
// the same templates work across all canvas sizes (portrait, landscape, square).
// ─────────────────────────────────────────────────────────────────────────────

const M = 0.04 // standard margin — 4 % of canvas dimension

type SlotDef = {
  key: string
  xP: number; yP: number   // left, top — fraction of canvas
  wP: number; hP: number   // width, height — fraction of canvas
  rot?: number             // optional pre-set rotation in degrees
}

type CaptionZoneDef = {
  xP: number; yP: number
  wP: number; hP: number
  align: 'left' | 'center' | 'right'
} | null

type TemplateDef = {
  id: string
  label: string
  description: string
  photoCount: number  // exact number of photos this template requires
  slots: SlotDef[]
  captionZone: CaptionZoneDef
}

// ── Template Library ──────────────────────────────────────────────────────────
const TEMPLATES: TemplateDef[] = [
  // ── Single photo ─────────────────────────────────────────────────────
  {
    id: 'full-bleed',
    label: 'Full bleed',
    description: 'One photo fills the entire canvas edge-to-edge',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0, yP: 0, wP: 1, hP: 1 }],
    captionZone: null,
  },
  {
    id: 'hero-caption',
    label: 'Hero with caption strip',
    description: 'Photo takes 85 % of canvas height; text caption strip at bottom',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0, yP: 0, wP: 1, hP: 0.85 }],
    captionZone: { xP: M, yP: 0.87, wP: 1 - M * 2, hP: 0.10, align: 'center' },
  },
  {
    id: 'centered-mat',
    label: 'Centered with mat border',
    description: 'Photo centered with generous margin on all sides, like a matted print',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0.14, yP: 0.07, wP: 0.72, hP: 0.78 }],
    captionZone: { xP: 0.14, yP: 0.87, wP: 0.72, hP: 0.09, align: 'center' },
  },

  // ── Two photos ───────────────────────────────────────────────────────
  {
    id: 'side-by-side',
    label: 'Two equal columns',
    description: 'Two photos side by side with a slim gap between them',
    photoCount: 2,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 0.46, hP: 1 - M * 2 },
      { key: 'B', xP: 0.54, yP: M, wP: 0.42, hP: 1 - M * 2 },
    ],
    captionZone: null,
  },
  {
    id: 'stacked-rows',
    label: 'Two stacked rows',
    description: 'Two landscape photos stacked vertically with a slim gap',
    photoCount: 2,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 1 - M * 2, hP: 0.45 },
      { key: 'B', xP: M, yP: 0.53, wP: 1 - M * 2, hP: 0.43 },
    ],
    captionZone: null,
  },
  {
    id: 'left-dominant',
    label: 'Large left, accent right',
    description: 'Dominant photo on the left, smaller accent photo centered on the right',
    photoCount: 2,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 0.56, hP: 1 - M * 2 },
      { key: 'B', xP: 0.64, yP: 0.27, wP: 0.32, hP: 0.46 },
    ],
    captionZone: null,
  },
  {
    id: 'right-dominant',
    label: 'Accent left, large right',
    description: 'Small accent photo centered on the left, dominant photo on the right',
    photoCount: 2,
    slots: [
      { key: 'A', xP: M, yP: 0.27, wP: 0.32, hP: 0.46 },
      { key: 'B', xP: 0.38, yP: M, wP: 0.58, hP: 1 - M * 2 },
    ],
    captionZone: null,
  },
  {
    id: 'scrapbook-pair',
    label: 'Scrapbook overlap pair',
    description: 'Two photos with intentional overlap and slight rotations — casual, playful feel',
    photoCount: 2,
    slots: [
      { key: 'A', xP: 0.04, yP: 0.06, wP: 0.52, hP: 0.80, rot: -2.5 },
      { key: 'B', xP: 0.40, yP: 0.14, wP: 0.54, hP: 0.76, rot: 2 },
    ],
    captionZone: null,
  },

  // ── Three photos ─────────────────────────────────────────────────────
  {
    id: 'three-col',
    label: 'Three equal columns',
    description: 'Three photos in equal vertical columns',
    photoCount: 3,
    slots: [
      { key: 'A', xP: M, yP: 0.08, wP: 0.29, hP: 0.84 },
      { key: 'B', xP: 0.355, yP: 0.08, wP: 0.29, hP: 0.84 },
      { key: 'C', xP: 0.665, yP: 0.08, wP: 0.29, hP: 0.84 },
    ],
    captionZone: null,
  },
  {
    id: 'hero-pair-below',
    label: 'Hero above, two below',
    description: 'Large hero photo top half, two equal photos bottom half',
    photoCount: 3,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 1 - M * 2, hP: 0.53 },
      { key: 'B', xP: M, yP: 0.61, wP: 0.46, hP: 0.33 },
      { key: 'C', xP: 0.54, yP: 0.61, wP: 0.42, hP: 0.33 },
    ],
    captionZone: null,
  },
  {
    id: 'two-stack-right',
    label: 'Tall left, two stacked right',
    description: 'Tall portrait photo left, two stacked photos right',
    photoCount: 3,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 0.46, hP: 1 - M * 2 },
      { key: 'B', xP: 0.54, yP: M, wP: 0.42, hP: 0.45 },
      { key: 'C', xP: 0.54, yP: 0.53, wP: 0.42, hP: 0.43 },
    ],
    captionZone: null,
  },
  {
    id: 'scrapbook-trio',
    label: 'Scrapbook three overlap',
    description: 'Three overlapping photos with slight rotations — warm, casual, memory-book feel',
    photoCount: 3,
    slots: [
      { key: 'A', xP: 0.04, yP: 0.05, wP: 0.50, hP: 0.74, rot: -2 },
      { key: 'B', xP: 0.44, yP: 0.08, wP: 0.50, hP: 0.72, rot: 1.5 },
      { key: 'C', xP: 0.22, yP: 0.26, wP: 0.48, hP: 0.66, rot: -1 },
    ],
    captionZone: null,
  },

  // ── Four photos ──────────────────────────────────────────────────────
  {
    id: 'quad-grid',
    label: '2×2 grid',
    description: 'Classic four-photo grid — balanced, editorial',
    photoCount: 4,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 0.46, hP: 0.44 },
      { key: 'B', xP: 0.54, yP: M, wP: 0.42, hP: 0.44 },
      { key: 'C', xP: M, yP: 0.52, wP: 0.46, hP: 0.44 },
      { key: 'D', xP: 0.54, yP: 0.52, wP: 0.42, hP: 0.44 },
    ],
    captionZone: null,
  },
  {
    id: 'dominant-left-three',
    label: 'Large left, three stacked right',
    description: 'Dominant photo occupying the left, three equal stacked right',
    photoCount: 4,
    slots: [
      { key: 'A', xP: M, yP: M, wP: 0.55, hP: 1 - M * 2 },
      { key: 'B', xP: 0.63, yP: M, wP: 0.33, hP: 0.28 },
      { key: 'C', xP: 0.63, yP: 0.36, wP: 0.33, hP: 0.28 },
      { key: 'D', xP: 0.63, yP: 0.68, wP: 0.33, hP: 0.28 },
    ],
    captionZone: null,
  },
  {
    id: 'filmstrip',
    label: 'Filmstrip four',
    description: 'Four photos in a horizontal filmstrip, vertically centered',
    photoCount: 4,
    slots: [
      { key: 'A', xP: M, yP: 0.15, wP: 0.21, hP: 0.70 },
      { key: 'B', xP: 0.29, yP: 0.15, wP: 0.21, hP: 0.70 },
      { key: 'C', xP: 0.54, yP: 0.15, wP: 0.21, hP: 0.70 },
      { key: 'D', xP: 0.79, yP: 0.15, wP: 0.17, hP: 0.70 },
    ],
    captionZone: null,
  },
]

const TEMPLATE_MAP: Record<string, TemplateDef> = Object.fromEntries(
  TEMPLATES.map(t => [t.id, t])
)

// ── Validated response type from Claude ───────────────────────────────────────
type CaptionStyle = {
  fill: string
  fontFamily: string
  fontSize: number
  align: 'left' | 'center' | 'right'
  fontStyle: string
}

type GeneratePage = {
  template: string
  background: string
  photoAssignment: Record<string, string> // slot key → photoId
  caption: string | null
  captionStyle: CaptionStyle
}

type RefinePageUpdate = {
  pageIndex: number
  background: string
  textUpdates: Array<{
    elementId: string
    text: string
    fontSize: number
    fill: string
    fontFamily: string
    fontStyle: string
    align: 'left' | 'center' | 'right'
    lineHeight: number
    rotation: number
  }>
  newTextElements: Array<{
    id: string
    type: 'text'
    text: string
    x: number; y: number
    width: number; height: number
    fontSize: number; fill: string
    fontFamily: string; fontStyle: string
    align: 'left' | 'center' | 'right'
    lineHeight: number; rotation: number
  }>
}

// ── Validation ────────────────────────────────────────────────────────────────
function isValidGenerateResponse(obj: unknown): obj is { pages: GeneratePage[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length === 0) return false
  for (const page of o.pages as GeneratePage[]) {
    if (typeof page.template !== 'string') return false
    if (!(page.template in TEMPLATE_MAP)) return false
    if (typeof page.background !== 'string') return false
    if (!page.photoAssignment || typeof page.photoAssignment !== 'object') return false
    // Check that slot keys match what the template expects
    const tmpl = TEMPLATE_MAP[page.template]
    for (const slot of tmpl.slots) {
      if (!page.photoAssignment[slot.key]) return false
    }
  }
  return true
}

function isValidRefineResponse(obj: unknown): obj is { pages: RefinePageUpdate[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length === 0) return false
  for (const page of o.pages as RefinePageUpdate[]) {
    if (typeof page.pageIndex !== 'number') return false
    if (typeof page.background !== 'string') return false
    if (!Array.isArray(page.textUpdates)) return false
    if (!Array.isArray(page.newTextElements)) return false
  }
  return true
}

// ── Template → PageElement expansion ─────────────────────────────────────────
function expandTemplate(
  template: TemplateDef,
  canvasW: number,
  canvasH: number,
  photoAssignment: Record<string, string>,
  photoUrlMap: Record<string, string>,
  caption: string | null,
  captionStyle: CaptionStyle
): unknown[] {
  const elements: unknown[] = []

  // Photo slots
  for (const slot of template.slots) {
    const photoId = photoAssignment[slot.key]
    if (!photoId) continue
    const url = photoUrlMap[photoId]
    if (!url) continue
    elements.push({
      id: crypto.randomUUID(),
      type: 'image',
      photoId,
      url,
      x: Math.round(slot.xP * canvasW),
      y: Math.round(slot.yP * canvasH),
      width: Math.round(slot.wP * canvasW),
      height: Math.round(slot.hP * canvasH),
      rotation: slot.rot ?? 0,
    })
  }

  // Caption element
  const cz = template.captionZone
  if (caption) {
    const x = cz ? Math.round(cz.xP * canvasW) : Math.round(M * canvasW)
    const y = cz ? Math.round(cz.yP * canvasH) : Math.round(0.88 * canvasH)
    const w = cz ? Math.round(cz.wP * canvasW) : Math.round((1 - M * 2) * canvasW)
    const h = cz ? Math.round(cz.hP * canvasH) : Math.round(0.09 * canvasH)
    const align = captionStyle.align || cz?.align || 'center'
    elements.push({
      id: crypto.randomUUID(),
      type: 'text',
      text: caption,
      x, y, width: w, height: h,
      fontSize: captionStyle.fontSize,
      fill: captionStyle.fill,
      fontFamily: captionStyle.fontFamily,
      fontStyle: captionStyle.fontStyle,
      align,
      lineHeight: 1.4,
      rotation: 0,
    })
  }

  return elements
}

// ── System prompts ────────────────────────────────────────────────────────────
function buildGenerateSystemPrompt(canvasW: number, canvasH: number): string {
  const templateMenu = TEMPLATES
    .map(t => `  "${t.id}" — ${t.photoCount} photo${t.photoCount > 1 ? 's' : ''} — ${t.description}`)
    .join('\n')

  return `You are an expert photo album layout designer.

Canvas: ${canvasW}×${canvasH}px.

AVAILABLE TEMPLATES (choose one per page):
${templateMenu}

FONT OPTIONS (use exact strings):
  "Playfair Display, serif"
  "Cormorant Garamond, serif"
  "Georgia, serif"
  "DM Sans, sans-serif"
  "Helvetica Neue, sans-serif"
  "Courier New, monospace"

TASK: Plan a multi-page album. For each page choose a template, assign photo IDs
to its named slots, and specify background colour + optional caption.

OUTPUT — valid JSON ONLY, no markdown, no explanation, no code fences:
{
  "pages": [
    {
      "template": "<template-id>",
      "background": "<hex-color>",
      "photoAssignment": { "A": "<photo-id>", "B": "<photo-id>" },
      "caption": "<3–8 evocative words>  OR  null",
      "captionStyle": {
        "fill": "<hex-color>",
        "fontFamily": "<exact font string from list above>",
        "fontSize": <number 12–32>,
        "align": "<left|center|right>",
        "fontStyle": "<italic|bold|>"
      }
    }
  ]
}

STRICT RULES:
1. "photoAssignment" MUST contain exactly the slot keys the template defines — no extras, no omissions.
2. Use EVERY provided photo ID at least once across all pages.
3. NEVER use the same template on two consecutive pages — vary the layouts.
4. First page should feel like a cover — prefer "hero-caption" or "full-bleed" with a strong caption.
5. Scrapbook templates ("scrapbook-pair", "scrapbook-trio") suit casual, warm occasions.
6. Clean grid templates ("quad-grid", "three-col", "side-by-side") suit minimal or formal styles.
7. Background + caption fill must have strong contrast. Dark background → light text. Light background → dark text.
8. "caption" is optional — use null when the photo speaks for itself. Use it on first/last pages and hero-caption template.
9. Do not put captions on "full-bleed" unless the mood strongly calls for it.`
}

const REFINE_SYSTEM_PROMPT = `You are an expert photo album stylist.
You receive a description of an existing album layout and must RESTYLE it — changing
backgrounds, fonts, colours, and captions — WITHOUT moving or resizing any photo element.

FONT OPTIONS (use exact strings):
  "Playfair Display, serif" | "Cormorant Garamond, serif" | "Georgia, serif"
  "DM Sans, sans-serif" | "Helvetica Neue, sans-serif" | "Courier New, monospace"

OUTPUT — valid JSON ONLY, no markdown, no code fences:
{
  "pages": [
    {
      "pageIndex": <number>,
      "background": "<hex-color>",
      "textUpdates": [
        {
          "elementId": "<existing element id>",
          "text": "<new caption>",
          "fontSize": <number>,
          "fill": "<hex-color>",
          "fontFamily": "<exact font string>",
          "fontStyle": "<italic|bold|>",
          "align": "<left|center|right>",
          "lineHeight": <number 1.2–1.8>,
          "rotation": <number>
        }
      ],
      "newTextElements": []
    }
  ]
}

STRICT RULES:
1. Do NOT change any image element — never include image elements in your response.
2. Do NOT change x, y, width, or height of any element.
3. Update the background colour for EVERY page.
4. Update ALL existing text elements (improve the caption text to match the new mood).
5. "newTextElements" should be an empty array — do not add new elements.
6. Ensure strong contrast: background vs text fill.`

// ── JSON extractor ───────────────────────────────────────────────────────────
// Claude sometimes wraps JSON in prose or code fences despite instructions.
// This finds the first complete {...} block in the response.
function extractJSON(raw: string): string {
  // First try stripping common code-fence patterns
  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  // If it starts with '{', use directly
  if (fenceStripped.startsWith('{')) return fenceStripped

  // Otherwise find the first '{' and the matching closing '}'
  const start = raw.indexOf('{')
  if (start === -1) return raw // will fail JSON.parse — that's fine
  let depth = 0
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return raw.slice(start) // unclosed — will fail JSON.parse
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 5 * 60_000

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated. Please sign in and try again.' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 })
  }

  // ── Rate limit ──────────────────────────────────────────────────────
  const { allowed } = checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service is not configured.' }, { status: 500 })
  }

  const body = await req.json()
  const {
    photos,
    pageCount,
    prompt,
    mode,
    currentPages,
    canvasW = 800,
    canvasH = 600,
  } = body

  const sanitizedPrompt = prompt
    ? String(prompt).replace(/[<>{}]/g, '').slice(0, 500)
    : ''

  // ════════════════════════════════════════════════════════════════════
  // REFINE MODE — restyle colours/fonts/captions, preserve photo positions
  // ════════════════════════════════════════════════════════════════════
  if (mode === 'refine') {
    if (!currentPages || !Array.isArray(currentPages) || currentPages.length === 0) {
      return NextResponse.json({ error: 'No existing pages to refine.' }, { status: 400 })
    }

    const styleInstruction = sanitizedPrompt
      ? `Style direction from user: "${sanitizedPrompt}". Apply this mood to every design decision.`
      : 'Refine with a clean, modern editorial style.'

    // Describe current layout to Claude (text elements only — photos are never moved)
    const pageDescriptions = currentPages.map((page: any, i: number) => {
      const textEls = page.elements
        .filter((el: any) => el.type === 'text')
        .map((el: any) =>
          `    id="${el.id}" text="${el.text}" at x=${Math.round(el.x)} y=${Math.round(el.y)} w=${Math.round(el.width)}`
        ).join('\n')
      const photoCount = page.elements.filter((el: any) => el.type === 'image').length
      return `Page ${i} (pageIndex:${i}): background="${page.background}", ${photoCount} photo(s)\n${textEls || '    (no text elements)'}`
    }).join('\n\n')

    const userMsg = `${styleInstruction}\n\nCurrent album pages:\n\n${pageDescriptions}\n\nRefine all ${currentPages.length} pages. Change backgrounds and update/improve all existing captions to match the new mood. Do NOT change photo positions.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 8192,
          temperature: 1,
          system: REFINE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }],
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        console.error('Claude refine error:', res.status, txt)
        if (res.status === 529 || res.status === 503)
          throw new Error('AI service is overloaded. Please try again in a moment.')
        throw new Error(`AI service error (${res.status})`)
      }

      const data = await res.json()
      const rawText: string = data.content?.[0]?.text || ''
      const cleaned = extractJSON(rawText)
      console.log('[ai-layout refine] raw length:', rawText.length, '| extracted starts with:', cleaned.slice(0, 60))

      let refinement: unknown
      try { refinement = JSON.parse(cleaned) } catch {
        console.error('Refine JSON parse failed. Raw response:', rawText.slice(0, 800))
        throw new Error('AI returned an invalid response. Please try again.')
      }

      if (!isValidRefineResponse(refinement)) {
        console.error('Refine validation failed:', JSON.stringify(refinement).slice(0, 500))
        throw new Error('AI response structure was invalid. Please try again.')
      }

      const refinedPages = currentPages.map((page: any, pageIndex: number) => {
        const update = refinement.pages.find((p: RefinePageUpdate) => p.pageIndex === pageIndex)
        if (!update) return page

        const updatedElements = page.elements.map((el: any) => {
          if (el.type !== 'text') return el
          const tu = update.textUpdates?.find((t: any) => t.elementId === el.id)
          if (!tu) return el
          return {
            ...el,
            text: tu.text ?? el.text,
            fontSize: tu.fontSize ?? el.fontSize,
            fill: tu.fill ?? el.fill,
            fontFamily: tu.fontFamily ?? el.fontFamily,
            fontStyle: tu.fontStyle ?? el.fontStyle,
            align: tu.align ?? el.align,
            lineHeight: tu.lineHeight ?? el.lineHeight,
            rotation: tu.rotation ?? el.rotation,
          }
        })

        return {
          ...page,
          background: update.background ?? page.background,
          elements: updatedElements,
        }
      })

      return NextResponse.json({ pages: refinedPages })
    } catch (err: any) {
      console.error('AI refine error:', err)
      return NextResponse.json({ error: err.message || 'Could not refine the album.' }, { status: 500 })
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // GENERATE MODE — template-based full album generation
  // ════════════════════════════════════════════════════════════════════
  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided. Upload at least one photo first.' }, { status: 400 })
  }

  // Build a photo map: id → url
  const photoUrlMap: Record<string, string> = {}
  for (const p of photos) { photoUrlMap[p.id] = p.url }

  // Decide how many pages to target (guided by photo count)
  const targetPages = Math.max(
    Math.min(pageCount || Math.ceil(photos.length / 2), 12),
    1
  )

  const styleInstruction = sanitizedPrompt
    ? `Style/mood: "${sanitizedPrompt}"`
    : 'Style: clean, modern, editorial.'

  // List only templates that fit available photo count range
  // (Claude might assign 1-4 photos per page)
  const systemPrompt = buildGenerateSystemPrompt(canvasW, canvasH)

  const userMsg = `${styleInstruction}

Photos to distribute (use every ID at least once):
${photos.map((p: any) => `- "${p.id}"`).join('\n')}

Target page count: ${targetPages} pages.
Distribute all ${photos.length} photos across ${targetPages} pages.
Each page should use 1–4 photos. Choose templates that suit both the photo count and the mood.

Return ONLY the JSON object.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        temperature: 1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('Claude generate error:', res.status, txt)
      if (res.status === 529 || res.status === 503)
        throw new Error('AI service is overloaded. Please try again in a moment.')
      throw new Error(`AI service error (${res.status})`)
    }

    const data = await res.json()
    const rawText: string = data.content?.[0]?.text || ''
    const cleaned = extractJSON(rawText)
    console.log('[ai-layout generate] raw length:', rawText.length, '| extracted starts with:', cleaned.slice(0, 60))

    let layout: unknown
    try { layout = JSON.parse(cleaned) } catch {
      console.error('Generate JSON parse failed. Raw response:', rawText.slice(0, 800))
      throw new Error('AI returned an invalid response. Please try again.')
    }

    if (!isValidGenerateResponse(layout)) {
      console.error('Generate validation failed:', JSON.stringify(layout).slice(0, 600))
      throw new Error('AI response structure was invalid. Please try again.')
    }

    // Expand templates → full PageElement arrays
    const pages = layout.pages.map((p: GeneratePage) => {
      const template = TEMPLATE_MAP[p.template]
      // Graceful fallback if unknown template
      if (!template) {
        const firstId = Object.values(p.photoAssignment)[0]
        return {
          id: crypto.randomUUID(),
          background: p.background || '#0f0f0f',
          elements: firstId ? [{
            id: crypto.randomUUID(),
            type: 'image',
            photoId: firstId,
            url: photoUrlMap[firstId] || '',
            x: 0, y: 0, width: canvasW, height: canvasH,
            rotation: 0,
          }] : [],
        }
      }

      const defaultCaptionStyle: CaptionStyle = {
        fill: '#f4f0ea',
        fontFamily: 'Georgia, serif',
        fontSize: 18,
        align: 'center',
        fontStyle: 'italic',
      }

      const elements = expandTemplate(
        template,
        canvasW,
        canvasH,
        p.photoAssignment,
        photoUrlMap,
        p.caption ?? null,
        p.captionStyle ?? defaultCaptionStyle,
      )

      return {
        id: crypto.randomUUID(),
        background: p.background,
        elements,
      }
    })

    return NextResponse.json({ pages })
  } catch (err: any) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: err.message || 'Could not generate the album.' }, { status: 500 })
  }
}
