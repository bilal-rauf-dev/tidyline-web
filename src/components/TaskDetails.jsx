import { useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  CloseIcon,
  LinkIcon,
  MapPinIcon,
  NotesIcon,
  PaperclipIcon,
  PlusIcon,
} from './icons'
import { ReminderPicker } from './ReminderPicker'
import { RecurrencePicker } from './RecurrencePicker'
import { mapsSearchUrl } from '../utils/maps'

function UrlRow({ label, placeholder, onAdd }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  function submit() {
    if (!name.trim() || !url.trim()) {
      return
    }

    onAdd({ label: name.trim(), url: url.trim() })
    setName('')
    setUrl('')
  }

  return (
    <div className="detail-add-row">
      <input
        type="text"
        value={name}
        placeholder={label}
        aria-label={label}
        onChange={(event) => setName(event.target.value)}
      />
      <input
        type="url"
        value={url}
        placeholder={placeholder}
        aria-label={`${label} URL`}
        onChange={(event) => setUrl(event.target.value)}
      />
      <button type="button" className="icon-action" onClick={submit} aria-label={`Add ${label}`}>
        <PlusIcon />
      </button>
    </div>
  )
}

export function TaskDetails({ task, handlers }) {
  const [checklistDraft, setChecklistDraft] = useState('')

  return (
    <div className="task-details-panel">
      <label className="field-icon">
        <span className="field-icon-head">
          <NotesIcon />
          Notes
        </span>
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
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handlers.onToggleChecklistItem(task.id, item.id)}
                  />
                  <span>{item.text}</span>
                </label>

                <button
                  type="button"
                  className="icon-mini"
                  disabled={index === 0}
                  onClick={() => handlers.onMoveChecklistItem(task.id, item.id, -1)}
                  aria-label={`Move ${item.text} up`}
                >
                  <ArrowUpIcon />
                </button>
                <button
                  type="button"
                  className="icon-mini"
                  disabled={index === task.checklist.length - 1}
                  onClick={() => handlers.onMoveChecklistItem(task.id, item.id, 1)}
                  aria-label={`Move ${item.text} down`}
                >
                  <ArrowDownIcon />
                </button>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => handlers.onRemoveChecklistItem(task.id, item.id)}
                  aria-label={`Remove ${item.text}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="detail-add-row">
          <input
            type="text"
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
        <span className="field-icon-head">
          <LinkIcon />
          Links
        </span>

        {task.links.length > 0 && (
          <ul className="detail-list">
            {task.links.map((link) => (
              <li key={link.id}>
                <a href={link.url} target="_blank" rel="noreferrer noopener">
                  {link.label}
                </a>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => handlers.onRemoveLink(task.id, link.id)}
                  aria-label={`Remove link ${link.label}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <UrlRow
          label="Link label"
          placeholder="https://…"
          onAdd={(link) => handlers.onAddLink(task.id, link)}
        />
      </div>

      <div className="detail-block">
        <span className="field-icon-head">
          <PaperclipIcon />
          Attachments
        </span>
        <p className="detail-note">
          References to files hosted elsewhere — this app has no backend, so
          nothing is uploaded or stored locally.
        </p>

        {task.attachments.length > 0 && (
          <ul className="detail-list">
            {task.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a href={attachment.url} target="_blank" rel="noreferrer noopener">
                  {attachment.label}
                </a>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => handlers.onRemoveAttachment(task.id, attachment.id)}
                  aria-label={`Remove attachment ${attachment.label}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <UrlRow
          label="File name"
          placeholder="https://…"
          onAdd={(attachment) => handlers.onAddAttachment(task.id, attachment)}
        />
      </div>

      <div className="detail-grid">
        <label className="field-icon">
          <span className="field-icon-head">
            <MapPinIcon />
            Location
          </span>
          <input
            type="text"
            value={task.location}
            placeholder="Room 4, or an address"
            onChange={(event) => handlers.onUpdate(task.id, { location: event.target.value })}
          />
        </label>

        <label className="field-icon">
          <span className="field-icon-head">
            <ClockIcon />
            Estimate
          </span>
          <div className="duration-row">
            <input
              type="number"
              min="0"
              value={task.duration?.value ?? ''}
              placeholder="0"
              aria-label="Estimated duration"
              onChange={(event) => {
                const value = event.target.value
                handlers.onUpdate(task.id, {
                  duration: value === '' ? null : { value: Number(value), unit: task.duration?.unit ?? 'min' },
                })
              }}
            />
            <select
              value={task.duration?.unit ?? 'min'}
              aria-label="Duration unit"
              onChange={(event) =>
                handlers.onUpdate(task.id, {
                  duration: { value: task.duration?.value ?? 0, unit: event.target.value },
                })
              }
            >
              <option value="min">minutes</option>
              <option value="hr">hours</option>
            </select>
          </div>
        </label>
      </div>

      {task.location && (
        <a
          className="link-button"
          href={mapsSearchUrl(task.location)}
          target="_blank"
          rel="noreferrer noopener"
        >
          Look up “{task.location}” on a map
        </a>
      )}

      <RecurrencePicker
        recurrence={task.recurrence}
        onChange={(recurrence) => handlers.onSetRecurrence(task.id, recurrence)}
      />

      <ReminderPicker
        task={task}
        reminders={task.reminders}
        onAdd={(reminder) => handlers.onAddReminder(task.id, reminder)}
        onRemove={(reminderId) => handlers.onRemoveReminder(task.id, reminderId)}
      />
    </div>
  )
}
