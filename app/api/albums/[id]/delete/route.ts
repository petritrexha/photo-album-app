import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteCloudinaryImages } from '@/lib/server/cloudinary'

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

  const albumId = params.id
  if (!albumId) {
    return NextResponse.json({ error: 'Missing album id.' }, { status: 400 })
  }

  const { data: album } = await supabase
    .from('albums')
    .select('id')
    .eq('id', albumId)
    .eq('user_id', user.id)
    .single()

  if (!album) {
    return NextResponse.json({ error: 'Album not found.' }, { status: 404 })
  }

  const [{ data: photos }, { data: frames }] = await Promise.all([
    supabase.from('photos').select('cloudinary_id').eq('album_id', albumId),
    supabase.from('frames').select('cloudinary_id').eq('album_id', albumId),
  ])

  const { error: deleteError } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete album.' }, { status: 500 })
  }

  const publicIds = [
    ...(photos ?? []).map((p) => p.cloudinary_id).filter(Boolean),
    ...(frames ?? []).map((f) => f.cloudinary_id).filter(Boolean),
  ] as string[]

  let cleanupWarning: string | null = null
  if (publicIds.length > 0) {
    try {
      await deleteCloudinaryImages(publicIds)
    } catch (err) {
      console.error('Album Cloudinary cleanup failed:', err)
      cleanupWarning = 'Album deleted, but some cloud assets could not be cleaned up.'
    }
  }

  return NextResponse.json({ ok: true, cleanupWarning })
}

