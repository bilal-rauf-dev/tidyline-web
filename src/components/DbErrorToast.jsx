import { useEffect } from 'react'

const AUTO_DISMISS_MS = 6000

/**
 * DbErrorToast — surfaces Supabase read/write failures without breaking the UI.
 * The user's optimistic state is already applied; this just tells them syncing failed.
 */
export function DbErrorToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="db-error-toast" role="alert" aria-live="assertive">
      <span className="db-error-toast-icon" aria-hidden="true">⚠️</span>
      <p className="db-error-toast-message">{message}</p>
      <button
        type="button"
        className="db-error-toast-dismiss"
        aria-label="Dismiss error"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  )
}
