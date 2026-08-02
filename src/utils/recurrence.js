import { toDateStr } from './calendar'

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const RECURRENCE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Weekly on…' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'everyNDays', label: 'Every N days' },
]

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Add months without rolling over (Jan 31 + 1 month => Feb 28/29). */
function addMonthsClamped(date, months) {
  const target = new Date(date)
  const day = target.getDate()
  target.setDate(1)
  target.setMonth(target.getMonth() + months)
  target.setDate(Math.min(day, lastDayOfMonth(target.getFullYear(), target.getMonth())))
  return target
}

export function describeRecurrence(recurrence) {
  if (!recurrence) {
    return 'Does not repeat'
  }

  switch (recurrence.freq) {
    case 'daily':
      return 'Repeats daily'
    case 'weekdays':
      return 'Repeats every weekday'
    case 'weekly':
      return `Repeats every ${WEEKDAY_NAMES[recurrence.weekday ?? 1]}`
    case 'monthly':
      return 'Repeats monthly'
    case 'yearly':
      return 'Repeats yearly'
    case 'everyNDays':
      return `Repeats every ${Math.max(1, recurrence.n ?? 2)} days`
    default:
      return 'Repeats'
  }
}

/** Next date strictly after `fromDateStr` that satisfies the rule. */
export function nextOccurrence(recurrence, fromDateStr) {
  if (!recurrence) {
    return null
  }

  const base = new Date(`${fromDateStr}T00:00:00`)

  if (Number.isNaN(base.getTime())) {
    return null
  }

  switch (recurrence.freq) {
    case 'daily': {
      base.setDate(base.getDate() + 1)
      return toDateStr(base)
    }
    case 'everyNDays': {
      base.setDate(base.getDate() + Math.max(1, recurrence.n ?? 2))
      return toDateStr(base)
    }
    case 'weekdays': {
      do {
        base.setDate(base.getDate() + 1)
      } while (base.getDay() === 0 || base.getDay() === 6)
      return toDateStr(base)
    }
    case 'weekly': {
      const target = recurrence.weekday ?? base.getDay()
      do {
        base.setDate(base.getDate() + 1)
      } while (base.getDay() !== target)
      return toDateStr(base)
    }
    case 'monthly':
      return toDateStr(addMonthsClamped(base, 1))
    case 'yearly':
      return toDateStr(addMonthsClamped(base, 12))
    default:
      return null
  }
}

/** Does a given Date fall on the recurrence? Used for recurring reminders. */
export function matchesRecurrence(date, recurrence, anchorDateStr) {
  if (!recurrence) {
    return false
  }

  const anchor = anchorDateStr ? new Date(`${anchorDateStr}T00:00:00`) : null

  switch (recurrence.freq) {
    case 'daily':
      return true
    case 'weekdays':
      return date.getDay() >= 1 && date.getDay() <= 5
    case 'weekly':
      return date.getDay() === (recurrence.weekday ?? 1)
    case 'monthly':
      return anchor ? date.getDate() === anchor.getDate() : false
    case 'yearly':
      return anchor
        ? date.getDate() === anchor.getDate() && date.getMonth() === anchor.getMonth()
        : false
    case 'everyNDays': {
      if (!anchor) return false
      const step = Math.max(1, recurrence.n ?? 2)
      const days = Math.round((date - anchor) / 86400000)
      return days >= 0 && days % step === 0
    }
    default:
      return false
  }
}
