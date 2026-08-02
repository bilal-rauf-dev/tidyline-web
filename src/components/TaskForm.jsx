import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../utils/dates'
import { ensureNotificationPermission } from '../utils/notifications'

export function TaskForm({
  onAddTask,
  initialDeadline = '',
  heading = 'Add task',
  focusOnMount = false,
}) {
  const titleInputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState(initialDeadline)
  const [reminderInput, setReminderInput] = useState('')
  const [remindersDraft, setRemindersDraft] = useState([])

  useEffect(() => {
    if (focusOnMount) {
      titleInputRef.current?.focus()
    }
  }, [focusOnMount])

  function addReminder() {
    if (!reminderInput) {
      return
    }

    if (remindersDraft.includes(reminderInput)) {
      setReminderInput('')
      return
    }

    ensureNotificationPermission()
    setRemindersDraft((current) => [...current, reminderInput].sort())
    setReminderInput('')
  }

  function removeReminder(reminder) {
    setRemindersDraft((current) =>
      current.filter((entry) => entry !== reminder),
    )
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!title.trim() || !deadline) {
      return
    }

    onAddTask({
      title: title.trim(),
      deadline,
      reminders: remindersDraft,
    })

    setTitle('')
    setDeadline('')
    setRemindersDraft([])
    setReminderInput('')
  }

  return (
    <section className="entry-card" aria-label="Add task">
      <h2>{heading}</h2>

      <form onSubmit={handleSubmit} className="task-form">
        <label>
          Task name
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Enter task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label>
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            required
          />
        </label>

        <div className="reminder-builder">
          <label>
            Reminder time
            <input
              type="datetime-local"
              value={reminderInput}
              onChange={(event) => setReminderInput(event.target.value)}
            />
          </label>
          <button type="button" className="secondary" onClick={addReminder}>
            Add reminder
          </button>
        </div>

        {remindersDraft.length > 0 && (
          <ul className="chips" aria-label="Pending reminders">
            {remindersDraft.map((reminder) => (
              <li key={reminder}>
                <span>{formatDateTime(reminder)}</span>
                <button
                  type="button"
                  onClick={() => removeReminder(reminder)}
                  aria-label={`Remove reminder ${formatDateTime(reminder)}`}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="submit" className="primary">
          Save task
        </button>
      </form>
    </section>
  )
}
