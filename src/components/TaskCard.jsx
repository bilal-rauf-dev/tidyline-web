import { useEffect, useRef, useState } from 'react'
import { getCountdownLabel, getDeadlineParts } from '../utils/dates'
import { parseTags } from '../utils/tags'
import { overdueSeverity } from '../utils/overdue'
import { describeRecurrence } from '../utils/recurrence'
import {
  ArchiveIcon,
  CalendarIcon,
  ChevronDownIcon,
  CopyIcon,
  EditIcon,
  GripIcon,
  LinkIcon,
  NotesIcon,
  PinIcon,
  RepeatIcon,
  TagIcon,
  TrashIcon,
} from './icons'
import { TagList } from './TagList'
import { DayContext } from './DayContext'
import { TaskDetails } from './TaskDetails'
import { Checkbox } from './Checkbox'

export function TaskCard({
  task,
  allTasks = [],
  selectionMode = false,
  selected = false,
  onSelect,
  onToggle,
  onDelete,
  onUpdate,
  onTogglePin,
  onArchive,
  onUnarchive,
  onDuplicate,
  expandTaskId,
  ...detailHandlers
}) {
  const taskRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDeadline, setEditDeadline] = useState(task.deadline)
  const [editTags, setEditTags] = useState((task.tags ?? []).join(', '))

  useEffect(() => {
    if (expandTaskId !== task.id) {
      return undefined
    }

    let scrollFrame
    const expandFrame = requestAnimationFrame(() => {
      setIsExpanded(true)
      scrollFrame = requestAnimationFrame(() => {
        taskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })

    return () => {
      cancelAnimationFrame(expandFrame)
      cancelAnimationFrame(scrollFrame)
    }
  }, [expandTaskId, task.id])

  function startEditing() {
    setEditTitle(task.title)
    setEditDeadline(task.deadline)
    setEditTags((task.tags ?? []).join(', '))
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

  function handleDragStart(event) {
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const { day, month } = getDeadlineParts(task.deadline)
  const severity = overdueSeverity(task)
  const checklistDone = task.checklist.filter((item) => item.done).length

  const classNames = ['task']
  if (task.done) classNames.push('done')
  if (task.pinned) classNames.push('pinned')
  if (selected) classNames.push('selected')
  if (severity > 0) classNames.push(`overdue-${severity}`)

  return (
    <li
      ref={taskRef}
      className={classNames.join(' ')}
      data-task-id={task.id}
      draggable={!selectionMode && !isEditing}
      onDragStart={handleDragStart}
    >
      <div className="task-top">
        {selectionMode ? (
          <label className="task-select">
            <Checkbox
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
          <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
          Done
        </label>
      </div>

      {isEditing ? (
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

          <DayContext mode="deadline" tasks={allTasks} value={editDeadline} excludeId={task.id} />

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

          <div className="task-edit-actions">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" className="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="task-body">
          <div className="deadline-stat">
            <strong>{day}</strong>
            <span>{month}</span>
          </div>

          <div className="task-details">
            <div className="task-meta">
              <span className={severity > 0 ? 'countdown overdue' : 'countdown'}>
                {getCountdownLabel(task.deadline)}
              </span>

              {task.recurrence && (
                <span className="task-flag" title={describeRecurrence(task.recurrence)}>
                  <RepeatIcon />
                </span>
              )}
              {task.notes && (
                <span className="task-flag" title="Has notes">
                  <NotesIcon />
                </span>
              )}
              {(task.links.length > 0 || task.attachments.length > 0) && (
                <span
                  className="task-flag"
                  title={`${task.links.length + task.attachments.length} link(s)`}
                >
                  <LinkIcon />
                </span>
              )}
              {task.checklist.length > 0 && (
                <span className="task-flag text" title="Checklist progress">
                  {checklistDone}/{task.checklist.length}
                </span>
              )}
              {task.duration && (
                <span className="task-flag text" title="Estimated duration">
                  {task.duration.value}
                  {task.duration.unit === 'hr' ? 'h' : 'm'}
                </span>
              )}
            </div>

            <TagList tags={task.tags} />

            <div className="task-actions">
              <button
                type="button"
                className={isExpanded ? 'icon-mini is-on' : 'icon-mini'}
                onClick={() => setIsExpanded((value) => !value)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? `Collapse ${task.title}` : `Expand ${task.title}`}
                title="Details"
              >
                <ChevronDownIcon />
              </button>

              <button
                type="button"
                className={task.pinned ? 'icon-mini is-on' : 'icon-mini'}
                onClick={() => onTogglePin(task.id)}
                aria-pressed={task.pinned}
                aria-label={task.pinned ? `Unpin ${task.title}` : `Pin ${task.title}`}
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

              <button
                type="button"
                className="icon-mini"
                onClick={() => (task.archived ? onUnarchive(task.id) : onArchive(task.id))}
                aria-label={`${task.archived ? 'Restore' : 'Archive'} ${task.title}`}
                title={task.archived ? 'Restore from archive' : 'Archive'}
              >
                <ArchiveIcon />
              </button>

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

            {isExpanded && (
              <TaskDetails task={task} handlers={{ ...detailHandlers, onUpdate }} />
            )}
          </div>
        </div>
      )}
    </li>
  )
}
