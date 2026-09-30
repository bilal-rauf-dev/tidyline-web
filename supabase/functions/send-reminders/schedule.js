const DAY_MS = 24 * 60 * 60 * 1000
const DEADLINE_HOUR = 9

function dateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function localDateTimeParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(String(value ?? ''))
  if (!match) return null
  return {
    year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
    hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6] ?? 0),
  }
}

function formatterFor(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
  }
}

function partsInZone(timestamp, timeZone) {
  const values = {}
  formatterFor(timeZone).formatToParts(new Date(timestamp)).forEach((part) => {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  })
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

/** Convert a wall-clock value in an IANA time zone into a UTC timestamp. */
export function zonedDateTimeToTimestamp(parts, timeZone = 'UTC') {
  const target = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0,
  )
  let guess = target

  // Two passes resolve ordinary offsets and DST boundaries without a large
  // date library. Non-existent DST wall times settle on the nearest valid time.
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = partsInZone(guess, timeZone)
    const represented = Date.UTC(
      actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second,
    )
    const correction = target - represented
    guess += correction
    if (correction === 0) break
  }

  return guess
}

function dateKeyFromTimestamp(timestamp, timeZone) {
  const parts = partsInZone(timestamp, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function addDateDays(dateKey, days) {
  const parts = dateParts(dateKey)
  if (!parts) return null
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return date.toISOString().slice(0, 10)
}

function weekdayFor(dateKey) {
  const parts = dateParts(dateKey)
  return parts ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() : -1
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function matchesRule(dateKey, rule, anchorDateKey) {
  if (!rule) return false
  const current = dateParts(dateKey)
  const anchor = dateParts(anchorDateKey)
  if (!current) return false
  if (anchor && dateKey < anchorDateKey) return false

  const configuredDay = Number(rule.anchorDay)
  const configuredMonth = Number(rule.anchorMonth)
  const anchorDay = Number.isInteger(configuredDay) && configuredDay >= 1 && configuredDay <= 31
    ? configuredDay
    : anchor?.day
  const anchorMonth =
    Number.isInteger(configuredMonth) && configuredMonth >= 1 && configuredMonth <= 12
      ? configuredMonth
      : anchor?.month

  switch (rule.freq) {
    case 'daily':
      return true
    case 'weekdays': {
      const weekday = weekdayFor(dateKey)
      return weekday >= 1 && weekday <= 5
    }
    case 'weekly':
      return weekdayFor(dateKey) === (rule.weekday ?? 1)
    case 'monthly':
      return Boolean(
        anchorDay &&
        current.day === Math.min(anchorDay, lastDayOfMonth(current.year, current.month)),
      )
    case 'yearly':
      return Boolean(
        anchorDay &&
        anchorMonth &&
        current.month === anchorMonth &&
        current.day === Math.min(anchorDay, lastDayOfMonth(current.year, current.month)),
      )
    case 'everyNDays': {
      if (!anchor) return false
      const currentUtc = Date.UTC(current.year, current.month - 1, current.day)
      const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day)
      const elapsedDays = Math.round((currentUtc - anchorUtc) / DAY_MS)
      const step = Math.max(1, Number(rule.n) || 2)
      return elapsedDays >= 0 && elapsedDays % step === 0
    }
    default:
      return false
  }
}

function absoluteTimestamp(value, timeZone) {
  if (typeof value !== 'string') return Number.NaN
  const local = localDateTimeParts(value)
  if (local) return zonedDateTimeToTimestamp(local, timeZone)
  return Date.parse(value)
}

function relativeTimestamp(task, reminder, timeZone) {
  const due = dateParts(task.deadline)
  if (!due) return Number.NaN
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(task.deadline_time ?? ''))
  const hour = timeMatch ? Number(timeMatch[1]) : DEADLINE_HOUR
  const minute = timeMatch ? Number(timeMatch[2]) : 0
  const deadline = zonedDateTimeToTimestamp({ ...due, hour, minute, second: 0 }, timeZone)
  return deadline - Number(reminder.minutesBefore) * 60000
}

function recurringTimestamps(task, reminder, windowStart, windowEnd, timeZone) {
  const [hour, minute] = String(reminder.time ?? '09:00').split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return []

  const firstDate = addDateDays(dateKeyFromTimestamp(windowStart, timeZone), -1)
  const lastDate = addDateDays(dateKeyFromTimestamp(windowEnd, timeZone), 1)
  const createdAt = Date.parse(task.created_at)
  const anchorDate = Number.isFinite(createdAt)
    ? dateKeyFromTimestamp(createdAt, timeZone)
    : null
  const results = []

  for (let dateKey = firstDate, guard = 0; dateKey && dateKey <= lastDate && guard < 5; guard += 1) {
    if (matchesRule(dateKey, reminder.rule, anchorDate)) {
      const parts = dateParts(dateKey)
      results.push(zonedDateTimeToTimestamp({ ...parts, hour, minute, second: 0 }, timeZone))
    }
    dateKey = addDateDays(dateKey, 1)
  }

  return results
}

/** Reminder instances due inside (windowStart, windowEnd]. */
export function dueReminderInstances(task, reminder, windowStart, windowEnd, timeZone = 'UTC') {
  const record = typeof reminder === 'string'
    ? { id: `abs:${reminder}`, kind: 'absolute', at: reminder }
    : reminder
  if (!record || typeof record !== 'object') return []

  let timestamps = []
  if (record.kind === 'absolute') {
    timestamps = [absoluteTimestamp(record.at, timeZone)]
  } else if (record.kind === 'relative') {
    timestamps = [relativeTimestamp(task, record, timeZone)]
  } else if (record.kind === 'recurring') {
    timestamps = recurringTimestamps(task, record, windowStart, windowEnd, timeZone)
  }

  return timestamps
    .filter((at) => Number.isFinite(at) && at > windowStart && at <= windowEnd)
    .map((at) => ({
      reminderId: String(record.id ?? `${record.kind}:${at}`),
      scheduledFor: new Date(at).toISOString(),
    }))
}

export function deliveryPayload(task, instance) {
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(task.deadline_time ?? ''))
  const dueLabel = task.deadline
    ? `Due ${task.deadline}${timeMatch ? ` at ${timeMatch[1]}:${timeMatch[2]}` : ''}`
    : 'A task reminder is due'

  return {
    title: task.title || 'TidyLine reminder',
    body: dueLabel,
    taskId: task.id,
    reminderId: instance.reminderId,
    scheduledFor: instance.scheduledFor,
    url: `/board?expand=${encodeURIComponent(task.id)}`,
  }
}
