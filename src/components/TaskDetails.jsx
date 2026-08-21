import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  LinkIcon,
  MapPinIcon,
  NotesIcon,
  PlusIcon,
} from './icons'
import { ReminderPicker } from './ReminderPicker'
import { RecurrencePicker } from './RecurrencePicker'
import { mapsSearchUrl } from '../utils/maps'
import { Checkbox } from './Checkbox'
import { SelectMenu } from './SelectMenu'
import { durationToMinutes, estimateTaskDuration, formatMinutes } from '../utils/calibration'
import { deriveStartBy, getFitAssessment } from '../utils/timeAwareness'
import { formatDate } from '../utils/dates'

function LinkRow({ onAdd }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function submit() {
    if (!label.trim() || !url.trim()) return
    onAdd({ label: label.trim(), url: url.trim() })
    setLabel('')
    setUrl('')
  }

  return (
    <div className="detail-add-row">
      <input value={label} placeholder="Link label" aria-label="Link label" onChange={(event) => setLabel(event.target.value)} />
      <input type="url" value={url} placeholder="https://…" aria-label="Link URL" onChange={(event) => setUrl(event.target.value)} />
      <button type="button" className="icon-action" onClick={submit} aria-label="Add link">
        <PlusIcon />
      </button>
    </div>
  )
}

export function TaskDetails({ task, allTasks, referenceDate, handlers }) {
  const [checklistDraft, setChecklistDraft] = useState('')
  const expected = estimateTaskDuration(task, allTasks)
  const estimateMinutes = durationToMinutes(task.duration)
  const startBy = deriveStartBy(task, allTasks, referenceDate)
  const fit = getFitAssessment(task, allTasks, referenceDate)

  return (
    <div className="task-details-panel">
      <div className="detail-block timing-block">
        <span className="field-icon-head"><ClockIcon />Time</span>
        <p className="timing-summary">
          {estimateMinutes ? `Estimated ${formatMinutes(estimateMinutes)}` : 'No estimate yet'}
          {estimateMinutes && expected.source === 'calibrated' ? ` · usually ~${formatMinutes(expected.minutes)}` : ''}
          {task.actualMinutes ? ` · ${task.done ? 'took' : 'logged'} ${formatMinutes(task.actualMinutes)}` : ''}
        </p>
        {startBy && <p className="timing-summary">Start by {formatDate(startBy)}{fit ? ` · ${fit.label}` : ''}</p>}
        {!task.done && !task.archived && (
          <button
            type="button"
            className={task.startedAt ? 'secondary timing-button active' : 'primary timing-button'}
            onClick={() => (task.startedAt ? handlers.onPause(task.id) : handlers.onStart(task.id))}
          >
            {task.startedAt ? 'Pause' : task.actualMinutes ? 'Resume' : 'Start'}
          </button>
        )}
      </div>
      <label className="field-icon">
        <span className="field-icon-head"><NotesIcon />Notes</span>
        <textarea
          rows="3"
          value={task.notes}
          placeholder="Anything worth remembering"
          onChange={(event) => handlers.onUpdate(task.id, { notes: event.target.value })}
        />
      </label>

      <div className="detail-block">
        <span className="field-icon-head">
          Checklist
          {task.checklist.length > 0 && (
            <span className="detail-count">
              {task.checklist.filter((item) => item.done).length}/{task.checklist.length}
            </span>
          )}
        </span>

        {task.checklist.length > 0 && (
          <ul className="checklist">
            {task.checklist.map((item, index) => (
              <li key={item.id} className={item.done ? 'done' : undefined}>
                <label>
                  <Checkbox checked={item.done} onChange={() => handlers.onToggleChecklistItem(task.id, item.id)} />
                  <span>{item.text}</span>
                </label>
                <button type="button" className="icon-mini" disabled={index === 0} onClick={() => handlers.onMoveChecklistItem(task.id, item.id, -1)} aria-label={`Move ${item.text} up`}>
                  <ArrowUpIcon />
                </button>
                <button type="button" className="icon-mini" disabled={index === task.checklist.length - 1} onClick={() => handlers.onMoveChecklistItem(task.id, item.id, 1)} aria-label={`Move ${item.text} down`}>
                  <ArrowDownIcon />
                </button>
                <button type="button" className="icon-mini" onClick={() => handlers.onRemoveChecklistItem(task.id, item.id)} aria-label={`Remove ${item.text}`}>
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="detail-add-row">
          <input
            value={checklistDraft}
            placeholder="Add a sub-item"
            aria-label="New checklist item"
            onChange={(event) => setChecklistDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handlers.onAddChecklistItem(task.id, checklistDraft)
                setChecklistDraft('')
              }
            }}
          />
          <button
            type="button"
            className="icon-action"
            aria-label="Add checklist item"
            onClick={() => {
              handlers.onAddChecklistItem(task.id, checklistDraft)
              setChecklistDraft('')
            }}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="detail-block">
        <span className="field-icon-head"><LinkIcon />Links</span>
        {task.links.length > 0 && (
          <ul className="detail-list">
            {task.links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer noopener">{link.label}</a>
                <button type="button" className="icon-mini" onClick={() => handlers.onRemoveLink(task.id, link.id)} aria-label={`Remove link ${link.label}`}>
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
        <LinkRow onAdd={(link) => handlers.onAddLink(task.id, link)} />
      </div>

      <div className="detail-grid">
        <label className="field-icon">
          <span className="field-icon-head"><CalendarIcon />Bring back on</span>
          <input
            type="date"
            max={task.deadline || undefined}
            value={task.resurfaceDate ?? ''}
            onChange={(event) => handlers.onUpdate(task.id, { resurfaceDate: event.target.value || null })}
          />
        </label>

        <label className="field-icon">
          <span className="field-icon-head"><MapPinIcon />Location</span>
          <input value={task.location} placeholder="Room 4, or an address" onChange={(event) => handlers.onUpdate(task.id, { location: event.target.value })} />
        </label>

        <label className="field-icon">
          <span className="field-icon-head"><ClockIcon />Estimate</span>
          <div className="duration-row">
            <input
              type="number"
              min="1"
              value={task.duration?.value ?? ''}
              placeholder="Minutes"
              aria-label="Estimated duration"
              onChange={(event) => {
                const value = event.target.value
                handlers.onUpdate(task.id, {
                  duration: value === '' ? null : { value: Number(value), unit: task.duration?.unit ?? 'min' },
                })
              }}
            />
            <SelectMenu
              value={task.duration?.unit ?? 'min'}
              ariaLabel="Duration unit"
              options={[{ value: 'min', label: 'minutes' }, { value: 'hr', label: 'hours' }]}
              onChange={(unit) => handlers.onUpdate(task.id, {
                duration: { value: task.duration?.value ?? 1, unit },
              })}
            />
          </div>
        </label>
      </div>

      {task.location && (
        <a className="link-button" href={mapsSearchUrl(task.location)} target="_blank" rel="noreferrer noopener">
          Look up “{task.location}” on a map
        </a>
      )}

      <RecurrencePicker recurrence={task.recurrence} onChange={(recurrence) => handlers.onSetRecurrence(task.id, recurrence)} />
      <ReminderPicker task={task} reminders={task.reminders} onAdd={(reminder) => handlers.onAddReminder(task.id, reminder)} onRemove={(reminderId) => handlers.onRemoveReminder(task.id, reminderId)} />
    </div>
  )
}
