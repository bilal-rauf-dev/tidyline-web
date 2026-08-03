import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDate } from '../utils/dates'
import { CloseIcon } from './icons'
import { TaskDetails } from './TaskDetails'

const EXIT_MS = 160

export function TaskDetailDialog({ task, handlers, onClose }) {
  const titleId = useId()
  const closeRef = useRef(null)
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

  useEffect(() => {
    closeRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        requestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timerRef.current)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [requestClose])

  return createPortal(
    <div
      className={isClosing ? 'task-detail-layer closing' : 'task-detail-layer'}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="task-detail-scrim"
        aria-label="Close task details"
        onClick={requestClose}
      />

      <article className="task-detail-dialog">
        <header className="task-detail-heading">
          <div>
            <h2 id={titleId}>{task.title}</h2>
            <span>Due {formatDate(task.deadline)}</span>
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
