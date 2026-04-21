import { useMemo, useState } from 'react'
import './App.css'

const BUCKET_ORDER = ['today', 'week', 'twoWeeks', 'month', 'quarter', 'year', 'later']

const BUCKET_LABELS = {
  today: 'Today',
  week: 'Week',
  twoWeeks : '2 Weeks',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
  later: 'Later'
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getTaskBucket(deadline) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const deadlineDate = new Date(`${deadline}T00:00:00`)

  if (deadlineDate <= todayStart) {
    return 'today'
  }

  const daysUntilDeadline = Math.floor(
    (deadlineDate - todayStart) / (1000 * 60 * 60 * 24),
  )

  if (daysUntilDeadline <= 7) {
    return 'week'
  }

  if (daysUntilDeadline <= 14) {
    return 'twoWeeks'
  }

  if (
    deadlineDate.getFullYear() === now.getFullYear() &&
    deadlineDate.getMonth() === now.getMonth()
  ) {
    return 'month'
  }

  if (deadlineDate.getFullYear() === now.getFullYear() &&
      deadlineDate.getMonth() < now.getMonth() + 3) {
    return 'quarter'
  }

  if (deadlineDate.getFullYear() === now.getFullYear()) {
    return 'year'
  }

  return 'later'
}

function App() {
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [reminderInput, setReminderInput] = useState('')
  const [remindersDraft, setRemindersDraft] = useState([])
  const [tasks, setTasks] = useState([])

  const buckets = useMemo(() => {
    const grouped = {
      today: [],
      week: [],
      twoWeeks: [],
      month: [],
      quarter: [],
      year: [],
      later: [],
    }

    tasks.forEach((task) => {
      grouped[getTaskBucket(task.deadline)].push(task)
    })

    BUCKET_ORDER.forEach((bucket) => {
      grouped[bucket].sort((a, b) => {
        if (a.done !== b.done) {
          return Number(a.done) - Number(b.done)
        }

        return a.deadline.localeCompare(b.deadline)
      })
    })

    return grouped
  }, [tasks])

  function addReminder() {
    if (!reminderInput) {
      return
    }

    if (remindersDraft.includes(reminderInput)) {
      setReminderInput('')
      return
    }

    setRemindersDraft((current) => [...current, reminderInput].sort())
    setReminderInput('')
  }

  function removeReminder(reminder) {
    setRemindersDraft((current) =>
      current.filter((entry) => entry !== reminder),
    )
  }

  function addTask(event) {
    event.preventDefault()

    if (!title.trim() || !deadline) {
      return
    }

    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      deadline,
      reminders: remindersDraft,
      done: false,
      createdAt: new Date().toISOString(),
    }

    setTasks((current) => [task, ...current])
    setTitle('')
    setDeadline('')
    setRemindersDraft([])
    setReminderInput('')
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="hero-tag">Deadline-driven planning</p>
        <h1>Reminder Board</h1>
        <p className="hero-copy">
          Add a task, set its due date, attach one or more reminders, and it
          lands automatically in the right time bucket.
        </p>
      </header>

      <section className="entry-card" aria-label="Add task">
        <h2>Add Task</h2>

        <form onSubmit={addTask} className="task-form">
          <label>
            Task name
            <input
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

      <section className="buckets" aria-label="Task buckets">
        {BUCKET_ORDER.map((bucket) => (
          <article key={bucket} className="bucket-column">
            <div className="bucket-header">
              <h3>{BUCKET_LABELS[bucket]}</h3>
              <span>{buckets[bucket].length}</span>
            </div>

            {buckets[bucket].length === 0 ? (
              <p className="empty">No tasks yet.</p>
            ) : (
              <ul className="task-list">
                {buckets[bucket].map((task) => (
                  <li key={task.id} className={task.done ? 'task done' : 'task'}>
                    <div className="task-top">
                      <strong>{task.title}</strong>
                      <label className="task-toggle">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleTask(task.id)}
                        />
                        Done
                      </label>
                    </div>

                    <p className="deadline">Deadline: {formatDate(task.deadline)}</p>

                    {task.reminders.length > 0 && (
                      <ul className="reminder-list">
                        {task.reminders.map((reminder) => (
                          <li key={reminder}>{formatDateTime(reminder)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
