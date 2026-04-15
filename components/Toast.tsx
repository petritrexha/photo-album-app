'use client'
import { useEffect } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

export default function Toast({
  open,
  message,
  variant = 'info',
  onClose,
  autoHideMs = 3500,
}: {
  open: boolean
  message: string
  variant?: ToastVariant
  onClose: () => void
  autoHideMs?: number
}) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, autoHideMs)
    return () => clearTimeout(t)
  }, [open, autoHideMs, onClose])

  if (!open) return null

  const colors =
    variant === 'success'
      ? { bg: 'var(--success-muted)', border: 'var(--success)', text: 'var(--success)' }
      : variant === 'error'
        ? { bg: 'var(--danger-muted)', border: 'var(--danger)', text: 'var(--danger)' }
        : { bg: 'var(--accent-muted)', border: 'var(--accent)', text: 'var(--accent)' }

  return (
    <div style={{ position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          pointerEvents: 'auto',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          minWidth: 'min(520px, calc(100vw - 24px))',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ fontSize: '13px', color: colors.text, lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>{message}</div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: colors.text, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}
          aria-label="Close"
        >
          x
        </button>
      </div>
    </div>
  )
}
