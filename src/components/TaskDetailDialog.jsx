import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalFocus } from '../hooks/useModalFocus'
import { formatDate } from '../utils/dates'
import { CloseIcon } from './icons'
import { TaskDetails } from './TaskDetails'

const EXIT_MS = 160

export function TaskDetailDialog({ task, handlers, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)
  const dialogRef = useRef(null)
  const timerRef = useRef(null)
  const closingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const requestClose = useCallback(() => {
    if (closingRef.current) {
      return
    }

    closingRef.current = true
    setIsClosing(true)
    timerRef.current = window.setTimeout(() => onCloseRef.current(), EXIT_MS)
  }, [])

  useModalFocus(dialogRef, { initialFocusRef: closeRef, onClose: requestClose })

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return createPortal(
    <div
      className={isClosing ? 'task-detail-layer closing' : 'task-detail-layer'}
    >
      <button
        type="button"
        className="task-detail-scrim"
        aria-label="Close task details"
        onClick={requestClose}
      />

      <article ref={dialogRef} className="task-detail-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="task-detail-heading">
          <div>
            <h2 id={titleId}>{task.title}</h2>
            <span>Due {formatDate(task.deadline)}</span>
            {task.startDate && <span>Starts {formatDate(task.startDate)}</span>}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-mini"
            onClick={requestClose}
            aria-label="Close task details"
            title="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <TaskDetails task={task} handlers={handlers} />
      </article>
    </div>,
    document.body,
  )
}
