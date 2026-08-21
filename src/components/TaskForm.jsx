import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../utils/dates'
import { ensureNotificationPermission } from '../utils/notifications'
import { parseTags } from '../utils/tags'
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  CloseIcon,
  PlusIcon,
  SaveIcon,
  TagIcon,
} from './icons'
import { TagList } from './TagList'
import { DayContext } from './DayContext'
import { TaskDraftDetails } from './TaskDraftDetails'
import { describeReminder } from '../utils/reminders'

function emptyDetails() {
  return {
    notes: '',
    checklist: [],
    checklistDraft: '',
    links: [],
    location: '',
    durationValue: '',
    durationUnit: 'min',
    recurrence: null,
  }
}

export function TaskForm({
  onAddTask,
  allTasks = [],
  initialDeadline = '',
  heading = 'Add task',
  focusOnMount = false,
  initialTitle = '',
  initialTags = '',
  initialDetails = null,
  initialReminders = null,
}) {
  const titleInputRef = useRef(null)
  const [title, setTitle] = useState(initialTitle)
  const [deadline, setDeadline] = useState(initialDeadline)
  const [reminderInput, setReminderInput] = useState('')
  const [reminders, setReminders] = useState(initialReminders || [])
  const [tagInput, setTagInput] = useState(initialTags)
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialDetails))
  const [details, setDetails] = useState(() => ({ ...emptyDetails(), ...(initialDetails || {}) }))

  useEffect(() => {
    if (focusOnMount) titleInputRef.current?.focus()
  }, [focusOnMount])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const keys = ['title', 'deadline', 'tags', 'reminderMinutes', 'durationMinutes', 'recurrence']
    let changed = false
    keys.forEach((key) => {
      if (params.has(key)) {
        params.delete(key)
        changed = true
      }
    })
    if (changed) {
      const search = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (search ? `?${search}` : ''))
    }
  }, [])

  function addReminder() {
    if (!reminderInput) return
    if (!reminders.includes(reminderInput)) {
      ensureNotificationPermission()
      setReminders((current) => [...current, reminderInput].sort())
    }
    setReminderInput('')
  }

  function reminderId(reminder) {
    return typeof reminder === 'string' ? reminder : reminder.id
  }

  function reminderLabel(reminder) {
    return typeof reminder === 'string'
      ? formatDateTime(reminder)
      : describeReminder(reminder, { deadline })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim() || !deadline) return

    onAddTask({
      title: title.trim(),
      deadline,
      reminders,
      tags: parseTags(tagInput),
      recurrence: details.recurrence,
      notes: details.notes,
      checklist: details.checklist,
      links: details.links,
      location: details.location,
      duration:
        details.durationValue === ''
          ? null
          : { value: Number(details.durationValue), unit: details.durationUnit },
    })

    setTitle('')
    setDeadline('')
    setReminders([])
    setReminderInput('')
    setTagInput('')
    setDetailsOpen(false)
    setDetails(emptyDetails())
  }

  const tags = parseTags(tagInput)

  return (
    <section className="entry-card task-entry" aria-label="Add task">
      <div className="task-entry-heading">
        <h2 className="card-heading"><PlusIcon />{heading}</h2>
        <button
          type="button"
          className={detailsOpen ? 'icon-mini task-entry-toggle open' : 'icon-mini task-entry-toggle'}
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="task-entry-details"
          aria-label={detailsOpen ? 'Hide additional task details' : 'Add notes and details'}
        >
          <ChevronDownIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="field-underline">
          <input
            ref={titleInputRef}
            className="input-underline"
            placeholder="What needs doing?"
            aria-label="Task name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-icon">
            <span className="field-icon-head"><CalendarIcon />Due</span>
            <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>
          <div className="field-reminder">
            <label className="field-icon">
              <span className="field-icon-head"><BellIcon />Remind</span>
              <input type="datetime-local" value={reminderInput} onChange={(event) => setReminderInput(event.target.value)} />
            </label>
            <button type="button" className="icon-action" onClick={addReminder} aria-label="Add reminder"><PlusIcon /></button>
          </div>
        </div>

        <DayContext mode="deadline" tasks={allTasks} value={deadline} />
        <DayContext mode="reminder" tasks={allTasks} value={reminderInput} />

        {reminders.length > 0 && (
          <ul className="reminder-strip" aria-label="Pending reminders">
            {reminders.map((reminder) => (
              <li key={reminderId(reminder)}>
                <span className="reminder-dot" aria-hidden="true" />
                <span>{reminderLabel(reminder)}</span>
                <button type="button" className="icon-mini" onClick={() => setReminders((current) => current.filter((entry) => reminderId(entry) !== reminderId(reminder)))} aria-label={`Remove reminder ${reminderLabel(reminder)}`}>
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="field-icon">
          <span className="field-icon-head"><TagIcon />Tags</span>
          <input placeholder="design, university" value={tagInput} onChange={(event) => setTagInput(event.target.value)} />
        </label>
        <TagList tags={tags} />

        <div id="task-entry-details" className={detailsOpen ? 'task-entry-details open' : 'task-entry-details'} inert={detailsOpen ? undefined : true} aria-hidden={!detailsOpen}>
          <div className="task-entry-details-inner">
            <TaskDraftDetails draft={details} onChange={setDetails} />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="task-save-action" aria-label="Save task" title="Save task">
            <SaveIcon />
          </button>
        </div>
      </form>
    </section>
  )
}
