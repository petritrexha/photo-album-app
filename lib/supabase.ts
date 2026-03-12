import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Album = {
  id: string; user_id: string; title: string; cover_url: string | null
  pages: Page[]; created_at: string; updated_at: string
}
export type Page = { id: string; background: string; elements: PageElement[] }
export type PageElement = {
  id: string; type: 'image' | 'text' | 'frame'
  url?: string; photoId?: string; frameId?: string
  text?: string; fontSize?: number; fill?: string
  fontFamily?: string; fontStyle?: string
  align?: 'left' | 'center' | 'right'; lineHeight?: number
  x: number; y: number; width: number; height: number; rotation: number
}
export type Photo = {
  id: string; album_id: string | null; user_id: string
  url: string; cloudinary_id: string | null
  width: number; height: number; created_at: string
}
export type Frame = {
  id: string; album_id: string | null; user_id: string
  url: string; cloudinary_id: string | null
  name: string; width: number; height: number; created_at: string
}