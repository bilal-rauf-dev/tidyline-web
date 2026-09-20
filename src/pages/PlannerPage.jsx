import { useMemo, useRef, useState } from 'react'
import { toDateStr } from '../utils/calendar'
import { formatDate, formatDeadline } from '../utils/dates'
import { CloseIcon } from '../components/icons'

const DAY_START = 6 * 60
const DAY_END = 22 * 60
const PIXELS_PER_HOUR = 72
const TIMELINE_HEIGHT = ((DAY_END - DAY_START) / 60) * PIXELS_PER_HOUR

function durationMinutes(task) {
  if (!task.duration) return 30
  return task.duration.unit === 'hr' ? task.duration.value * 60 : task.duration.value
}

function timeLabel(minutes) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function addDays(dateStr, amount) {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return toDateStr(date)
}

export function PlannerPage({ tasks, setScheduledStart, updateTask }) {
  const [date, setDate] = useState(() => toDateStr(new Date()))
  const timelineRef = useRef(null)
  const actionable = useMemo(
    () =>
      tasks.filter(
        (task) => task.deadline && !task.done && !task.archived && task.status !== 'waiting',
      ),
    [tasks],
  )
  const scheduled = useMemo(
    () => actionable.filter((task) => task.scheduledStart?.slice(0, 10) === date),
    [actionable, date],
  )
  const sourceTasks = useMemo(
    () => actionable.filter((task) => task.scheduledStart?.slice(0, 10) !== date),
    [actionable, date],
  )

  function scheduleFromPointer(taskId, clientY) {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return
    const rawMinutes = DAY_START + ((clientY - rect.top) / rect.height) * (DAY_END - DAY_START)
    const snapped = Math.round(rawMinutes / 15) * 15
    const minutes = Math.max(DAY_START, Math.min(DAY_END - 15, snapped))
    setScheduledStart(taskId, `${date}T${timeLabel(minutes)}`)
  }

  function beginResize(event, task) {
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const original = durationMinutes(task)
    let latestY = startY

    function move(pointerEvent) {
      latestY = pointerEvent.clientY
    }

    function finish() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      const deltaMinutes = ((latestY - startY) / PIXELS_PER_HOUR) * 60
      const minutes = Math.max(15, Math.round((original + deltaMinutes) / 15) * 15)
      updateTask(task.id, { duration: { value: minutes, unit: 'min' } })
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
  }

  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, index) =>
    DAY_START / 60 + index,
  )

  return (
    <main className="app-shell planner-shell">
      <header className="hero planner-hero">
        <div>
          <h1>Day planner</h1>
          <p className="hero-copy">Choose a time for each task, or drag it onto the timeline.</p>
        </div>
        <div className="planner-date-controls">
          <button type="button" className="secondary" onClick={() => setDate(addDays(date, -1))}>
            Previous
          </button>
          <label>
            <span className="sr-only">Planner date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="button" className="secondary" onClick={() => setDate(addDays(date, 1))}>
            Next
          </button>
        </div>
      </header>

      <section className="planner-layout" aria-label={`Plan for ${formatDate(date)}`}>
        <aside className="entry-card planner-source">
          <h2>Board tasks</h2>
          <p className="card-note">Choose a time or drag onto the timeline. Waiting tasks stay off this list.</p>
          {sourceTasks.length === 0 ? (
            <p className="empty">Everything actionable is scheduled.</p>
          ) : (
            <ul className="planner-source-list">
              {sourceTasks.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', task.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                >
                  <strong>{task.title}</strong>
                  <span>{durationMinutes(task)} min · due {formatDeadline(task.deadline, task.deadlineTime)}</span>
                  <form
                    className="planner-task-controls"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const time = new FormData(event.currentTarget).get('time')
                      if (time) setScheduledStart(task.id, `${date}T${time}`)
                    }}
                  >
                    <label>
                      <span>Start time for {task.title}</span>
                      <input type="time" name="time" defaultValue="09:00" min="06:00" max="21:45" step="900" required />
                    </label>
                    <button type="submit" className="secondary">Schedule</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <article className="entry-card planner-day">
          <h2>{formatDate(date)}</h2>
          {scheduled.length > 0 && (
            <section className="planner-scheduled-controls" aria-label="Adjust scheduled tasks">
              <h3>Scheduled tasks</h3>
              <ul>
                {scheduled.map((task) => (
                  <li key={`${task.id}:${task.scheduledStart}:${durationMinutes(task)}`}>
                    <strong>{task.title}</strong>
                    <form
                      className="planner-task-controls"
                      onSubmit={(event) => {
                        event.preventDefault()
                        const form = new FormData(event.currentTarget)
                        const time = form.get('time')
                        const minutes = Number(form.get('duration'))
                        if (!time || !Number.isFinite(minutes) || minutes < 15) return
                        if (time !== task.scheduledStart.slice(11, 16)) {
                          setScheduledStart(task.id, `${date}T${time}`)
                        }
                        if (minutes !== durationMinutes(task)) {
                          updateTask(task.id, { duration: { value: minutes, unit: 'min' } })
                        }
                      }}
                    >
                      <label>
                        <span>Start time</span>
                        <input type="time" name="time" defaultValue={task.scheduledStart.slice(11, 16)} min="06:00" max="21:45" step="900" required />
                      </label>
                      <label>
                        <span>Minutes</span>
                        <input type="number" name="duration" defaultValue={durationMinutes(task)} min="15" step="15" required />
                      </label>
                      <button type="submit" className="secondary">Save</button>
                      <button type="button" className="secondary" onClick={() => setScheduledStart(task.id, null)}>
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div
            ref={timelineRef}
            className="planner-timeline"
            style={{ height: `${TIMELINE_HEIGHT}px` }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const taskId = event.dataTransfer.getData('text/plain')
              if (taskId) scheduleFromPointer(taskId, event.clientY)
            }}
          >
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="planner-hour"
                style={{ top: `${index * PIXELS_PER_HOUR}px` }}
              >
                <span>{timeLabel(hour * 60)}</span>
              </div>
            ))}

            {scheduled.map((task) => {
              const time = task.scheduledStart.slice(11, 16)
              const [hour, minute] = time.split(':').map(Number)
              const startMinutes = hour * 60 + minute
              const top = ((startMinutes - DAY_START) / 60) * PIXELS_PER_HOUR
              const height = Math.max(18, (durationMinutes(task) / 60) * PIXELS_PER_HOUR)

              return (
                <div
                  key={task.id}
                  className="planner-block"
                  style={{ top: `${top}px`, height: `${height}px` }}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', task.id)
                    event.dataTransfer.effectAllowed = 'move'
                  }}
                >
                  <div>
                    <strong>{task.title}</strong>
                    <span>{time} · {durationMinutes(task)} min</span>
                  </div>
                  <button
                    type="button"
                    className="icon-mini"
                    onClick={() => setScheduledStart(task.id, null)}
                    aria-label={`Remove ${task.title} from the timeline`}
                    title="Remove from timeline"
                  >
                    <CloseIcon />
                  </button>
                  <div
                    className="planner-resize"
                    title="Drag to resize"
                    aria-hidden="true"
                    onPointerDown={(event) => beginResize(event, task)}
                  />
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </main>
  )
}
