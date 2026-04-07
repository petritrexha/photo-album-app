import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT TEMPLATE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const M = 0.04

type SlotDef = {
  key: string
  xP: number; yP: number
  wP: number; hP: number
  rot?: number
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
  photoCount: number
  slots: SlotDef[]
  captionZone: CaptionZoneDef
}

const TEMPLATES: TemplateDef[] = [
  // ── 1-photo ──────────────────────────────────────────────────────────────
  {
    id: 'full-bleed',
    label: 'Full bleed',
    description: 'One photo fills entire canvas. Best for strong, dramatic hero shots.',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0, yP: 0, wP: 1, hP: 1 }],
    captionZone: null,
  },
  {
    id: 'hero-caption',
    label: 'Hero with caption strip',
    description: 'Photo fills top 85%, text strip at bottom. Perfect for first/last pages.',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0, yP: 0, wP: 1, hP: 0.85 }],
    captionZone: { xP: M, yP: 0.87, wP: 1 - M * 2, hP: 0.10, align: 'center' },
  },
  {
    id: 'centered-mat',
    label: 'Centered with mat border',
    description: 'Photo centered with generous white-mat margins. Elegant, gallery feel.',
    photoCount: 1,
    slots: [{ key: 'A', xP: 0.14, yP: 0.07, wP: 0.72, hP: 0.78 }],
    captionZone: { xP: 0.14, yP: 0.87, wP: 0.72, hP: 0.09, align: 'center' },
  },

  // ── 2-photo ──────────────────────────────────────────────────────────────
  {
    id: 'side-by-side',
    label: 'Two equal columns',
    description: 'Two photos in equal side-by-side columns. Classic diptych.',
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
    description: 'Two landscape photos stacked vertically.',
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
    description: 'Dominant photo left, smaller accent photo centered on the right.',
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
    description: 'Small accent photo left, dominant photo right.',
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
    description: 'Two overlapping slightly rotated photos. Casual, playful, warm.',
    photoCount: 2,
    slots: [
      { key: 'A', xP: 0.04, yP: 0.06, wP: 0.52, hP: 0.80, rot: -2.5 },
      { key: 'B', xP: 0.40, yP: 0.14, wP: 0.54, hP: 0.76, rot: 2 },
    ],
    captionZone: null,
  },

  // ── 3-photo ──────────────────────────────────────────────────────────────
  {
    id: 'three-col',
    label: 'Three equal columns',
    description: 'Three photos in equal vertical columns.',
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
    description: 'Large hero photo top half, two equal photos bottom half.',
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
    description: 'Tall portrait photo left, two stacked photos right.',
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
    description: 'Three overlapping rotated photos. Warm, memory-book aesthetic.',
    photoCount: 3,
    slots: [
      { key: 'A', xP: 0.04, yP: 0.05, wP: 0.50, hP: 0.74, rot: -2 },
      { key: 'B', xP: 0.44, yP: 0.08, wP: 0.50, hP: 0.72, rot: 1.5 },
      { key: 'C', xP: 0.22, yP: 0.26, wP: 0.48, hP: 0.66, rot: -1 },
    ],
    captionZone: null,
  },

  // ── 4-photo ──────────────────────────────────────────────────────────────
  {
    id: 'quad-grid',
    label: '2×2 grid',
    description: 'Four photos in a 2×2 grid. Balanced, editorial.',
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
    description: 'Dominant photo on the left, three equal photos stacked on the right.',
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
    description: 'Four photos in a horizontal filmstrip.',
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

// ── Photo count → eligible template IDs ──────────────────────────────────────
const TEMPLATES_BY_COUNT: Record<number, string[]> = {}
for (const t of TEMPLATES) {
  if (!TEMPLATES_BY_COUNT[t.photoCount]) TEMPLATES_BY_COUNT[t.photoCount] = []
  TEMPLATES_BY_COUNT[t.photoCount].push(t.id)
}

// ── Types ────────────────────────────────────────────────────────────────────
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
  photoAssignment: Record<string, string>
  caption: string | null
  captionStyle: CaptionStyle
}

type GuidedPageStyle = {
  pageIndex: number
  background: string
  caption: string | null
  captionStyle?: Partial<CaptionStyle> | null
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
  newTextElements: Array<unknown>
}

