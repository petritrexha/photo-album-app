import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CANVAS_W = 800
const CANVAS_H = 600
const MARGIN = 32

// ── Rate limiter — more lenient for production use ─────────────────
// NOTE: In-memory only — resets on Vercel cold start.
// For persistent rate limiting, replace with Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT  = 30          // 30 requests …
const RATE_WINDOW = 5 * 60_000  // … per 5 minutes per user

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// ── Schema validation ──────────────────────────────────────────────
function isValidLayout(obj: unknown): obj is { pages: any[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length === 0) return false
  for (const page of o.pages) {
    if (!page || typeof page !== 'object') return false
    if (!Array.isArray(page.elements)) return false
    if (typeof page.background !== 'string') return false
    for (const el of page.elements) {
      if (!el || typeof el !== 'object') return false
      if (el.type !== 'image' && el.type !== 'text') return false
      if (typeof el.x !== 'number' || typeof el.y !== 'number') return false
      if (typeof el.width !== 'number' || typeof el.height !== 'number') return false
    }
  }
  return true
}

function isValidRefinement(obj: unknown): obj is { pages: any[] } {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.pages) || o.pages.length === 0) return false
  for (const page of o.pages) {
    if (!page || typeof page !== 'object') return false
    if (typeof page.background !== 'string') return false
    if (!Array.isArray(page.textUpdates)) return false
  }
  return true
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

