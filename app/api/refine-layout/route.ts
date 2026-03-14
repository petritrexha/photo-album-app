import { NextRequest, NextResponse } from 'next/server'

const CANVAS_W = 800
const CANVAS_H = 600

export async function POST(req: NextRequest) {
  const { elements, prompt } = await req.json()
  if (!elements || !prompt) return NextResponse.json({ error: 'Missing elements or prompt' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

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
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Current elements:\n${JSON.stringify(elements, null, 2)}\n\nInstruction: ${prompt}` }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')
    const updatedElements = JSON.parse(jsonMatch[0])
    return NextResponse.json({ elements: updatedElements })
  } catch (err: any) {
    console.error('Refine layout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