// ── Validation ────────────────────────────────────────────────────────────────
function isValidGenerateResponse(obj: unknown): obj is { pages: GeneratePage[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length === 0) return false
  for (const page of o.pages as GeneratePage[]) {
    if (typeof page.template !== 'string') return false
    if (!(page.template in TEMPLATE_MAP)) {
      console.warn('Unknown template id from AI:', page.template)
      return false
    }
    if (typeof page.background !== 'string') return false
    if (!page.photoAssignment || typeof page.photoAssignment !== 'object') return false
    const tmpl = TEMPLATE_MAP[page.template]
    for (const slot of tmpl.slots) {
      if (!page.photoAssignment[slot.key]) {
        console.warn(`Missing slot key "${slot.key}" for template "${page.template}"`)
        return false
      }
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

function isValidGuidedGenerateResponse(obj: unknown, expectedPages: number): obj is { pages: GuidedPageStyle[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length !== expectedPages) return false
  for (const page of o.pages as GuidedPageStyle[]) {
    if (typeof page.pageIndex !== 'number') return false
    if (page.pageIndex < 0 || page.pageIndex >= expectedPages) return false
    if (typeof page.background !== 'string') return false
    if (!(typeof page.caption === 'string' || page.caption === null)) return false
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
      fit: 'contain',
      x: Math.round(slot.xP * canvasW),
      y: Math.round(slot.yP * canvasH),
      width: Math.round(slot.wP * canvasW),
      height: Math.round(slot.hP * canvasH),
      rotation: slot.rot ?? 0,
    })
  }

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

/**
 * IMPROVED: Clearer template menu, explicit photo-count table, strict variety rules,
 * photo quality guidance, and a worked example to anchor the AI's output format.
 */
function buildGenerateSystemPrompt(canvasW: number, canvasH: number): string {
  // Build photo-count table
  const countTable = Object.entries(TEMPLATES_BY_COUNT)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([count, ids]) =>
      `  ${count} photo${Number(count) > 1 ? 's' : ''}: ${ids.map(id => `"${id}"`).join(', ')}`
    ).join('\n')

  // Full template menu
  const templateMenu = TEMPLATES
    .map(t =>
      `  "${t.id}" [${t.photoCount}-photo] — ${t.description}`
    ).join('\n')

  const templateMenuWithSlots = TEMPLATES
    .map((template) => {
      const slotSummary = template.slots
        .map((slot) => `${slot.key} ${Math.round(slot.wP * canvasW)}x${Math.round(slot.hP * canvasH)}${slot.rot ? ` rot ${slot.rot}` : ''}`)
        .join(', ')
      return `  "${template.id}" [${template.photoCount}-photo] â€” ${template.description} Slots: ${slotSummary}`
    }).join('\n')

  return `You are a professional photo album layout designer. Your job is to plan a beautiful, varied multi-page album.

CANVAS: ${canvasW}×${canvasH}px

═══════════════════════════════════════════════════════
TEMPLATE LIBRARY — GROUPED BY PHOTO COUNT
Each template MUST receive EXACTLY the number of photos it specifies.
═══════════════════════════════════════════════════════
${templateMenuWithSlots}

PHOTO COUNT → VALID TEMPLATES (reference table):
${countTable}

═══════════════════════════════════════════════════════
FONTS — use EXACT strings only:
  "Playfair Display, serif"
  "Cormorant Garamond, serif"
  "Georgia, serif"
  "DM Sans, sans-serif"
  "Helvetica Neue, sans-serif"
  "Courier New, monospace"
═══════════════════════════════════════════════════════

TASK: Plan a complete multi-page album. For every page:
1. Choose a template from the library above
2. Assign exactly the right number of photos to its slots
3. Choose a background colour
4. Optionally write a caption

OUTPUT FORMAT — raw JSON object only, no markdown, no explanation:
{
  "pages": [
    {
      "template": "<template-id>",
      "background": "<hex e.g. #1a1410>",
      "photoAssignment": { "A": "<photo-id>", "B": "<photo-id>" },
      "caption": "<3–8 evocative words>  OR  null",
      "captionStyle": {
        "fill": "<hex>",
        "fontFamily": "<exact font string>",
        "fontSize": <number 14–28>,
        "align": "center",
        "fontStyle": "italic"
      }
    }
  ]
}

═══════════════════════════════════════════════════════
STRICT RULES — violating these will break the album:
═══════════════════════════════════════════════════════

RULE 1 — SLOT KEYS MUST MATCH THE TEMPLATE EXACTLY.
  If a template has slots A and B, photoAssignment must have exactly keys "A" and "B".
  Never add extra keys. Never omit a key. Never guess slot names.

RULE 2 — PHOTO COUNT MUST MATCH THE TEMPLATE.
  "side-by-side" needs exactly 2 photos. "three-col" needs exactly 3.
  Never put 2 photos in a 3-photo template. Never put 3 in a 2-photo template.

RULE 3 — USE EVERY PROVIDED PHOTO AT LEAST ONCE across all pages combined.

RULE 4 — VARIETY IS MANDATORY.
  • No two consecutive pages may use the same template.
  • Use at least 4 different templates across the whole album.
  • Mix 1-photo and multi-photo pages — do not use only multi-photo pages.
  • Mix scrapbook-style and grid-style layouts across the album.

RULE 5 — ALBUM STRUCTURE.
  • First page: use "hero-caption" or "full-bleed" (strong opening image + optional caption).
  • Last page: use "hero-caption" or "centered-mat" (elegant close, with caption).
  • Middle pages: vary freely between all template types.

RULE 6 — BACKGROUND + TEXT CONTRAST.
  • Dark background (#1a1410, #0f0f0f, #1e1a2e, etc.) → light text (#f4f0ea, #e8e0d0, #ffffff).
  • Light background (#f5f0eb, #fffef9, etc.) → dark text (#1a1410, #2a2010).
  • Never use background and text colours that are too similar.

RULE 7 — CAPTIONS — USE SPARINGLY.
  • Add captions only on: first page, last page, "hero-caption" template, and at most one middle page.
  • Do NOT add captions to "full-bleed", "quad-grid", "filmstrip", or "three-col" templates.
  • Caption text must be 3–8 evocative words, written in the mood/style requested.
  • For pages without captions, set "caption": null.

RULE 8 — PHOTO QUALITY.
  • Never place the same photo in two slots on the same page.
  • Photos are always crop-fitted (object-fit: cover) — never stretched.
  • Prefer placing portrait-orientation photos in tall/narrow slots and landscape photos in wide slots.

CRITICAL: Respond with ONLY the raw JSON object. No markdown, no code fences, no text before or after.`
}

function buildGuidedStyleSystemPrompt(): string {
  return `You are an expert photo album stylist.
You are styling pages that already have fixed photo layouts.
You MUST keep the existing layout structure exactly as-is. Do not invent new layouts.

OUTPUT — valid JSON only, no markdown, no code fences:
{
  "pages": [
    {
      "pageIndex": <number>,
      "background": "<hex-color>",
      "caption": "<0-8 evocative words>" OR null,
      "captionStyle": {
        "fill": "<hex-color>",
        "fontFamily": "<exact font string>",
        "fontSize": <number 14-28>,
        "align": "<left|center|right>",
        "fontStyle": "<italic|bold|>"
      }
    }
  ]
}

FONTS — use EXACT strings only:
  "Playfair Display, serif"
  "Cormorant Garamond, serif"
  "Georgia, serif"
  "DM Sans, sans-serif"
  "Helvetica Neue, sans-serif"
  "Courier New, monospace"

RULES:
1. Return exactly one object per page index requested.
2. Backgrounds should feel cohesive across the full album.
3. Captions are optional and should be sparse.
4. Dark background -> light text. Light background -> dark text.
5. Do not describe or change layout positions in any way.

CRITICAL: Respond with ONLY the raw JSON object. No markdown, no code fences, no text.`
}

const REFINE_SYSTEM_PROMPT = `You are an expert photo album stylist.
You receive a description of an existing album layout and must RESTYLE it — changing
backgrounds, fonts, colours, and captions — WITHOUT moving or resizing any photo element.

FONTS — use EXACT strings only:
  "Playfair Display, serif" | "Cormorant Garamond, serif" | "Georgia, serif"
  "DM Sans, sans-serif" | "Helvetica Neue, sans-serif" | "Courier New, monospace"

OUTPUT — valid JSON only, no markdown, no code fences:
{
  "pages": [
    {
      "pageIndex": <number>,
      "background": "<hex-color>",
      "textUpdates": [
        {
          "elementId": "<existing element id>",
          "text": "<improved caption>",
          "fontSize": <number>,
          "fill": "<hex-color>",
          "fontFamily": "<exact font string>",
          "fontStyle": "<italic|bold|>",
          "align": "<left|center|right>",
          "lineHeight": <number 1.2–1.8>,
          "rotation": 0
        }
      ],
      "newTextElements": []
    }
  ]
}

RULES:
1. NEVER touch image elements.
2. NEVER change x, y, width, height of any element.
3. Update background for EVERY page — make each page feel part of a cohesive palette.
4. Improve ALL existing text elements to match the new mood.
5. "newTextElements" must always be an empty array.
6. Dark background → light text. Light background → dark text. Strong contrast always.

CRITICAL: Respond with ONLY the raw JSON object. No markdown, no code fences, no text.`

// ── JSON extractor ───────────────────────────────────────────────────────────
function extractJSON(raw: string): string {
  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  if (fenceStripped.startsWith('{')) return fenceStripped

  const start = raw.indexOf('{')
  if (start === -1) return raw
  let depth = 0
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return raw.slice(start)
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
const RATE_LIMIT = 30
const RATE_WINDOW = 5 * 60_000

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const cutoffIso = new Date(Date.now() - RATE_WINDOW).toISOString()
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('used_at', cutoffIso)

  if (countError) {
    console.error('AI usage count failed:', countError)
    return false
  }

  if ((count ?? 0) >= RATE_LIMIT) return false

  const { error: insertError } = await supabase
    .from('ai_usage')
    .insert({ user_id: userId, tier: 2 })

  if (insertError) {
    console.error('AI usage insert failed:', insertError)
    return false
  }

  return true
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

type InputPhoto = { id: string; url: string; width: number; height: number }

function isValidPhotoArray(value: unknown): value is InputPhoto[] {
  if (!Array.isArray(value) || value.length === 0) return false
  return value.every((p) => {
    if (!p || typeof p !== 'object') return false
    const photo = p as Record<string, unknown>
    return (
      typeof photo.id === 'string' &&
      photo.id.trim().length > 0 &&
      typeof photo.url === 'string' &&
      photo.url.startsWith('http') &&
      typeof photo.width === 'number' &&
      Number.isFinite(photo.width) &&
      photo.width > 0 &&
      typeof photo.height === 'number' &&
      Number.isFinite(photo.height) &&
      photo.height > 0
    )
  })
}

// ── Main handler ──────────────────────────────────────────────────────────────
type ExistingLayoutPage = {
  sourceIndex: number
  background: string
  imageElements: Array<Record<string, any>>
  textElements: Array<Record<string, any>>
  otherElements: Array<Record<string, any>>
}

function getAspectRatio(width: number, height: number): number {
  return width > 0 && height > 0 ? width / height : 1
}

function normalizeCaptionStyle(style?: Partial<CaptionStyle> | null): CaptionStyle {
  return {
    fill: style?.fill || '#f4f0ea',
    fontFamily: style?.fontFamily || 'Georgia, serif',
    fontSize: Math.max(14, Math.min(28, Number(style?.fontSize) || 18)),
    align: style?.align === 'left' || style?.align === 'right' ? style.align : 'center',
    fontStyle: style?.fontStyle || 'italic',
  }
}

function extractExistingLayouts(currentPages: any[]): ExistingLayoutPage[] {
  return currentPages
    .map((page, index) => {
      const imageElements = Array.isArray(page?.elements)
        ? page.elements.filter((el: any) => el?.type === 'image' && typeof el.x === 'number' && typeof el.y === 'number' && typeof el.width === 'number' && typeof el.height === 'number')
        : []
      const textElements = Array.isArray(page?.elements)
        ? page.elements.filter((el: any) => el?.type === 'text')
        : []
      const otherElements = Array.isArray(page?.elements)
        ? page.elements.filter((el: any) => el?.type !== 'image' && el?.type !== 'text')
        : []

      return {
        sourceIndex: index,
        background: typeof page?.background === 'string' ? page.background : '#0f0f0f',
        imageElements,
        textElements,
        otherElements,
      }
    })
    .filter((page) => page.imageElements.length > 0)
}

function buildGuidedPages(layouts: ExistingLayoutPage[], photos: InputPhoto[]): ExistingLayoutPage[] {
  const guidedPages: ExistingLayoutPage[] = []
  let remainingSlots = 0

  while (remainingSlots < photos.length) {
    for (const layout of layouts) {
      guidedPages.push(layout)
      remainingSlots += layout.imageElements.length
      if (remainingSlots >= photos.length) break
    }
  }

  return guidedPages.length > 0 ? guidedPages : layouts
}

function buildGuidedStyleUserPrompt(
  guidedPages: ExistingLayoutPage[],
  photos: InputPhoto[],
  prompt: string,
  canvasW: number,
  canvasH: number,
): string {
  const pageSummary = guidedPages.map((page, pageIndex) => {
    const slotSummary = page.imageElements
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .map((el, slotIndex) => {
        const ratio = getAspectRatio(el.width, el.height)
        const shape = ratio > 1.12 ? 'landscape' : ratio < 0.88 ? 'portrait' : 'square'
        return `slot ${slotIndex + 1}: ${Math.round(el.width)}x${Math.round(el.height)} ${shape}`
      })
      .join(', ')

    return `Page ${pageIndex} follows existing layout ${page.sourceIndex}. Background now "${page.background}". Slots: ${slotSummary}. Existing text boxes: ${page.textElements.length}.`
  }).join('\n')

  const photoSummary = photos
    .map((photo, index) => {
      const ratio = getAspectRatio(photo.width, photo.height)
      const shape = ratio > 1.12 ? 'landscape' : ratio < 0.88 ? 'portrait' : 'square'
      return `Photo ${index + 1}: "${photo.id}" ${photo.width}x${photo.height} ${shape}`
    })
    .join('\n')

  return `Style direction: "${prompt || 'clean, modern, editorial'}"

Canvas: ${canvasW}x${canvasH}
You are styling ${guidedPages.length} pages that already have fixed photo layouts.

Photos that will be placed into those fixed slots:
${photoSummary}

Existing page layout summary:
${pageSummary}

Return exactly ${guidedPages.length} page style objects.
Use elegant, cohesive backgrounds and sparse captions.
Captions should work with the user mood and the preserved layout.
Return ONLY the JSON object.`
}

function pickBestPhotoIndex(slot: { width: number; height: number }, pool: InputPhoto[]): number {
  const slotRatio = getAspectRatio(slot.width, slot.height)
  let bestIndex = 0
  let bestScore = Number.POSITIVE_INFINITY

  for (let i = 0; i < pool.length; i++) {
    const photo = pool[i]
    const photoRatio = getAspectRatio(photo.width, photo.height)
    const score = Math.abs(Math.log(photoRatio / slotRatio))
    if (score < bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

function buildCaptionElement(
  canvasW: number,
  canvasH: number,
  caption: string,
  captionStyle: CaptionStyle,
): Record<string, any> {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    text: caption,
    x: Math.round(M * canvasW),
    y: Math.round(0.88 * canvasH),
    width: Math.round((1 - M * 2) * canvasW),
    height: Math.round(0.09 * canvasH),
    fontSize: captionStyle.fontSize,
    fill: captionStyle.fill,
    fontFamily: captionStyle.fontFamily,
    fontStyle: captionStyle.fontStyle,
    align: captionStyle.align,
    lineHeight: 1.4,
    rotation: 0,
  }
}

function applyGuidedLayoutGeneration(
  guidedPages: ExistingLayoutPage[],
  styles: GuidedPageStyle[],
  photos: InputPhoto[],
  canvasW: number,
  canvasH: number,
): Array<Record<string, any>> {
  const unusedPhotos = [...photos]
  const styleMap = new Map(styles.map((style) => [style.pageIndex, style]))

  return guidedPages.map((layoutPage, pageIndex) => {
    const style = styleMap.get(pageIndex)
    const imageElements = layoutPage.imageElements
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .map((imageEl) => {
        const pool = unusedPhotos.length > 0 ? unusedPhotos : photos
        const bestIndex = pickBestPhotoIndex({ width: Number(imageEl.width), height: Number(imageEl.height) }, pool)
        const chosen = pool[bestIndex]
        if (unusedPhotos.length > 0) {
          const removeIndex = unusedPhotos.findIndex((photo) => photo.id === chosen.id)
          if (removeIndex >= 0) unusedPhotos.splice(removeIndex, 1)
        }

        return {
          ...imageEl,
          id: crypto.randomUUID(),
          type: 'image',
          photoId: chosen.id,
          url: chosen.url,
          fit: 'contain',
        }
      })

    const existingText = layoutPage.textElements
    const caption = style?.caption?.trim() || null
    const captionStyle = normalizeCaptionStyle(style?.captionStyle)
    const textElements: Array<Record<string, any>> = existingText.map((textEl, index) => {
      if (index !== 0 || !caption) return { ...textEl, id: crypto.randomUUID() }
      return {
        ...textEl,
        id: crypto.randomUUID(),
        text: caption,
        fontSize: captionStyle.fontSize,
        fill: captionStyle.fill,
        fontFamily: captionStyle.fontFamily,
        fontStyle: captionStyle.fontStyle,
        align: captionStyle.align,
        lineHeight: 1.4,
      }
    })

    if (caption && textElements.length === 0) {
      textElements.push(buildCaptionElement(canvasW, canvasH, caption, captionStyle))
    }

    return {
      id: crypto.randomUUID(),
      background: style?.background || layoutPage.background || '#0f0f0f',
      elements: [
        ...imageElements,
        ...layoutPage.otherElements.map((element) => ({ ...element, id: crypto.randomUUID() })),
        ...textElements,
      ],
    }
  })
}

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
  const allowed = await checkRateLimit(supabase, user.id)
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

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

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

  const isRefineMode = mode === 'refine'
  const isGenerateMode = mode === 'generate' || !mode
  if (!isRefineMode && !isGenerateMode) {
    return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 })
  }

  if (typeof canvasW !== 'number' || typeof canvasH !== 'number' || canvasW < 200 || canvasH < 200 || canvasW > 3000 || canvasH > 3000) {
    return NextResponse.json({ error: 'Invalid canvas dimensions.' }, { status: 400 })
  }

  if (!isRefineMode && !isValidPhotoArray(photos)) {
    return NextResponse.json({ error: 'Invalid photos payload.' }, { status: 400 })
  }

  if (pageCount !== undefined && (typeof pageCount !== 'number' || pageCount < 1 || pageCount > 50)) {
    return NextResponse.json({ error: 'Invalid page count.' }, { status: 400 })
  }

  // ════════════════════════════════════════════════════════════════════
  // REFINE MODE
  // ════════════════════════════════════════════════════════════════════
  if (isRefineMode) {
    if (!currentPages || !Array.isArray(currentPages) || currentPages.length === 0) {
      return NextResponse.json({ error: 'No existing pages to refine.' }, { status: 400 })
    }

    const styleInstruction = sanitizedPrompt
      ? `Style direction: "${sanitizedPrompt}". Apply this mood to every design decision.`
      : 'Refine with a clean, modern editorial style.'

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
          temperature: 0,
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

      let refinement: unknown
      try { refinement = JSON.parse(cleaned) } catch {
        console.error('Refine JSON parse failed. Raw:', rawText.slice(0, 800))
        throw new Error('AI returned an invalid response. Please try again.')
      }

      if (!isValidRefineResponse(refinement)) {
        console.error('Refine validation failed:', JSON.stringify(refinement).slice(0, 500))
        throw new Error('AI response structure was invalid. Please try again.')
      }

      const refinedPages = currentPages.map((page: any, pageIndex: number) => {
        const update = (refinement as { pages: RefinePageUpdate[] }).pages.find(
          (p: RefinePageUpdate) => p.pageIndex === pageIndex
        )
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
  // GENERATE MODE
  // ════════════════════════════════════════════════════════════════════
  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided. Upload at least one photo first.' }, { status: 400 })
  }

  const photoUrlMap: Record<string, string> = {}
  for (const p of photos) { photoUrlMap[p.id] = p.url }

  const existingLayouts = Array.isArray(currentPages) ? extractExistingLayouts(currentPages) : []
  if (existingLayouts.length > 0) {
    const guidedPages = buildGuidedPages(existingLayouts, photos)
    const guidedPrompt = buildGuidedStyleUserPrompt(guidedPages, photos, sanitizedPrompt, canvasW, canvasH)

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
          max_tokens: 4096,
          temperature: 0.3,
          system: buildGuidedStyleSystemPrompt(),
          messages: [{ role: 'user', content: guidedPrompt }],
        }),
      })

      if (!res.ok) {
        const txt = await res.text()
        console.error('Claude guided-generate error:', res.status, txt)
        if (res.status === 529 || res.status === 503)
          throw new Error('AI service is overloaded. Please try again in a moment.')
        throw new Error(`AI service error (${res.status})`)
      }

      const data = await res.json()
      const rawText: string = data.content?.[0]?.text || ''
      const cleaned = extractJSON(rawText)

      let styled: unknown
      try { styled = JSON.parse(cleaned) } catch {
        console.error('Guided generate JSON parse failed. Raw:', rawText.slice(0, 800))
        throw new Error('AI returned an invalid response. Please try again.')
      }

      if (!isValidGuidedGenerateResponse(styled, guidedPages.length)) {
        console.error('Guided generate validation failed:', JSON.stringify(styled).slice(0, 600))
        throw new Error('AI response structure was invalid. Please try again.')
      }

      const pages = applyGuidedLayoutGeneration(
        guidedPages,
        (styled as { pages: GuidedPageStyle[] }).pages,
        photos,
        canvasW,
        canvasH,
      )

      return NextResponse.json({ pages })
    } catch (err: any) {
      console.error('AI guided generate error:', err)
      return NextResponse.json({ error: err.message || 'Could not generate the album from the existing layout.' }, { status: 500 })
    }
  }

  const targetPages = Math.max(
    Math.min(pageCount || Math.ceil(photos.length / 2), 12),
    1
  )

  const styleInstruction = sanitizedPrompt
    ? `MOOD/STYLE REQUESTED: "${sanitizedPrompt}" — let this guide every choice: templates, colours, caption tone, font selection.`
    : 'MOOD/STYLE: clean, modern, editorial.'

  // Build a per-photo-count summary for the user message, so the AI knows its options
  const templateChoiceGuide = Object.entries(TEMPLATES_BY_COUNT)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([count, ids]) => `  For ${count}-photo page: ${ids.join(', ')}`)
    .join('\n')

  const systemPrompt = buildGenerateSystemPrompt(canvasW, canvasH)

  const userMsg = `${styleInstruction}

PHOTOS (use every ID at least once across all pages):
${photos.map((p: any, i: number) => {
  const ratio = getAspectRatio(p.width, p.height)
  const shape = ratio > 1.12 ? 'landscape' : ratio < 0.88 ? 'portrait' : 'square'
  return `  Photo ${i + 1}: "${p.id}" ${p.width}x${p.height} ${shape}`
}).join('\n')}

TARGET: ${targetPages} pages total, using all ${photos.length} photos.

TEMPLATE SELECTION GUIDE:
${templateChoiceGuide}

DISTRIBUTION HINT: With ${photos.length} photos over ${targetPages} pages, aim for roughly ${(photos.length / targetPages).toFixed(1)} photos per page on average. Mix pages with different photo counts.

REMINDER OF KEY RULES:
- photoAssignment slot keys must EXACTLY match the chosen template's slots
- No two consecutive pages may use the same template
- First page: "hero-caption" or "full-bleed"
- Last page: "hero-caption" or "centered-mat" with a caption
- Use at least 4 different templates

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
        // Lowered from 1 → 0.7 for more reliable JSON structure
        temperature: 0.3,
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

    let layout: unknown
    try { layout = JSON.parse(cleaned) } catch {
      console.error('Generate JSON parse failed. Raw:', rawText.slice(0, 800))
      throw new Error('AI returned an invalid response. Please try again.')
    }

    if (!isValidGenerateResponse(layout)) {
      console.error('Generate validation failed:', JSON.stringify(layout).slice(0, 600))
      throw new Error('AI response structure was invalid. Please try again.')
    }

    const defaultCaptionStyle: CaptionStyle = {
      fill: '#f4f0ea',
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      align: 'center',
      fontStyle: 'italic',
    }

    const pages = (layout as { pages: GeneratePage[] }).pages.map((p: GeneratePage) => {
      const template = TEMPLATE_MAP[p.template]

      if (!template) {
        // Graceful fallback: full-bleed with first assigned photo
        const firstId = Object.values(p.photoAssignment)[0]
        return {
          id: crypto.randomUUID(),
          background: p.background || '#0f0f0f',
          elements: firstId ? [{
            id: crypto.randomUUID(),
            type: 'image',
            photoId: firstId,
            url: photoUrlMap[firstId] || '',
            fit: 'contain',
            x: 0, y: 0, width: canvasW, height: canvasH,
            rotation: 0,
          }] : [],
        }
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

