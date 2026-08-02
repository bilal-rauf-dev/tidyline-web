import { useState } from 'react'
import { formatDate, formatDateTime } from '../utils/dates'

export function TaskCard({ task, onToggle, onDelete, onUpdate, onAddReminder, onRemoveReminder }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDeadline, setEditDeadline] = useState(task.deadline)
  const [isAddingReminder, setIsAddingReminder] = useState(false)
  const [newReminder, setNewReminder] = useState('')

  function startEditing() {
    setEditTitle(task.title)
    setEditDeadline(task.deadline)
    setIsEditing(true)
  }

  function saveEdit(event) {
    event.preventDefault()

    if (!editTitle.trim() || !editDeadline) {
      return
    }

    onUpdate(task.id, { title: editTitle.trim(), deadline: editDeadline })
    setIsEditing(false)
  }

  function saveReminder() {
    if (!newReminder) {
      return
    }

    onAddReminder(task.id, newReminder)
    setNewReminder('')
    setIsAddingReminder(false)
  }

  if (isEditing) {
    return (
      <li className="task">
        <form className="task-edit-form" onSubmit={saveEdit}>
          <label>
            Task name
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              required
            />
          </label>
          <label>
            Deadline
            <input
              type="date"
              value={editDeadline}
              onChange={(event) => setEditDeadline(event.target.value)}
              required
            />
          </label>
          <div className="task-edit-actions">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={task.done ? 'task done' : 'task'}>
      <div className="task-top">
        <strong>{task.title}</strong>
        <label className="task-toggle">
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task.id)}
          />
          Done
        </label>
      </div>

      <p className="deadline">Deadline: {formatDate(task.deadline)}</p>

      {task.reminders.length > 0 && (
        <ul className="chips reminder-chips" aria-label="Reminders">
          {task.reminders.map((reminder) => (
            <li key={reminder}>
              <span>{formatDateTime(reminder)}</span>
              <button
                type="button"
                onClick={() => onRemoveReminder(task.id, reminder)}
                aria-label={`Remove reminder ${formatDateTime(reminder)}`}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAddingReminder ? (
        <div className="reminder-builder task-reminder-builder">
          <input
            type="datetime-local"
            value={newReminder}
            onChange={(event) => setNewReminder(event.target.value)}
            aria-label="New reminder time"
          />
          <button type="button" className="secondary" onClick={saveReminder}>
            Add
          </button>
          <button type="button" className="secondary" onClick={() => setIsAddingReminder(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="link-button" onClick={() => setIsAddingReminder(true)}>
          + Add reminder
        </button>
      )}

      <div className="task-actions">
        <button type="button" className="link-button" onClick={startEditing}>
          Edit
        </button>
        <button type="button" className="link-button danger" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
    </li>
  )
}
