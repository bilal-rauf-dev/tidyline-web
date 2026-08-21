import { useState } from 'react'
import {
  ClockIcon,
  CloseIcon,
  LinkIcon,
  MapPinIcon,
  NotesIcon,
  PlusIcon,
} from './icons'
import { SelectMenu } from './SelectMenu'
import { RecurrencePicker } from './RecurrencePicker'

function LinkDraft({ draft, onChange }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function add() {
    if (!label.trim() || !url.trim()) return
    onChange({
      ...draft,
      links: [...draft.links, { id: crypto.randomUUID(), label: label.trim(), url: url.trim() }],
    })
    setLabel('')
    setUrl('')
  }

  return (
    <div className="detail-add-row">
      <input value={label} placeholder="Link label" aria-label="Link label" onChange={(event) => setLabel(event.target.value)} />
      <input type="url" value={url} placeholder="https://…" aria-label="Link URL" onChange={(event) => setUrl(event.target.value)} />
      <button type="button" className="icon-action" onClick={add} aria-label="Add link">
        <PlusIcon />
      </button>
    </div>
  )
}

export function TaskDraftDetails({ draft, onChange }) {
  function addChecklistItem() {
    const text = draft.checklistDraft.trim()
    if (!text) return
    onChange({
      ...draft,
      checklist: [...draft.checklist, { id: crypto.randomUUID(), text, done: false }],
      checklistDraft: '',
    })
  }

  return (
    <div className="task-draft-details">
      <label className="field-icon">
        <span className="field-icon-head"><NotesIcon />Notes</span>
        <textarea
          rows="3"
          value={draft.notes}
          placeholder="Anything worth remembering"
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
      </label>

      <div className="detail-block">
        <span className="field-icon-head">Checklist</span>
        {draft.checklist.length > 0 && (
          <ul className="detail-list">
            {draft.checklist.map((item) => (
              <li key={item.id}>
                <span>{item.text}</span>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => onChange({ ...draft, checklist: draft.checklist.filter((entry) => entry.id !== item.id) })}
                  aria-label={`Remove ${item.text}`}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="detail-add-row draft-single-row">
          <input
            value={draft.checklistDraft}
            placeholder="Add a sub-item"
            aria-label="New checklist item"
            onChange={(event) => onChange({ ...draft, checklistDraft: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addChecklistItem()
              }
            }}
          />
          <button type="button" className="icon-action" onClick={addChecklistItem} aria-label="Add checklist item">
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="detail-block">
        <span className="field-icon-head"><LinkIcon />Links</span>
        <LinkDraft draft={draft} onChange={onChange} />
      </div>

      <div className="detail-grid">
        <label className="field-icon">
          <span className="field-icon-head"><MapPinIcon />Location</span>
          <input
            value={draft.location}
            placeholder="Room 4, or an address"
            onChange={(event) => onChange({ ...draft, location: event.target.value })}
          />
        </label>

        <label className="field-icon">
          <span className="field-icon-head"><ClockIcon />Estimate</span>
          <div className="duration-row">
            <input
              type="number"
              min="1"
              value={draft.durationValue}
              placeholder="Minutes"
              aria-label="Estimated duration"
              onChange={(event) => onChange({ ...draft, durationValue: event.target.value })}
            />
            <SelectMenu
              value={draft.durationUnit}
              ariaLabel="Duration unit"
              options={[{ value: 'min', label: 'minutes' }, { value: 'hr', label: 'hours' }]}
              onChange={(value) => onChange({ ...draft, durationUnit: value })}
            />
          </div>
        </label>
      </div>

      <RecurrencePicker recurrence={draft.recurrence} onChange={(recurrence) => onChange({ ...draft, recurrence })} />
    </div>
  )
}
