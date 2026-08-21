import { useEffect, useRef, useState } from 'react'
import { formatDate, getCountdownLabel, getDeadlineParts } from '../utils/dates'
import { parseTags } from '../utils/tags'
import { overdueSeverity } from '../utils/overdue'
import { describeRecurrence } from '../utils/recurrence'
import {
  ArchiveIcon,
  CalendarIcon,
  CopyIcon,
  EditIcon,
  GripIcon,
  LinkIcon,
  NotesIcon,
  OpenDetailsIcon,
  PinIcon,
  RepeatIcon,
  TagIcon,
  TrashIcon,
} from './icons'
import { TagList } from './TagList'
import { DayContext } from './DayContext'
import { TaskDetailDialog } from './TaskDetailDialog'
import { Checkbox } from './Checkbox'
import {
  getPostponeSummary,
  isTaskPlannedForToday,
  isTaskUpcoming,
  validateStartDate,
} from '../utils/taskFields'
import { formatCapacitySummary, getCapacitySummary } from '../utils/workload'

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
  onTogglePlan,
  onPromote,
  contextLabel,
  expandTaskId,
  focused = false,
  onTaskFocus,
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

    const expandFrame = requestAnimationFrame(() => {
      setIsExpanded(true)
    })

    return () => {
      cancelAnimationFrame(expandFrame)
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

    if (!editTitle.trim() || validateStartDate(task.startDate, editDeadline)) {
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

  const { day, month } = task.deadline ? getDeadlineParts(task.deadline) : { day: '—', month: 'No date' }
  const severity = overdueSeverity(task)
  const checklistDone = task.checklist.filter((item) => item.done).length
  const plannedForToday = isTaskPlannedForToday(task)
  const upcoming = isTaskUpcoming(task)
  const postpone = getPostponeSummary(task)
  const capacity = task.deadline ? getCapacitySummary(allTasks, task.deadline) : null

  const classNames = ['task']
  if (task.done) classNames.push('done')
  if (task.pinned) classNames.push('pinned')
  if (task.status === 'waiting') classNames.push('waiting')
  if (selected) classNames.push('selected')
  if (severity > 0) classNames.push(`overdue-${severity}`)

  return (
    <li
      ref={taskRef}
      className={classNames.join(' ')}
      data-task-id={task.id}
      tabIndex={focused ? 0 : -1}
      onFocus={() => onTaskFocus?.(task.id)}
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
              min={task.startDate || undefined}
              onChange={(event) => setEditDeadline(event.target.value)}
              required
            />
          </label>

          <DayContext mode="deadline" tasks={allTasks} value={editDeadline} excludeId={task.id} />

          {validateStartDate(task.startDate, editDeadline) && (
            <p className="field-error" role="alert">
              Move the start date on or before the new deadline first.
            </p>
          )}

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
            {!task.deadline && onPromote && (
              <label className="nodate-deadline"><span>Set a deadline</span><input type="date" onChange={(event) => { if (event.target.value) onPromote(task.id, event.target.value) }} /></label>
            )}
            <div className="task-meta">
              <span className={severity > 0 ? 'countdown overdue' : 'countdown'}>
                {task.deadline ? getCountdownLabel(task.deadline) : 'No deadline'}
              </span>

              {contextLabel && <span className="task-context">{contextLabel}</span>}
              {task.status === 'waiting' && (
                <span className="task-context waiting-label">
                  Waiting{task.waitingFor ? ` for ${task.waitingFor}` : ''}
                  {task.followUpDate ? ` · follow up ${formatDate(task.followUpDate)}` : ''}
                </span>
              )}
              {task.scheduledStart && (
                <span className="task-context scheduled-label">
                  Scheduled {formatDate(task.scheduledStart.slice(0, 10))} · {task.scheduledStart.slice(11, 16)}
                </span>
              )}
              {plannedForToday && (
                <span className="task-context planned">
                  Planned today · due {formatDate(task.deadline)}
                </span>
              )}
              {task.priority && (
                <span className={task.priority === 'high' ? 'priority-mark high' : 'priority-mark'}>
                  {task.priority === 'high' ? '!' : '·'} {task.priority} priority
                </span>
              )}
              {postpone.count > 0 && (
                <span className="task-flag text">
                  Postponed {postpone.count}×
                </span>
              )}
              {capacity && (
                <span className={capacity.overBy > 0 ? 'capacity-statement over' : 'capacity-statement'}>
                  {formatCapacitySummary(capacity)}
                </span>
              )}

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
                aria-label={isExpanded ? `Close ${task.title} details` : `Open ${task.title} details`}
                title="Details"
              >
                <OpenDetailsIcon />
              </button>

              <button
                type="button"
                className={plannedForToday ? 'icon-mini is-on' : 'icon-mini'}
                onClick={() => onTogglePlan(task.id)}
                disabled={upcoming || task.status === 'waiting'}
                aria-pressed={plannedForToday}
                aria-label={
                  plannedForToday
                    ? `Remove ${task.title} from today's plan`
                    : `Plan ${task.title} for today`
                }
                title={
                  upcoming
                    ? `Available ${formatDate(task.startDate)}`
                    : task.status === 'waiting'
                      ? 'Waiting tasks are not actionable'
                      : plannedForToday
                        ? 'Remove from today'
                        : 'Plan for today'
                }
              >
                <CalendarIcon />
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

          </div>
        </div>
      )}

      {isExpanded && (
        <TaskDetailDialog
          task={task}
          handlers={{ ...detailHandlers, onUpdate }}
          onClose={() => setIsExpanded(false)}
        />
      )}
    </li>
  )
}
