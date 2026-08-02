import { formatDate, formatDateTime } from '../utils/dates'
import { getDeadlineContext, getReminderContext } from '../utils/dayContext'

/**
 * Panel shown beneath a date/time field once a value is picked, surfacing
 * anything already scheduled on that day (or near that time) so a clash is
 * visible before committing. Renders nothing when the slot is clear.
 */
export function DayContext({ mode, tasks, value, excludeId }) {
  if (!value) {
    return null
  }

  if (mode === 'reminder') {
    const { nearby, deadlines, windowMinutes } = getReminderContext(tasks, value, excludeId)

    if (nearby.length === 0 && deadlines.length === 0) {
      return null
    }

    return (
      <div className="day-context">
        <p className="day-context-head">
          Around {formatDateTime(value)}
        </p>

        {nearby.length > 0 && (
          <ul>
            {nearby.map((entry) => (
              <li key={entry.key}>
                <span className="reminder-dot" aria-hidden="true" />
                <strong>{entry.title}</strong> reminder at {formatDateTime(entry.reminder)}
              </li>
            ))}
          </ul>
        )}

        {deadlines.length > 0 && (
          <ul>
            {deadlines.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> is due that day
              </li>
            ))}
          </ul>
        )}

        <p className="day-context-note">Within {windowMinutes / 60}h of your reminder.</p>
      </div>
    )
  }

  const { deadlines, reminders } = getDeadlineContext(tasks, value, excludeId)

  if (deadlines.length === 0 && reminders.length === 0) {
    return null
  }

  return (
    <div className="day-context">
      <p className="day-context-head">Already on {formatDate(value)}</p>

      {deadlines.length > 0 && (
        <ul>
          {deadlines.map((task) => (
            <li key={task.id}>
              <strong>{task.title}</strong> is due
            </li>
          ))}
        </ul>
      )}

      {reminders.length > 0 && (
        <ul>
          {reminders.map((entry) => (
            <li key={entry.key}>
              <span className="reminder-dot" aria-hidden="true" />
              <strong>{entry.title}</strong> reminder at {formatDateTime(entry.reminder)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
