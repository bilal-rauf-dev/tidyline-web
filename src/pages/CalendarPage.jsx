import { useMemo, useState } from 'react'
import {
  WEEKDAY_LABELS,
  addMonths,
  formatMonthLabel,
  getMonthWeeks,
  groupTasksByDate,
  todayDateStr,
} from '../utils/calendar'
import { formatDate } from '../utils/dates'
import { TaskForm } from '../components/TaskForm'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'

export function CalendarPage({ tasks, addTask, setDeadline }) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const weeks = useMemo(() => getMonthWeeks(viewDate), [viewDate])
  const tasksByDate = useMemo(
    () => groupTasksByDate(tasks.filter((task) => !task.archived && task.deadline)),
    [tasks],
  )
  const today = todayDateStr()

  function handleDrop(event, dateStr) {
    event.preventDefault()
    setDropTarget(null)
    const id = event.dataTransfer.getData('text/plain')
    if (id) setDeadline(id, dateStr)
  }

  return (
    <main className="app-shell calendar-shell">
      <header className="hero">
        <h1>Calendar</h1>
        <p className="hero-copy">See where deadlines collect and how far apart they really are.</p>
      </header>

      <section className="entry-card calendar-card">
        <div className="calendar-toolbar">
          <button type="button" className="calendar-nav" onClick={() => setViewDate((current) => addMonths(current, -1))} aria-label="Previous month">
            <ChevronLeftIcon /><span>Prev</span>
          </button>
          <h2>{formatMonthLabel(viewDate)}</h2>
          <button type="button" className="calendar-nav calendar-today" onClick={() => setViewDate(new Date())}>Today</button>
          <button type="button" className="calendar-nav" onClick={() => setViewDate((current) => addMonths(current, 1))} aria-label="Next month">
            <span>Next</span><ChevronRightIcon />
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>

        <div className="calendar-grid">
          {weeks.flat().map(({ dateStr, day, inMonth }) => {
            const dayTasks = tasksByDate[dateStr] ?? []
            const classNames = ['calendar-day']
            if (!inMonth) classNames.push('outside')
            if (dateStr === today) classNames.push('today')
            if (dropTarget === dateStr) classNames.push('drop-target')

            return (
              <button
                type="button"
                key={dateStr}
                className={classNames.join(' ')}
                onClick={() => setSelectedDate(dateStr)}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDropTarget(dateStr)
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDropTarget((current) => (current === dateStr ? null : current))
                  }
                }}
                onDrop={(event) => handleDrop(event, dateStr)}
              >
                <span className="calendar-day-number">{day}</span>
                {dayTasks.length === 1 && (
                  <span
                    className="calendar-day-task"
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation()
                      event.dataTransfer.setData('text/plain', dayTasks[0].id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <span className="reminder-dot" aria-hidden="true" />
                    {dayTasks[0].title}
                  </span>
                )}
                {dayTasks.length > 1 && (
                  <span className="calendar-day-count"><strong>{dayTasks.length}</strong><span>tasks</span></span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {selectedDate && (
        <TaskForm
          key={selectedDate}
          heading={`Add task for ${formatDate(selectedDate)}`}
          initialDeadline={selectedDate}
          allTasks={tasks}
          onAddTask={(task) => {
            addTask(task)
            setSelectedDate(null)
          }}
        />
      )}
    </main>
  )
}
