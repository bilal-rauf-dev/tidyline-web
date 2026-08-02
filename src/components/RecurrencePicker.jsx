import { RECURRENCE_FREQUENCIES, WEEKDAY_NAMES } from '../utils/recurrence'
import { RepeatIcon } from './icons'

export function RecurrencePicker({ recurrence, onChange }) {
  const freq = recurrence?.freq ?? 'none'

  function setFreq(value) {
    if (value === 'none') {
      onChange(null)
      return
    }

    if (value === 'weekly') {
      onChange({ freq: 'weekly', weekday: recurrence?.weekday ?? 1 })
      return
    }

    if (value === 'everyNDays') {
      onChange({ freq: 'everyNDays', n: recurrence?.n ?? 2 })
      return
    }

    onChange({ freq: value })
  }

  return (
    <div className="recurrence-picker">
      <span className="field-icon-head">
        <RepeatIcon />
        Repeat
      </span>

      <div className="recurrence-row">
        <select
          value={freq}
          aria-label="Repeat frequency"
          onChange={(event) => setFreq(event.target.value)}
        >
          <option value="none">Does not repeat</option>
          {RECURRENCE_FREQUENCIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>

        {freq === 'weekly' && (
          <select
            value={recurrence?.weekday ?? 1}
            aria-label="Repeat weekday"
            onChange={(event) =>
              onChange({ freq: 'weekly', weekday: Number(event.target.value) })
            }
          >
            {WEEKDAY_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        )}

        {freq === 'everyNDays' && (
          <input
            type="number"
            min="1"
            max="365"
            value={recurrence?.n ?? 2}
            aria-label="Repeat every N days"
            onChange={(event) =>
              onChange({ freq: 'everyNDays', n: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        )}
      </div>
    </div>
  )
}
