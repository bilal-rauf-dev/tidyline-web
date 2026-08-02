import { CloseIcon } from './icons'

export function UndoToast({ message, onUndo, onDismiss }) {
  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" className="undo-action" onClick={onUndo}>
        Undo
      </button>
      <button
        type="button"
        className="icon-mini"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
