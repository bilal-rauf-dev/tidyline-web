import { deadlineMoment, startOfDay } from './dates'
import { matchesRecurrence } from './recurrence'

const encoder = new TextEncoder()
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function foldLine(line) {
  const parts = []
  let part = ''
  let bytes = 0

  for (const character of line) {
    const size = encoder.encode(character).length
    if (part && bytes + size > 75) {
      parts.push(part)
      part = ` ${character}`
      bytes = 1 + size
    } else {
      part += character
      bytes += size
    }
  }

  parts.push(part)
  return parts.join('\r\n')
}

function utcStamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function recurrenceRule(recurrence) {
  if (!recurrence) return null

  switch (recurrence.freq) {
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    case 'weekly':
      return `FREQ=WEEKLY;BYDAY=${WEEKDAYS[recurrence.weekday ?? 1]}`
    case 'monthly':
      return 'FREQ=MONTHLY'
    case 'yearly':
      return 'FREQ=YEARLY'
    case 'everyNDays':
      return `FREQ=DAILY;INTERVAL=${Math.max(1, Math.floor(Number(recurrence.n) || 2))}`
    default:
      return null
  }
}

function alarmLines(reminder, task) {
  let trigger = null
  if (reminder.kind === 'relative' && task.deadline) {
    trigger = `TRIGGER:-PT${Math.max(1, Math.floor(reminder.minutesBefore))}M`
  }
  if (reminder.kind === 'absolute') {
    const at = utcStamp(reminder.at)
    if (at) trigger = `TRIGGER;VALUE=DATE-TIME:${at}`
  }
  if (!trigger) return []

  return [
    'BEGIN:VALARM',
    trigger,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
    'END:VALARM',
  ]
}

function eventLines(task, timestamp) {
  if (!task.deadline) return []
  const start = utcStamp(deadlineMoment(task.deadline))
  if (!start) return []
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(`${task.id}@tasks.tidyline.local`)}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${start}`,
    `SUMMARY:${escapeText(task.title)}`,
    'TRANSP:TRANSPARENT',
    'STATUS:CONFIRMED',
  ]
  const rule = recurrenceRule(task.recurrence)
  if (rule) lines.push(`RRULE:${rule}`)
  if (task.notes) lines.push(`DESCRIPTION:${escapeText(task.notes)}`)
  if (task.location) lines.push(`LOCATION:${escapeText(task.location)}`)
  if (task.tags?.length) lines.push(`CATEGORIES:${task.tags.map(escapeText).join(',')}`)
  task.reminders
    .filter((reminder) => reminder.kind !== 'recurring')
    .forEach((reminder) => lines.push(...alarmLines(reminder, task)))
  lines.push('END:VEVENT')
  return lines
}

function firstReminderOccurrence(task, reminder, referenceDate) {
  const cursor = startOfDay(referenceDate)
  const [hour, minute] = String(reminder.time ?? '09:00').split(':').map(Number)
  const anchor = task.createdAt?.slice(0, 10)

  for (let guard = 0; guard < 3660; guard += 1) {
    if (matchesRecurrence(cursor, reminder.rule, anchor)) {
      const occurrence = new Date(cursor)
      occurrence.setHours(hour || 0, minute || 0, 0, 0)
      if (occurrence >= referenceDate) return occurrence
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

function recurringReminderLines(task, reminder, timestamp, referenceDate) {
  const first = firstReminderOccurrence(task, reminder, referenceDate)
  const rule = recurrenceRule(reminder.rule)
  if (!first || !rule) return []

  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${utcStamp(first)}`,
    `RRULE:${rule}`,
    `SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
    'DURATION:PT5M',
    'TRANSP:TRANSPARENT',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

function standaloneReminderLines(task, reminder, timestamp) {
  if (reminder.kind !== 'absolute' || task.deadline) return []
  const start = utcStamp(reminder.at)
  if (!start) return []
  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(`${task.id}-${reminder.id}@reminders.tidyline.local`)}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${start}`,
    `SUMMARY:${escapeText(`Reminder: ${task.title}`)}`,
    'DURATION:PT5M',
    'TRANSP:TRANSPARENT',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Reminder: ${task.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

export function serializeCalendar(
  tasks,
  {
    generatedAt = new Date(),
    referenceDate = generatedAt,
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  } = {},
) {
  const timestamp = utcStamp(generatedAt)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TidyLine//Task deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TidyLine deadlines',
    `X-WR-TIMEZONE:${escapeText(timeZone)}`,
  ]

  tasks
    .filter((task) => !task.done && !task.archived)
    .forEach((task) => {
      lines.push(...eventLines(task, timestamp))
      task.reminders
        .filter((reminder) => reminder.kind === 'recurring')
        .forEach((reminder) => lines.push(
          ...recurringReminderLines(task, reminder, timestamp, referenceDate),
        ))
      task.reminders
        .filter((reminder) => reminder.kind === 'absolute')
        .forEach((reminder) => lines.push(...standaloneReminderLines(task, reminder, timestamp)))
    })

  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
