import { useEffect } from 'react'
import { CloseIcon } from './icons'

const TOAST_MS = 6000

export function TaskAddedToast({ title, onEdit, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="undo-toast task-added-toast" role="status" aria-live="polite">
      <span className="toast-message">
        <strong>Task added</strong>
        <span>{title}</span>
      </span>
      <button type="button" className="undo-action" onClick={onEdit}>
        Edit
      </button>
      <button
        type="button"
        className="icon-mini"
        onClick={onDismiss}
        aria-label="Dismiss task-added notification"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
