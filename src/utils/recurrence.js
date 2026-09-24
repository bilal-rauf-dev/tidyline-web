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

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return toDateStr(date) === value ? date : null
}

function clampedDate(year, monthIndex, day) {
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth(year, monthIndex)))
}

function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
}

export function normalizeRecurrence(recurrence, anchorDateStr = null) {
  if (!recurrence || typeof recurrence !== 'object' || Array.isArray(recurrence)) {
    return null
  }

  const anchor = parseDate(anchorDateStr)

  switch (recurrence.freq) {
    case 'daily':
    case 'weekdays':
      return { freq: recurrence.freq }
    case 'weekly': {
      const weekday = Number(recurrence.weekday)
      return {
        freq: 'weekly',
        weekday: Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
          ? weekday
          : anchor?.getDay() ?? 1,
      }
    }
    case 'everyNDays': {
      const interval = Math.floor(Number(recurrence.n))
      return { freq: 'everyNDays', n: Number.isFinite(interval) ? Math.max(1, interval) : 2 }
    }
    case 'monthly': {
      const anchorDay = Number(recurrence.anchorDay)
      return {
        freq: 'monthly',
        anchorDay:
          Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31
            ? anchorDay
            : anchor?.getDate() ?? 1,
      }
    }
    case 'yearly': {
      const anchorMonth = Number(recurrence.anchorMonth)
      const anchorDay = Number(recurrence.anchorDay)
      return {
        freq: 'yearly',
        anchorMonth:
          Number.isInteger(anchorMonth) && anchorMonth >= 1 && anchorMonth <= 12
            ? anchorMonth
            : (anchor?.getMonth() ?? 0) + 1,
        anchorDay:
          Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31
            ? anchorDay
            : anchor?.getDate() ?? 1,
      }
    }
    default:
      return null
  }
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

/**
 * Find the next occurrence after both the current instance and `afterDateStr`.
 * Passing a completion date skips missed instances instead of creating backlog.
 */
export function nextOccurrence(recurrence, fromDateStr, afterDateStr = fromDateStr) {
  const base = parseDate(fromDateStr)
  if (!base) return null

  const rule = normalizeRecurrence(recurrence, fromDateStr)
  if (!rule) return null

  const requestedThreshold = parseDate(afterDateStr)
  const threshold = requestedThreshold && requestedThreshold > base ? requestedThreshold : base

  switch (rule.freq) {
    case 'daily': {
      const next = new Date(threshold)
      next.setDate(next.getDate() + 1)
      return toDateStr(next)
    }
    case 'everyNDays': {
      const elapsed = calendarDayNumber(threshold) - calendarDayNumber(base)
      const intervals = Math.floor(elapsed / rule.n) + 1
      const next = new Date(base)
      next.setDate(next.getDate() + intervals * rule.n)
      return toDateStr(next)
    }
    case 'weekdays': {
      const next = new Date(threshold)
      do {
        next.setDate(next.getDate() + 1)
      } while (next.getDay() === 0 || next.getDay() === 6)
      return toDateStr(next)
    }
    case 'weekly': {
      const next = new Date(threshold)
      do {
        next.setDate(next.getDate() + 1)
      } while (next.getDay() !== rule.weekday)
      return toDateStr(next)
    }
    case 'monthly': {
      const baseMonth = base.getFullYear() * 12 + base.getMonth() + 1
      let targetMonth = Math.max(
        baseMonth,
        threshold.getFullYear() * 12 + threshold.getMonth(),
      )
      let next = clampedDate(
        Math.floor(targetMonth / 12),
        targetMonth % 12,
        rule.anchorDay,
      )
      if (next <= threshold) {
        targetMonth += 1
        next = clampedDate(
          Math.floor(targetMonth / 12),
          targetMonth % 12,
          rule.anchorDay,
        )
      }
      return toDateStr(next)
    }
    case 'yearly': {
      let targetYear = Math.max(base.getFullYear() + 1, threshold.getFullYear())
      let next = clampedDate(targetYear, rule.anchorMonth - 1, rule.anchorDay)
      if (next <= threshold) {
        targetYear += 1
        next = clampedDate(targetYear, rule.anchorMonth - 1, rule.anchorDay)
      }
      return toDateStr(next)
    }
    default:
      return null
  }
}

/** Does a given Date fall on the recurrence? Used for recurring reminders. */
export function matchesRecurrence(date, recurrence, anchorDateStr) {
  const anchor = parseDate(anchorDateStr)
  const rule = normalizeRecurrence(recurrence, anchorDateStr)
  if (!rule || !(date instanceof Date) || Number.isNaN(date.getTime())) return false
  if (anchor && toDateStr(date) < anchorDateStr) return false

  switch (rule.freq) {
    case 'daily':
      return true
    case 'weekdays':
      return date.getDay() >= 1 && date.getDay() <= 5
    case 'weekly':
      return date.getDay() === rule.weekday
    case 'monthly':
      return date.getDate() === Math.min(
        rule.anchorDay,
        lastDayOfMonth(date.getFullYear(), date.getMonth()),
      )
    case 'yearly': {
      if (date.getMonth() !== rule.anchorMonth - 1) return false
      return date.getDate() === Math.min(
        rule.anchorDay,
        lastDayOfMonth(date.getFullYear(), date.getMonth()),
      )
    }
    case 'everyNDays': {
      if (!anchor) return false
      const days = calendarDayNumber(date) - calendarDayNumber(anchor)
      return days >= 0 && days % rule.n === 0
    }
    default:
      return false
  }
}
