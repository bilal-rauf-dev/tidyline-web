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

/** Concrete local instant a deadline is due, with a 09:00 fallback for date-only tasks. */
export function deadlineMoment(deadline, deadlineTime = null) {
  const at = new Date(`${deadline}T00:00:00`)
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(deadlineTime ?? '')
  at.setHours(match ? Number(match[1]) : DEADLINE_HOUR, match ? Number(match[2]) : 0, 0, 0)
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

export function formatTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '')
  if (!match) return ''
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]))
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatDeadline(deadline, deadlineTime = null) {
  const date = formatDate(deadline)
  const time = formatTime(deadlineTime)
  return time ? `${date} at ${time}` : date
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
