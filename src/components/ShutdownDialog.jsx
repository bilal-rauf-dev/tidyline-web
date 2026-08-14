import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDate } from '../utils/dates'
import { getDailyShutdown, tomorrowDate } from '../utils/shutdown'
import { CloseIcon } from './icons'

const EXIT_MS = 160

export function ShutdownDialog({ tasks, setDeadline, archiveTask, onClose }) {
  const summary = getDailyShutdown(tasks)
  const [handled, setHandled] = useState([])
  const [dates, setDates] = useState({})
  const [closing, setClosing] = useState(false)
  const timerRef = useRef(null)
  const close = useCallback(() => {
    setClosing(true)
    timerRef.current = window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => {
    function keydown(event) {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', keydown)
    return () => {
      window.clearTimeout(timerRef.current)
      window.removeEventListener('keydown', keydown)
    }
  }, [close])

  function resolve(id) {
    setHandled((current) => [...current, id])
  }

  const unfinished = summary.unfinished.filter((task) => !handled.includes(task.id))

  return createPortal(
    <div className={closing ? 'task-detail-layer closing' : 'task-detail-layer'} role="dialog" aria-modal="true" aria-label="Daily shutdown">
      <button type="button" className="task-detail-scrim" aria-label="Close daily shutdown" onClick={close} />
      <article className="task-detail-dialog shutdown-dialog">
        <header className="task-detail-heading">
          <div>
            <h2>Daily shutdown</h2>
            <span>{formatDate(summary.date)}</span>
          </div>
          <button type="button" className="icon-mini" onClick={close} aria-label="Close daily shutdown"><CloseIcon /></button>
        </header>

        <div className="shutdown-dialog-content">
          <div className="shutdown-stat">
            <strong>{summary.completed}/{summary.tasks.length}</strong>
            <span>tasks completed today</span>
          </div>

          {unfinished.length === 0 ? (
            <p className="empty">No unfinished tasks left to review.</p>
          ) : (
            <ul className="shutdown-list">
              {unfinished.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <div className="shutdown-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setDeadline(task.id, tomorrowDate(), 'edit', { plannedDate: null })
                        resolve(task.id)
                      }}
                    >
                      Tomorrow
                    </button>
                    <label>
                      <span className="sr-only">New deadline for {task.title}</span>
                      <input
                        type="date"
                        value={dates[task.id] ?? ''}
                        onChange={(event) => setDates((current) => ({ ...current, [task.id]: event.target.value }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!dates[task.id]}
                      onClick={() => {
                        setDeadline(task.id, dates[task.id], 'edit', { plannedDate: null })
                        resolve(task.id)
                      }}
                    >
                      Move
                    </button>
                    <button type="button" className="secondary" onClick={() => resolve(task.id)}>
                      {task.deadline === summary.date ? 'Keep as overdue' : 'Keep as is'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        archiveTask(task.id)
                        resolve(task.id)
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="dialog-actions">
            <button type="button" className="primary" onClick={close}>Finish review</button>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  )
}