export async function POST(req: NextRequest) {
  // 1. Auth check — use getUser with the Bearer token
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json(
      { error: 'Not authenticated. Please sign in and try again.' },
      { status: 401 }
    )
  }

  // Create a Supabase client that uses the user's token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  )

  // Validate the session — getUser() verifies against Supabase auth server
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Session expired. Please sign in again.' },
      { status: 401 }
    )
  }

  // 2. Rate limit
  const { allowed, remaining } = checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'You have made too many AI requests. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // 3. Parse body
  const body = await req.json()
  const { photos, pageCount, prompt, mode, currentPages } = body

  // 4. Sanitize prompt
  const sanitizedPrompt = prompt
    ? prompt.replace(/[<>{}]/g, '').slice(0, 500)
    : null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact the administrator.' },
      { status: 500 }
    )
  }

  // ── REFINE MODE ──────────────────────────────────────────────────
  if (mode === 'refine') {
    if (!currentPages || !Array.isArray(currentPages) || currentPages.length === 0) {
      return NextResponse.json(
        { error: 'No existing pages to refine. Generate the album first.' },
        { status: 400 }
      )
    }

    const styleInstruction = sanitizedPrompt
      ? `The user wants this style/mood: "${sanitizedPrompt}". Apply it to all design decisions below.`
      : 'Refine the album with a clean, modern editorial style.'

    const refineSystemPrompt = `You are an expert photo album designer. You will receive a description of photo album pages currently on the canvas. Your job is to REFINE the style — changing backgrounds, text captions, font families, font sizes, text colors, and rotations — WITHOUT moving or removing any photos or changing their positions/sizes.

You output ONLY valid JSON — no markdown fences, no explanation, no other text.

Output schema:
{
  "pages": [
    {
      "pageIndex": number,
      "background": "hex color string",
      "textUpdates": [
        {
          "elementId": "string (the existing element id)",
          "text": "new caption string",
          "fontSize": number,
          "fill": "hex color",
          "fontFamily": "string",
          "fontStyle": "italic|bold|empty string",
          "align": "left|center|right",
          "lineHeight": number,
          "rotation": number
        }
      ],
      "newTextElements": [
        {
          "id": "string (new uid like t1, t2...)",
          "type": "text",
          "text": "string",
          "x": number,
          "y": number,
          "width": number,
          "height": number,
          "fontSize": number,
          "fill": "hex color",
          "fontFamily": "string",
          "fontStyle": "string",
          "align": "left|center|right",
          "lineHeight": number,
          "rotation": number
        }
      ]
    }
  ]
}

Font options: "Playfair Display, serif" | "DM Sans, sans-serif" | "Georgia, serif" | "Helvetica Neue, sans-serif" | "Courier New, monospace"
Canvas: ${CANVAS_W}x${CANVAS_H}px
Output ONLY the JSON object. Nothing else.`

    const pageDescriptions = currentPages.map((page: any, i: number) => {
      const existingTexts = page.elements
        .filter((el: any) => el.type === 'text')
        .map((el: any) => `    - text element id="${el.id}" current text="${el.text}" at x=${Math.round(el.x)} y=${Math.round(el.y)} w=${Math.round(el.width)}`)
        .join('\n')
      const photoCount = page.elements.filter((el: any) => el.type === 'image').length
      return `Page ${i} (pageIndex: ${i}): background="${page.background}", ${photoCount} photo(s)\n  Existing text elements:\n${existingTexts || '    (none)'}`
    }).join('\n\n')

    const refineUserMessage = `${styleInstruction}

Here are the current album pages:

${pageDescriptions}

Refine the style of all ${currentPages.length} pages. For each page provide a new background color, update all existing text elements with better captions and styling, and optionally add new text elements. Do NOT add image elements. Do NOT change photo positions or sizes.`

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
          system: refineSystemPrompt,
          messages: [{ role: 'user', content: refineUserMessage }],
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.error('Claude refine error:', res.status, errBody)
        if (res.status === 529 || res.status === 503) {
          throw new Error('The AI service is temporarily overloaded. Please try again in a moment.')
        }
        throw new Error(`AI service error (${res.status})`)
      }

      const data = await res.json()
      const rawText: string = data.content?.[0]?.text || ''
      const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

      let refinement: unknown
      try {
        refinement = JSON.parse(cleaned)
      } catch {
        console.error('Refine JSON parse failed:', rawText.slice(0, 500))
        throw new Error('AI returned an invalid response. Please try again.')
      }

      if (!isValidRefinement(refinement)) {
        console.error('Refinement schema invalid:', JSON.stringify(refinement).slice(0, 500))
        throw new Error('AI response structure was invalid. Please try again.')
      }

      const refinedPages = currentPages.map((page: any, pageIndex: number) => {
        const update = (refinement as any).pages.find((p: any) => p.pageIndex === pageIndex)
        if (!update) return page

        const updatedElements = page.elements.map((el: any) => {
          if (el.type !== 'text') return el
          const textUpdate = update.textUpdates?.find((t: any) => t.elementId === el.id)
          if (!textUpdate) return el
          return {
            ...el,
            text: textUpdate.text ?? el.text,
            fontSize: textUpdate.fontSize ?? el.fontSize,
            fill: textUpdate.fill ?? el.fill,
            fontFamily: textUpdate.fontFamily ?? el.fontFamily,
            fontStyle: textUpdate.fontStyle ?? el.fontStyle,
            align: textUpdate.align ?? el.align,
            lineHeight: textUpdate.lineHeight ?? el.lineHeight,
            rotation: textUpdate.rotation ?? el.rotation,
          }
        })

        const newTextEls = (update.newTextElements || []).map((el: any) => ({
          ...el,
          id: crypto.randomUUID(),
          type: 'text' as const,
        }))

        return {
          ...page,
          background: update.background ?? page.background,
          elements: [...updatedElements, ...newTextEls],
        }
      })

      return NextResponse.json({ pages: refinedPages })

    } catch (err: any) {
      console.error('AI refine error:', err)
      return NextResponse.json(
        { error: err.message || 'Could not refine the album. Please try again.' },
        { status: 500 }
      )
    }
  }

  // ── GENERATE MODE ────────────────────────────────────────────────
  if (!photos || photos.length === 0) {
    return NextResponse.json(
      { error: 'No photos provided. Please upload at least one photo first.' },
      { status: 400 }
    )
  }

  const generateStyleInstruction = sanitizedPrompt
    ? `The user wants this style/mood: "${sanitizedPrompt}". Apply this to every design decision — colors, fonts, spacing, layout style, caption tone.`
    : 'Use a clean, modern editorial style.'

  const generateSystemPrompt = `You are an expert photo album designer. You output ONLY valid JSON — no markdown fences, no explanation, no text before or after the JSON object.

The JSON must strictly follow this schema:
{
  "pages": [
    {
      "id": "string (uid)",
      "background": "string (hex color like #1a1a1a)",
      "elements": [
        {
          "id": "string (uid)",
          "type": "image",
          "photoId": "string (exact photo id from the provided list)",
          "url": "__PLACEHOLDER__",
          "x": number,
          "y": number,
          "width": number,
          "height": number,
          "rotation": number
        },
        {
          "id": "string (uid)",
          "type": "text",
          "text": "string (short evocative caption 3–8 words)",
          "x": number,
          "y": number,
          "width": number,
          "height": number,
          "fontSize": number,
          "fill": "string (hex color)",
          "fontFamily": "string",
          "fontStyle": "string (e.g. italic, bold, or empty string)",
          "align": "left|center|right",
          "lineHeight": number,
          "rotation": number
        }
      ]
    }
  ]
}

Design rules:
- Canvas: ${CANVAS_W}x${CANVAS_H}px, margin: ${MARGIN}px
- Vary layouts per page: single hero, two-column, three-photo grid, full-bleed, collage with slight rotations
- Background: any hex color matching the mood (dark, light, warm, cool)
- Font options: "Playfair Display, serif" | "DM Sans, sans-serif" | "Georgia, serif" | "Helvetica Neue, sans-serif" | "Courier New, monospace"
- Text color must contrast well with the background
- Slight rotations (−4 to 4 degrees) add personality for casual styles; keep 0 for minimal styles
- Leave breathing room — don't overcrowd pages
- Use ALL provided photo IDs across the pages
- UIDs: use simple sequential ids like "p1", "e1", "e2" etc.
- Output ONLY the JSON object. Nothing else.`

  const generateUserMessage = `${generateStyleInstruction}

Photos to use (use these exact IDs in photoId fields):
${photos.map((p: any) => `- id: "${p.id}"`).join('\n')}

Number of pages to generate: ${pageCount}

Generate exactly ${pageCount} pages. Distribute all photos across the pages.`

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
        system: generateSystemPrompt,
        messages: [{ role: 'user', content: generateUserMessage }],
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Claude API error:', res.status, errBody)
      if (res.status === 529 || res.status === 503) {
        throw new Error('The AI service is temporarily overloaded. Please try again in a moment.')
      }
      throw new Error(`AI service error (${res.status})`)
    }

    const data = await res.json()
    const rawText: string = data.content?.[0]?.text || ''
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    let layout: unknown
    try {
      layout = JSON.parse(cleaned)
    } catch {
      console.error('JSON parse failed. Raw text:', rawText.slice(0, 500))
      throw new Error('AI returned an invalid response. Please try again.')
    }

    if (!isValidLayout(layout)) {
      console.error('Layout schema validation failed:', JSON.stringify(layout).slice(0, 500))
      throw new Error('AI response structure was invalid. Please try again.')
    }

    // Replace __PLACEHOLDER__ URLs with real photo URLs
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

  } catch (err: any) {
    console.error('AI layout error:', err)
    return NextResponse.json(
      { error: err.message || 'Could not generate the album. Please try again.' },
      { status: 500 }
    )
  }
}
