import { useState } from 'react'
import { formatDateTime, getDeadlineParts } from '../utils/dates'
import { ensureNotificationPermission } from '../utils/notifications'
import { parseTags } from '../utils/tags'
import {
  ArchiveIcon,
  BellIcon,
  CalendarIcon,
  CloseIcon,
  CopyIcon,
  EditIcon,
  GripIcon,
  PinIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from './icons'
import { TagList } from './TagList'
import { DayContext } from './DayContext'

export function TaskCard({
  task,
  allTasks = [],
  selectionMode = false,
  selected = false,
  onSelect,
  onToggle,
  onDelete,
  onUpdate,
  onAddReminder,
  onRemoveReminder,
  onTogglePin,
  onArchive,
  onUnarchive,
  onDuplicate,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDeadline, setEditDeadline] = useState(task.deadline)
  const [editTags, setEditTags] = useState((task.tags ?? []).join(', '))
  const [newReminder, setNewReminder] = useState('')

  function startEditing() {
    setEditTitle(task.title)
    setEditDeadline(task.deadline)
    setEditTags((task.tags ?? []).join(', '))
    setNewReminder('')
    setIsEditing(true)
  }

  function saveEdit(event) {
    event.preventDefault()

    if (!editTitle.trim() || !editDeadline) {
      return
    }

    onUpdate(task.id, {
      title: editTitle.trim(),
      deadline: editDeadline,
      tags: parseTags(editTags),
    })
    setIsEditing(false)
  }

  function saveReminder() {
    if (!newReminder) {
      return
    }

    ensureNotificationPermission()
    onAddReminder(task.id, newReminder)
    setNewReminder('')
  }

  function handleDragStart(event) {
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  if (isEditing) {
    return (
      <li className="task editing">
        <form className="task-edit-form" onSubmit={saveEdit}>
          <div className="field-underline">
            <input
              type="text"
              className="input-underline"
              value={editTitle}
              aria-label="Task name"
              onChange={(event) => setEditTitle(event.target.value)}
              required
            />
          </div>

          <label className="field-icon">
            <span className="field-icon-head">
              <CalendarIcon />
              Due
            </span>
            <input
              type="date"
              value={editDeadline}
              onChange={(event) => setEditDeadline(event.target.value)}
              required
            />
          </label>

          <DayContext
            mode="deadline"
            tasks={allTasks}
            value={editDeadline}
            excludeId={task.id}
          />

          <label className="field-icon">
            <span className="field-icon-head">
              <TagIcon />
              Tags
            </span>
            <input
              type="text"
              placeholder="design, urgent"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
            />
          </label>

          <div className="edit-reminders">
            <span className="field-icon-head">
              <BellIcon />
              Reminders
            </span>

            {task.reminders.length > 0 && (
              <ul className="reminder-strip">
                {task.reminders.map((reminder) => (
                  <li key={reminder}>
                    <span className="reminder-dot" aria-hidden="true" />
                    <span>{formatDateTime(reminder)}</span>
                    <button
                      type="button"
                      className="icon-mini"
                      onClick={() => onRemoveReminder(task.id, reminder)}
                      aria-label={`Remove reminder ${formatDateTime(reminder)}`}
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="field-reminder">
              <input
                type="datetime-local"
                value={newReminder}
                aria-label="New reminder time"
                onChange={(event) => setNewReminder(event.target.value)}
              />
              <button
                type="button"
                className="icon-action"
                onClick={saveReminder}
                aria-label="Add reminder"
                title="Add reminder"
              >
                <PlusIcon />
              </button>
            </div>

            <DayContext
              mode="reminder"
              tasks={allTasks}
              value={newReminder}
              excludeId={task.id}
            />
          </div>

          <div className="task-edit-actions">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
              Done editing
            </button>
          </div>
        </form>
      </li>
    )
  }

  const { day, month } = getDeadlineParts(task.deadline)
  const classNames = ['task']
  if (task.done) classNames.push('done')
  if (task.pinned) classNames.push('pinned')
  if (selected) classNames.push('selected')

  return (
    <li
      className={classNames.join(' ')}
      draggable={!selectionMode}
      onDragStart={handleDragStart}
    >
      <div className="task-top">
        {selectionMode ? (
          <label className="task-select">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(task.id)}
              aria-label={`Select ${task.title}`}
            />
          </label>
        ) : (
          <span className="task-grip" aria-hidden="true">
            <GripIcon />
          </span>
        )}

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

      <div className="task-body">
        <div className="deadline-stat">
          <strong>{day}</strong>
          <span>{month}</span>
        </div>

        <div className="task-details">
          <TagList tags={task.tags} />

          {task.reminders.length > 0 && (
            <ul className="reminder-strip" aria-label="Reminders">
              {task.reminders.map((reminder) => (
                <li key={reminder}>
                  <span className="reminder-dot" aria-hidden="true" />
                  <span>{formatDateTime(reminder)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="task-actions">
            <button
              type="button"
              className={task.pinned ? 'icon-mini is-on' : 'icon-mini'}
              onClick={() => onTogglePin(task.id)}
              aria-label={task.pinned ? `Unpin ${task.title}` : `Pin ${task.title}`}
              aria-pressed={task.pinned}
              title={task.pinned ? 'Unpin' : 'Pin to top'}
            >
              <PinIcon />
            </button>

            <button
              type="button"
              className="icon-mini"
              onClick={startEditing}
              aria-label={`Edit ${task.title}`}
              title="Edit"
            >
              <EditIcon />
            </button>

            <button
              type="button"
              className="icon-mini"
              onClick={() => onDuplicate(task.id)}
              aria-label={`Duplicate ${task.title}`}
              title="Duplicate"
            >
              <CopyIcon />
            </button>

            {task.archived ? (
              <button
                type="button"
                className="icon-mini"
                onClick={() => onUnarchive(task.id)}
                aria-label={`Restore ${task.title}`}
                title="Restore from archive"
              >
                <ArchiveIcon />
              </button>
            ) : (
              <button
                type="button"
                className="icon-mini"
                onClick={() => onArchive(task.id)}
                aria-label={`Archive ${task.title}`}
                title="Archive"
              >
                <ArchiveIcon />
              </button>
            )}

            <button
              type="button"
              className="icon-mini danger"
              onClick={() => onDelete(task.id)}
              aria-label={`Delete ${task.title}`}
              title="Delete permanently"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
