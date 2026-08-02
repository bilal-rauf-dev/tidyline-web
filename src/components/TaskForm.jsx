import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../utils/dates'
import { ensureNotificationPermission } from '../utils/notifications'
import { parseTags } from '../utils/tags'
import { BellIcon, CalendarIcon, ChevronDownIcon, CloseIcon, PlusIcon, TagIcon } from './icons'
import { TagList } from './TagList'
import { DayContext } from './DayContext'
import { TaskDraftDetails } from './TaskDraftDetails'

function createEmptyDetails() {
  return {
    notes: '',
    checklist: [],
    checklistDraft: '',
    links: [],
    linkLabel: '',
    linkUrl: '',
    attachments: [],
    attachmentLabel: '',
    attachmentUrl: '',
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
}) {
  const titleInputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState(initialDeadline)
  const [reminderInput, setReminderInput] = useState('')
  const [remindersDraft, setRemindersDraft] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [details, setDetails] = useState(createEmptyDetails)

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
    setRemindersDraft((current) => current.filter((entry) => entry !== reminder))
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
      tags: parseTags(tagInput),
      recurrence: details.recurrence,
      notes: details.notes,
      checklist: details.checklist,
      links: details.links,
      attachments: details.attachments,
      location: details.location,
      duration:
        details.durationValue === ''
          ? null
          : { value: Number(details.durationValue), unit: details.durationUnit },
    })

    setTitle('')
    setDeadline('')
    setRemindersDraft([])
    setReminderInput('')
    setTagInput('')
    setDetailsOpen(false)
    setDetails(createEmptyDetails())
  }

  const draftTags = parseTags(tagInput)

  return (
    <section className="entry-card task-entry" aria-label="Add task">
      <div className="task-entry-heading">
        <h2 className="card-heading">
          <PlusIcon />
          {heading}
        </h2>
        <button
          type="button"
          className={detailsOpen ? 'icon-mini task-entry-toggle open' : 'icon-mini task-entry-toggle'}
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="task-entry-details"
          aria-label={detailsOpen ? 'Hide additional task details' : 'Add notes and details'}
          title={detailsOpen ? 'Hide details' : 'Add notes and details'}
        >
          <ChevronDownIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="field-underline">
          <input
            ref={titleInputRef}
            type="text"
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
            <span className="field-icon-head">
              <CalendarIcon />
              Due
            </span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              required
            />
          </label>

          <div className="field-reminder">
            <label className="field-icon">
              <span className="field-icon-head">
                <BellIcon />
                Remind
              </span>
              <input
                type="datetime-local"
                value={reminderInput}
                onChange={(event) => setReminderInput(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="icon-action"
              onClick={addReminder}
              aria-label="Add reminder"
              title="Add reminder"
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <DayContext mode="deadline" tasks={allTasks} value={deadline} />
        <DayContext mode="reminder" tasks={allTasks} value={reminderInput} />

        {remindersDraft.length > 0 && (
          <ul className="reminder-strip" aria-label="Pending reminders">
            {remindersDraft.map((reminder) => (
              <li key={reminder}>
                <span className="reminder-dot" aria-hidden="true" />
                <span>{formatDateTime(reminder)}</span>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => removeReminder(reminder)}
                  aria-label={`Remove reminder ${formatDateTime(reminder)}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="field-icon">
          <span className="field-icon-head">
            <TagIcon />
            Tags
          </span>
          <input
            type="text"
            placeholder="design, urgent"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
          />
        </label>

        <TagList tags={draftTags} />

        {detailsOpen && (
          <div id="task-entry-details">
            <TaskDraftDetails draft={details} onChange={setDetails} />
          </div>
        )}

        <div className="form-footer">
          <button type="submit" className="primary">
            Save task
          </button>
        </div>
      </form>
    </section>
  )
}
