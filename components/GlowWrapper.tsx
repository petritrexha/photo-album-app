'use client'
import { usePathname } from 'next/navigation'
import GlowBackground from './GlowBackground'

export default function GlowWrapper() {
  const pathname = usePathname()
  return <GlowBackground pathname={pathname ?? '/'} />
}
