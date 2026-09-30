import { useRef, useState } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import { Checkbox } from './Checkbox'

export function DeleteConfirmDialog({ taskTitle, onCancel, onConfirm }) {
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)

  useModalFocus(dialogRef, { initialFocusRef: cancelRef, onClose: onCancel })

  return (
    <div className="confirm-layer">
      <button
        type="button"
        className="confirm-scrim"
        onClick={onCancel}
        aria-label="Cancel task deletion"
      />

      <div ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" tabIndex={-1}>
        <h2 id="delete-title">Delete task?</h2>
        <p>
          “{taskTitle}” will be removed. You can still restore it from the undo notification.
        </p>

        <label className="confirm-preference">
          <Checkbox
            checked={dontAskAgain}
            onChange={(event) => setDontAskAgain(event.target.checked)}
          />
          <span>Don&rsquo;t show this again</span>
        </label>

        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={() => onConfirm(dontAskAgain)}>
            Delete task
          </button>
        </div>
      </div>
    </div>
  )
}
