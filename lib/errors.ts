export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || fallback

  // Supabase / API-style shapes
  const maybeObj = err as any
  const msg =
    maybeObj?.message ||
    maybeObj?.error_description ||
    maybeObj?.error ||
    maybeObj?.details

  if (typeof msg === 'string' && msg.trim()) return msg
  return fallback
}

export function throwIfSupabaseError<T extends { error?: unknown }>(result: T): T {
  if ((result as any)?.error) throw (result as any).error
  return result
}

