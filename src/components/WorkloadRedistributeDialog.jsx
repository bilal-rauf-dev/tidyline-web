import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocus } from '../hooks/useModalFocus'
import { formatDate } from '../utils/dates'
import { formatWorkload } from '../utils/workload'
import { CloseIcon } from './icons'

const EXIT_MS = 160

export function WorkloadRedistributeDialog({ plan, onConfirm, onClose }) {
  const [closing, setClosing] = useState(false)
  const timerRef = useRef(null)
  const closeRef = useRef(null)
  const dialogRef = useRef(null)
  const close = useCallback(() => {
    setClosing(true)
    timerRef.current = window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useModalFocus(dialogRef, { initialFocusRef: closeRef, onClose: close })

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return createPortal(
    <div className={closing ? 'task-detail-layer closing' : 'task-detail-layer'}>
      <button type="button" className="task-detail-scrim" aria-label="Close preview" onClick={close} />
      <article ref={dialogRef} className="task-detail-dialog workload-dialog" role="dialog" aria-modal="true" aria-label="Redistribute workload preview" tabIndex={-1}>
        <header className="task-detail-heading">
          <div>
            <h2>Move flexible tasks?</h2>
            <span>Preview from {formatDate(plan.sourceDate)} — nothing moves until confirmed.</span>
          </div>
          <button ref={closeRef} type="button" className="icon-mini" onClick={close} aria-label="Close preview"><CloseIcon /></button>
        </header>

        {plan.proposals.length === 0 ? (
          <p className="empty">No flexible estimated tasks can be moved automatically.</p>
        ) : (
          <ul className="redistribution-list">
            {plan.proposals.map((proposal) => (
              <li key={proposal.task.id}>
                <strong>{proposal.task.title}</strong>
                <span>{formatWorkload(proposal.minutes)} · {formatDate(proposal.from)} → {formatDate(proposal.to)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>Cancel</button>
          <button
            type="button"
            className="primary"
            disabled={plan.proposals.length === 0}
            onClick={() => {
              onConfirm(plan.proposals)
              close()
            }}
          >
            Confirm moves
          </button>
        </div>
      </article>
    </div>,
    document.body,
  )
}
