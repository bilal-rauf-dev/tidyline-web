import { toDateStr } from './calendar'

export const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A date-only deadline has no clock time, so we pin one: 09:00 local is
 * treated as the moment a task is "due". Used for "N before deadline"
 * reminders and for the "tomorrow morning" preset.
 */
export const DEADLINE_HOUR = 9

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * The single date-diff implementation in the app. Whole days from the
 * reference day to a deadline; negative means overdue. Bucketing, countdown
 * labels and overdue grouping all derive from this one function.
 */
export function daysUntil(deadline, referenceDate = new Date()) {
  const from = startOfDay(referenceDate)
  const to = new Date(`${deadline}T00:00:00`)
  return Math.round((to - from) / DAY_MS)
}

/** Concrete instant a date-only deadline is considered due. */
export function deadlineMoment(deadline) {
  const at = new Date(`${deadline}T00:00:00`)
  at.setHours(DEADLINE_HOUR, 0, 0, 0)
  return at
}

export function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function getDeadlineParts(value) {
  const date = new Date(`${value}T00:00:00`)
  return {
    day: new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date),
  }
}

export function formatDateTime(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** Human countdown, derived from daysUntil — not a second diff implementation. */
export function getCountdownLabel(deadline, referenceDate = new Date()) {
  const days = daysUntil(deadline, referenceDate)

  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) return `${Math.abs(days)} days overdue`

  return `${days} days left`
}

export function shiftDateStr(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}
