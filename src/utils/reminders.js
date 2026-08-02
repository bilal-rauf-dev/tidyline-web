import { DEADLINE_HOUR, deadlineMoment, formatDateTime, startOfDay } from './dates'
import { describeRecurrence, matchesRecurrence } from './recurrence'

/**
 * Reminder kinds:
 *  - absolute  { at }                 one concrete datetime
 *  - relative  { minutesBefore }      resolved against the deadline at CHECK time
 *  - recurring { rule, time }         rule reuses the recurrence model in recurrence.js
 */
export const REMINDER_PRESETS = [
  { id: 'before5', label: '5 minutes before', kind: 'relative', minutesBefore: 5 },
  { id: 'before30', label: '30 minutes before', kind: 'relative', minutesBefore: 30 },
  { id: 'before60', label: '1 hour before', kind: 'relative', minutesBefore: 60 },
  { id: 'tomorrowAm', label: 'Tomorrow morning', kind: 'tomorrowMorning' },
  { id: 'everyMonday', label: 'Every Monday', kind: 'recurring', rule: { freq: 'weekly', weekday: 1 } },
  { id: 'everyWeekday', label: 'Every weekday', kind: 'recurring', rule: { freq: 'weekdays' } },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

export function toLocalInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Stable, deterministic id — avoids randomness during state hydration. */
export function reminderKey(reminder) {
  switch (reminder.kind) {
    case 'relative':
      return `rel:${reminder.minutesBefore}`
    case 'recurring':
      return `rec:${reminder.rule?.freq}:${reminder.rule?.weekday ?? ''}:${reminder.time ?? ''}`
    default:
      return `abs:${reminder.at}`
  }
}

/** Turn a preset choice into a stored reminder record. */
export function buildReminder(presetId, { customAt } = {}) {
  if (presetId === 'custom') {
    return customAt ? { id: `abs:${customAt}`, kind: 'absolute', at: customAt } : null
  }

  const preset = REMINDER_PRESETS.find((entry) => entry.id === presetId)

  if (!preset) {
    return null
  }

  if (preset.kind === 'tomorrowMorning') {
    // Not deadline-linked, so it resolves once, here, into a concrete instant.
    const at = startOfDay()
    at.setDate(at.getDate() + 1)
    at.setHours(DEADLINE_HOUR, 0, 0, 0)
    const value = toLocalInput(at)
    return { id: `abs:${value}`, kind: 'absolute', at: value }
  }

  if (preset.kind === 'relative') {
    return {
      id: `rel:${preset.minutesBefore}`,
      kind: 'relative',
      minutesBefore: preset.minutesBefore,
    }
  }

  const record = { kind: 'recurring', rule: preset.rule, time: `${pad(DEADLINE_HOUR)}:00` }
  return { ...record, id: reminderKey(record) }
}

export function describeReminder(reminder, task) {
  switch (reminder.kind) {
    case 'relative': {
      const label =
        reminder.minutesBefore >= 60
          ? `${reminder.minutesBefore / 60}h before`
          : `${reminder.minutesBefore} min before`
      if (!task?.deadline) return label
      return `${label} — ${formatDateTime(resolveRelative(reminder, task))}`
    }
    case 'recurring':
      return `${describeRecurrence(reminder.rule)} at ${reminder.time ?? '09:00'}`
    default:
      return formatDateTime(reminder.at)
  }
}

function resolveRelative(reminder, task) {
  const due = deadlineMoment(task.deadline)
  return new Date(due.getTime() - reminder.minutesBefore * 60000)
}

/**
 * Concrete instants a reminder should fire at inside (windowStart, windowEnd].
 * Relative reminders are resolved here — at check time — so that editing the
 * deadline moves the reminder with it.
 */
export function reminderInstances(task, reminder, windowStart, windowEnd) {
  if (reminder.kind === 'absolute') {
    const at = new Date(reminder.at).getTime()
    return Number.isNaN(at) ? [] : [{ key: `${task.id}:${reminder.id}:${at}`, at }]
  }

  if (reminder.kind === 'relative') {
    const at = resolveRelative(reminder, task).getTime()
    return Number.isNaN(at) ? [] : [{ key: `${task.id}:${reminder.id}:${at}`, at }]
  }

  if (reminder.kind === 'recurring') {
    const [hour, minute] = String(reminder.time ?? '09:00').split(':').map(Number)
    const results = []
    const cursor = startOfDay(new Date(windowStart))
    const limit = new Date(windowEnd)

    // Windows are seconds-to-minutes wide, so this loop stays tiny.
    for (let guard = 0; guard < 400 && cursor <= limit; guard += 1) {
      if (matchesRecurrence(cursor, reminder.rule, task.createdAt?.slice(0, 10))) {
        const at = new Date(cursor)
        at.setHours(hour || 0, minute || 0, 0, 0)
        results.push({ key: `${task.id}:${reminder.id}:${at.getTime()}`, at: at.getTime() })
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return results
  }

  return []
}
