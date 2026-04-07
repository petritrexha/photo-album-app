import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signCloudinaryParams } from '@/lib/server/cloudinary'

export const runtime = 'nodejs'

const ALLOWED_FOLDERS = new Set(['photo-album-app', 'photo-album-app/frames'])

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
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

  const body = await req.json().catch(() => ({}))
  const folder = typeof body.folder === 'string' ? body.folder : 'photo-album-app'
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: 'Invalid upload folder.' }, { status: 400 })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const { signature, apiKey, cloudName } = signCloudinaryParams({ folder, timestamp })

  return NextResponse.json({
    cloudName,
    apiKey,
    folder,
    timestamp,
    signature,
  })
}

