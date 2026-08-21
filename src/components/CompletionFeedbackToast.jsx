import { useEffect } from 'react'
import { CloseIcon } from './icons'
import { formatMinutes } from '../utils/calibration'

const TOAST_MS = 7000

export function CompletionFeedbackToast({ feedback, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="undo-toast completion-feedback-toast" role="status" aria-live="polite">
      <span className="toast-message">
        <strong>{feedback.title}</strong>
        <span>
          Estimated {formatMinutes(feedback.estimateMinutes)} · took {formatMinutes(feedback.actualMinutes)}.
        </span>
      </span>
      <button type="button" className="icon-mini" onClick={onDismiss} aria-label="Dismiss completion comparison">
        <CloseIcon />
      </button>
    </div>
  )
}
