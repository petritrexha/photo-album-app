import { supabase } from './supabase'

type UploadFolder = 'photo-album-app' | 'photo-album-app/frames'

type SignedUpload = {
  cloudName: string
  apiKey: string
  folder: UploadFolder
  timestamp: number
  signature: string
}

export type CloudinaryResult = {
  public_id: string
  secure_url: string
  width: number
  height: number
}

async function getSignedUpload(folder: UploadFolder): Promise<SignedUpload> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('You must be signed in to upload files.')
  }

  const res = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ folder }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error || 'Could not initialize secure upload.')
  }

  return payload as SignedUpload
}

export async function uploadToCloudinary(
  file: File,
  folder: UploadFolder = 'photo-album-app',
  onProgress?: (percent: number) => void
): Promise<CloudinaryResult> {
  const signed = await getSignedUpload(folder)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', signed.folder)
  formData.append('timestamp', String(signed.timestamp))
  formData.append('api_key', signed.apiKey)
  formData.append('signature', signed.signature)

  return new Promise<CloudinaryResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve({
            public_id: data.public_id,
            secure_url: data.secure_url,
            width: data.width,
            height: data.height,
          })
        } catch {
          reject(new Error('Upload succeeded but response could not be parsed.'))
        }
      } else {
        reject(new Error('Upload failed.'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')))
    xhr.send(formData)
  })
}

export function getPrintUrl(url: string): string {
  return url.replace('/upload/', '/upload/q_100,f_png/')
}
