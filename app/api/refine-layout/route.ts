import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CANVAS_W = 800
const CANVAS_H = 600

export async function POST(req: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated. Please sign in.' }, { status: 401 })
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

  // ── Parse body ─────────────────────────────────────────────────
  const { elements, prompt } = await req.json()

  if (!elements || !prompt) {
    return NextResponse.json(
      { error: 'Missing elements or instruction. Please try again.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please contact the administrator.' },
      { status: 500 }
    )
  }

  const systemPrompt = `You are a canvas layout assistant for a photo album editor.
The canvas is ${CANVAS_W}x${CANVAS_H}px. You will receive the current elements on the page as JSON and a user instruction.
Reposition and resize the elements according to the instruction.

RULES:
- Keep all elements within the canvas (x >= 0, y >= 0, x+width <= ${CANVAS_W}, y+height <= ${CANVAS_H})
- Preserve every element's id, type, url, photoId, text, and all other non-layout properties exactly
- Only modify x, y, width, height, rotation
- Return ONLY a valid JSON array of the updated elements, no explanation, no markdown, no code fences`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Current elements:\n${JSON.stringify(elements, null, 2)}\n\nInstruction: ${prompt}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Claude API error:', res.status, errBody)
      if (res.status === 529 || res.status === 503) {
        throw new Error('AI service is temporarily overloaded. Please try again in a moment.')
      }
      throw new Error(`AI service error (${res.status})`)
    }

    const data = await res.json()
    const text: string = data.content?.[0]?.text || ''

    // Strip markdown fences
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    let updatedElements: unknown
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      updatedElements = JSON.parse(arrayMatch[0])
    } else {
      const parsed = JSON.parse(cleaned)
      updatedElements = Array.isArray(parsed) ? parsed : parsed.elements ?? parsed
    }

    if (!Array.isArray(updatedElements)) {
      throw new Error('AI returned an invalid response structure. Please try again.')
    }

    return NextResponse.json({ elements: updatedElements })

  } catch (err: any) {
    console.error('Refine layout error:', err)
    return NextResponse.json(
      { error: err.message || 'Could not reposition elements. Please try again.' },
      { status: 500 }
    )
  }
}
