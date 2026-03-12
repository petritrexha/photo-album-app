const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

export type CloudinaryResult = { public_id: string; secure_url: string; width: number; height: number }

export async function uploadToCloudinary(file: File): Promise<CloudinaryResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'photo-album-app')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return { public_id: data.public_id, secure_url: data.secure_url, width: data.width, height: data.height }
}

export function getPrintUrl(url: string) {
  return url.replace('/upload/', '/upload/q_100,f_png/')
}