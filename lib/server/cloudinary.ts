import { createHash } from 'crypto'

type CloudinaryEnv = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

function getCloudinaryEnv(): CloudinaryEnv {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
  }

  return { cloudName, apiKey, apiSecret }
}

function toSignaturePayload(params: Record<string, string | number | boolean>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

export function signCloudinaryParams(params: Record<string, string | number | boolean>): { signature: string; apiKey: string; cloudName: string } {
  const { apiSecret, apiKey, cloudName } = getCloudinaryEnv()
  const payload = toSignaturePayload(params)
  const signature = createHash('sha1').update(payload + apiSecret).digest('hex')
  return { signature, apiKey, cloudName }
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000)
  const invalidate = true
  const { signature, apiKey, cloudName } = signCloudinaryParams({ public_id: publicId, timestamp, invalidate })

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
    invalidate: 'true',
  })

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudinary destroy failed (${res.status}): ${text}`)
  }
}

export async function deleteCloudinaryImages(publicIds: string[]): Promise<void> {
  const ids = Array.from(new Set(publicIds.filter(Boolean)))
  await Promise.all(ids.map((id) => deleteCloudinaryImage(id)))
}

