import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteCloudinaryImage } from '@/lib/server/cloudinary'

export const runtime = 'nodejs'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const frameId = params.id
  if (!frameId) {
    return NextResponse.json({ error: 'Missing frame id.' }, { status: 400 })
  }

  const { data: frame } = await supabase
    .from('frames')
    .select('id, cloudinary_id')
    .eq('id', frameId)
    .eq('user_id', user.id)
    .single()

  if (!frame) {
    return NextResponse.json({ error: 'Frame not found.' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('frames')
    .delete()
    .eq('id', frameId)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete frame.' }, { status: 500 })
  }

  let cleanupWarning: string | null = null
  if (frame.cloudinary_id) {
    try {
      await deleteCloudinaryImage(frame.cloudinary_id)
    } catch (err) {
      console.error('Frame Cloudinary cleanup failed:', err)
      cleanupWarning = 'Frame deleted, but cloud asset cleanup failed.'
    }
  }

  return NextResponse.json({ ok: true, cleanupWarning })
}

