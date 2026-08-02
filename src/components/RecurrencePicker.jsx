import { RECURRENCE_FREQUENCIES, WEEKDAY_NAMES } from '../utils/recurrence'
import { RepeatIcon } from './icons'
import { SelectMenu } from './SelectMenu'

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
        <SelectMenu
          value={freq}
          ariaLabel="Repeat frequency"
          options={[
            { value: 'none', label: 'Does not repeat' },
            ...RECURRENCE_FREQUENCIES,
          ]}
          onChange={setFreq}
        />

        {freq === 'weekly' && (
          <SelectMenu
            value={recurrence?.weekday ?? 1}
            ariaLabel="Repeat weekday"
            options={WEEKDAY_NAMES.map((name, index) => ({ value: index, label: name }))}
            onChange={(value) => onChange({ freq: 'weekly', weekday: Number(value) })}
          />
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
