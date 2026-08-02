import {
  ClockIcon,
  CloseIcon,
  LinkIcon,
  MapPinIcon,
  NotesIcon,
  PaperclipIcon,
  PlusIcon,
} from './icons'
import { RecurrencePicker } from './RecurrencePicker'
import { SelectMenu } from './SelectMenu'

function addNamedUrl(draft, onChange, type) {
  const labelKey = type === 'links' ? 'linkLabel' : 'attachmentLabel'
  const urlKey = type === 'links' ? 'linkUrl' : 'attachmentUrl'
  const label = draft[labelKey].trim()
  const url = draft[urlKey].trim()

  if (!label || !url) {
    return
  }

  onChange({
    ...draft,
    [type]: [...draft[type], { id: crypto.randomUUID(), label, url }],
    [labelKey]: '',
    [urlKey]: '',
  })
}

function UrlDraft({ draft, onChange, type, label, urlLabel }) {
  const labelKey = type === 'links' ? 'linkLabel' : 'attachmentLabel'
  const urlKey = type === 'links' ? 'linkUrl' : 'attachmentUrl'

  return (
    <>
      {draft[type].length > 0 && (
        <ul className="detail-list">
          {draft[type].map((entry) => (
            <li key={entry.id}>
              <span>{entry.label}</span>
              <button
                type="button"
                className="icon-mini"
                onClick={() =>
                  onChange({ ...draft, [type]: draft[type].filter((item) => item.id !== entry.id) })
                }
                aria-label={`Remove ${entry.label}`}
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
          value={draft[labelKey]}
          placeholder={label}
          aria-label={label}
          onChange={(event) => onChange({ ...draft, [labelKey]: event.target.value })}
        />
        <input
          type="url"
          value={draft[urlKey]}
          placeholder="https://…"
          aria-label={urlLabel}
          onChange={(event) => onChange({ ...draft, [urlKey]: event.target.value })}
        />
        <button
          type="button"
          className="icon-action"
          onClick={() => addNamedUrl(draft, onChange, type)}
          aria-label={`Add ${label.toLowerCase()}`}
        >
          <PlusIcon />
        </button>
      </div>
    </>
  )
}

export function TaskDraftDetails({ draft, onChange }) {
  function addChecklistItem() {
    const text = draft.checklistDraft.trim()

    if (!text) {
      return
    }

    onChange({
      ...draft,
      checklist: [...draft.checklist, { id: crypto.randomUUID(), text, done: false }],
      checklistDraft: '',
    })
  }

  return (
    <div className="task-draft-details">
      <label className="field-icon">
        <span className="field-icon-head">
          <NotesIcon />
          Notes
        </span>
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
                  onClick={() =>
                    onChange({
                      ...draft,
                      checklist: draft.checklist.filter((entry) => entry.id !== item.id),
                    })
                  }
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
            type="text"
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
        <UrlDraft draft={draft} onChange={onChange} type="links" label="Link label" urlLabel="Link URL" />
      </div>

      <div className="detail-block">
        <span className="field-icon-head"><PaperclipIcon />Attachments</span>
        <UrlDraft draft={draft} onChange={onChange} type="attachments" label="File name" urlLabel="Attachment URL" />
      </div>

      <div className="detail-grid">
        <label className="field-icon">
          <span className="field-icon-head"><MapPinIcon />Location</span>
          <input
            type="text"
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
              min="0"
              value={draft.durationValue}
              placeholder="0"
              aria-label="Estimated duration"
              onChange={(event) => onChange({ ...draft, durationValue: event.target.value })}
            />
            <SelectMenu
              value={draft.durationUnit}
              ariaLabel="Duration unit"
              options={[
                { value: 'min', label: 'minutes' },
                { value: 'hr', label: 'hours' },
              ]}
              onChange={(value) => onChange({ ...draft, durationUnit: value })}
            />
          </div>
        </label>
      </div>

      <RecurrencePicker
        recurrence={draft.recurrence}
        onChange={(recurrence) => onChange({ ...draft, recurrence })}
      />
    </div>
  )
}
