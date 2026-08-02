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

export function CalendarPage({ tasks, addTask }) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  const weeks = useMemo(() => getMonthWeeks(viewDate), [viewDate])
  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks])
  const today = todayDateStr()

  function handleAddTask(taskData) {
    addTask(taskData)
    setSelectedDate(null)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Calendar</h1>
        <p className="hero-copy">
          Tasks are plotted on their deadline date. Click a day to add a task
          due then.
        </p>
      </header>

      <section className="entry-card calendar-card">
        <div className="calendar-toolbar">
          <button
            type="button"
            className="link-button"
            onClick={() => setViewDate((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            ‹ Prev
          </button>
          <h2>{formatMonthLabel(viewDate)}</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => setViewDate((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            Next ›
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {weeks.flat().map(({ dateStr, day, inMonth }) => {
            const dayTasks = tasksByDate[dateStr] ?? []
            const classNames = ['calendar-day']
            if (!inMonth) classNames.push('outside')
            if (dateStr === today) classNames.push('today')

            return (
              <button
                type="button"
                key={dateStr}
                className={classNames.join(' ')}
                onClick={() => setSelectedDate(dateStr)}
              >
                <span className="calendar-day-number">{day}</span>

                {dayTasks.length === 1 && (
                  <span className="calendar-day-task">
                    <span className="reminder-dot" aria-hidden="true" />
                    {dayTasks[0].title}
                  </span>
                )}

                {dayTasks.length > 1 && (
                  <span className="calendar-day-count">
                    <strong>{dayTasks.length}</strong>
                    <span>tasks</span>
                  </span>
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
          onAddTask={handleAddTask}
        />
      )}
    </main>
  )
}
