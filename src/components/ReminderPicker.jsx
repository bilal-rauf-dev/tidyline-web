import { useState } from 'react'
import { REMINDER_PRESETS, buildReminder, describeReminder } from '../utils/reminders'
import { ensureNotificationPermission } from '../utils/notifications'
import { BellIcon, CloseIcon, PlusIcon } from './icons'
import { SelectMenu } from './SelectMenu'

/**
 * Preset-first reminder control. The raw datetime picker survives as the
 * "custom" fallback rather than being the only way in.
 */
export function ReminderPicker({ reminders, onAdd, onRemove, task }) {
  const [preset, setPreset] = useState(REMINDER_PRESETS[0].id)
  const [customAt, setCustomAt] = useState('')

  function submit() {
    const reminder = buildReminder(preset, { customAt })

    if (!reminder) {
      return
    }

    ensureNotificationPermission()
    onAdd(reminder)
    setCustomAt('')
  }

  return (
    <div className="reminder-picker">
      <span className="field-icon-head">
        <BellIcon />
        Reminders
      </span>
      <small className="reminder-truth">Alerts are checked only while TidyLine is open.</small>

      {reminders.length > 0 && (
        <ul className="reminder-strip">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <span className="reminder-dot" aria-hidden="true" />
              <span>{describeReminder(reminder, task)}</span>
              <button
                type="button"
                className="icon-mini"
                onClick={() => onRemove(reminder.id)}
                aria-label={`Remove reminder ${describeReminder(reminder, task)}`}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="reminder-picker-row">
        <SelectMenu
          value={preset}
          ariaLabel="Reminder preset"
          options={[
            ...REMINDER_PRESETS.map((entry) => ({ value: entry.id, label: entry.label })),
            { value: 'custom', label: 'Custom date & time…' },
          ]}
          onChange={setPreset}
        />

        {preset === 'custom' && (
          <input
            type="datetime-local"
            value={customAt}
            aria-label="Custom reminder time"
            onChange={(event) => setCustomAt(event.target.value)}
          />
        )}

        <button
          type="button"
          className="icon-action"
          onClick={submit}
          aria-label="Add reminder"
          title="Add reminder"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  )
}
