import { useState } from 'react'
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
import { Checkbox } from './Checkbox'
import { DayContext } from './DayContext'
import { TagList } from './TagList'
import { TaskDetailDialog } from './TaskDetailDialog'
import { describeRecurrence } from '../utils/recurrence'
import { formatDate, getDeadlineParts } from '../utils/dates'
import { parseTags } from '../utils/tags'
import { durationToMinutes, estimateTaskDuration, formatMinutes } from '../utils/calibration'
import { getFitAssessment, getTaskTimingLabel } from '../utils/timeAwareness'

export function TaskCard({
  task,
  allTasks = [],
  referenceDate = new Date(),
  selectionMode,
  selected,
  onSelect,
  onToggle,
  onStart,
  onPause,
  onDelete,
  onUpdate,
  onTogglePin,
  onArchive,
  onUnarchive,
  onDuplicate,
  contextLabel,
  expandTaskId,
  ...detailHandlers
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(() => expandTaskId === task.id)
  const [title, setTitle] = useState(task.title)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [tags, setTags] = useState((task.tags ?? []).join(', '))

  function startEditing() {
    setTitle(task.title)
    setDeadline(task.deadline ?? '')
    setTags((task.tags ?? []).join(', '))
    setIsEditing(true)
  }

  function saveEdit(event) {
    event.preventDefault()
    if (!title.trim()) return
    onUpdate(task.id, { title: title.trim(), deadline: deadline || null, tags: parseTags(tags) })
    setIsEditing(false)
  }

  const deadlineParts = task.deadline ? getDeadlineParts(task.deadline) : null
  const estimateMinutes = durationToMinutes(task.duration)
  const expected = task.duration ? estimateTaskDuration(task, allTasks) : null
  const fit = getFitAssessment(task, allTasks, referenceDate)
  const checklistDone = task.checklist.filter((item) => item.done).length
  const classNames = ['task']
  if (task.done) classNames.push('done')
  if (task.pinned) classNames.push('pinned')
  if (selected) classNames.push('selected')

  return (
    <li
      className={classNames.join(' ')}
      data-task-id={task.id}
      tabIndex={0}
      draggable={!selectionMode && !isEditing}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="task-top">
        {selectionMode ? (
          <label className="task-select">
            <Checkbox checked={selected} onChange={() => onSelect(task.id)} aria-label={`Select ${task.title}`} />
          </label>
        ) : (
          <span className="task-grip" aria-hidden="true"><GripIcon /></span>
        )}
        <strong>{task.title}</strong>
        {!task.done && !task.archived && (
          <button
            type="button"
            className={task.startedAt ? 'task-start active' : 'task-start'}
            onClick={() => (task.startedAt ? onPause(task.id) : onStart(task.id))}
            aria-pressed={Boolean(task.startedAt)}
          >
            {task.startedAt ? 'Pause' : task.actualMinutes ? 'Resume' : 'Start'}
          </button>
        )}
        <label className="task-toggle">
          <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
          Done
        </label>
      </div>

      {isEditing ? (
        <form className="task-edit-form" onSubmit={saveEdit}>
          <div className="field-underline">
            <input className="input-underline" value={title} aria-label="Task name" onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <label className="field-icon">
            <span className="field-icon-head"><CalendarIcon />Due</span>
            <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>
          <DayContext mode="deadline" tasks={allTasks} value={deadline} excludeId={task.id} />
          <label className="field-icon">
            <span className="field-icon-head"><TagIcon />Tags</span>
            <input value={tags} placeholder="design, university" onChange={(event) => setTags(event.target.value)} />
          </label>
          <div className="task-edit-actions">
            <button type="submit" className="primary">Save</button>
            <button type="button" className="secondary" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="task-body">
          {deadlineParts ? (
            <div className="deadline-stat">
              <strong>{deadlineParts.day}</strong>
              <span>{deadlineParts.month}</span>
            </div>
          ) : (
            <div className="deadline-stat"><strong>—</strong><span>No date</span></div>
          )}

          <div className="task-details">
            <div className="task-meta">
              <span className="countdown">
                {getTaskTimingLabel(task, allTasks, referenceDate)}
              </span>
              {fit && <span className={`fit-label fit-${fit.level}`}>{fit.label}</span>}
              {contextLabel && <span className="task-context">{contextLabel}</span>}
              {task.recurrence && <span className="task-flag" title={describeRecurrence(task.recurrence)}><RepeatIcon /></span>}
              {task.notes && <span className="task-flag" title="Has notes"><NotesIcon /></span>}
              {task.links.length > 0 && <span className="task-flag" title={`${task.links.length} link(s)`}><LinkIcon /></span>}
              {task.checklist.length > 0 && <span className="task-flag text">{checklistDone}/{task.checklist.length}</span>}
              {task.duration && (
                <span className="task-flag text" title="Estimated and calibrated duration">
                  {formatMinutes(estimateMinutes)}
                  {expected.source === 'calibrated' ? ` · usually ~${formatMinutes(expected.minutes)}` : ''}
                </span>
              )}
              {task.startedAt && <span className="task-flag text timing-active">In progress</span>}
              {task.resurfaceDate && <span className="task-flag text">Back {formatDate(task.resurfaceDate)}</span>}
              {task.done && task.actualMinutes && <span className="task-flag text">Took {formatMinutes(task.actualMinutes)}</span>}
            </div>

            <TagList tags={task.tags} />

            <div className="task-actions">
              <button type="button" className={isExpanded ? 'icon-mini is-on' : 'icon-mini'} onClick={() => setIsExpanded((value) => !value)} aria-expanded={isExpanded} aria-label={isExpanded ? `Close ${task.title} details` : `Open ${task.title} details`} title="Details"><OpenDetailsIcon /></button>
              <button type="button" className={task.pinned ? 'icon-mini is-on' : 'icon-mini'} onClick={() => onTogglePin(task.id)} aria-pressed={task.pinned} aria-label={task.pinned ? `Unpin ${task.title}` : `Pin ${task.title}`} title={task.pinned ? 'Unpin' : 'Pin to top'}><PinIcon /></button>
              <button type="button" className="icon-mini" onClick={startEditing} aria-label={`Edit ${task.title}`} title="Edit"><EditIcon /></button>
              <button type="button" className="icon-mini" onClick={() => onDuplicate(task.id)} aria-label={`Duplicate ${task.title}`} title="Duplicate"><CopyIcon /></button>
              <button type="button" className="icon-mini" onClick={() => (task.archived ? onUnarchive(task.id) : onArchive(task.id))} aria-label={`${task.archived ? 'Restore' : 'Archive'} ${task.title}`} title={task.archived ? 'Restore' : 'Archive'}><ArchiveIcon /></button>
              <button type="button" className="icon-mini danger" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`} title="Delete permanently"><TrashIcon /></button>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <TaskDetailDialog task={task} allTasks={allTasks} referenceDate={referenceDate} handlers={{ ...detailHandlers, onUpdate, onStart, onPause }} onClose={() => setIsExpanded(false)} />
      )}
    </li>
  )
}
