import * as chrono from 'chrono-node'

/**
 * Parses natural language input to extract task metadata.
 * Phases 1, 2 & 3:
 *
 * Supported syntax (order shown is the stripping order, which prevents cross-match):
 *
 *  Tags            #tagname
 *  Priority        !high / !medium / !low  or  p1 / p2 / p3
 *  Energy          @low / @normal / @deep / @deep-focus
 *  Duration        for 2h / for 45 minutes / for 45m
 *  Reminder        remind me 2h before / remind 30m before
 *  Recurrence      every day / every weekday / every Monday / every 2 weeks / every week
 *  Start date      start Monday / start Friday / start next week
 *  Plan today      plan today  (explicit 2-word form; standalone "today" is left for deadline)
 *  Deadline        parsed by chrono-node from whatever text remains after the above
 *  Prepositions    "due on / due / by" are absorbed into the deadline span
 *
 * @param {string} input
 * @param {Date} [referenceDate]
 * @returns {ParsedTask}
 */
export function parseNaturalTask(input, referenceDate = new Date()) {
  const matchedTokens = []
  let workingText = input

  function registerMatch(type, value, startIdx, length, text) {
    matchedTokens.push({ type, value, text })
    workingText =
      workingText.slice(0, startIdx) +
      ' '.repeat(length) +
      workingText.slice(startIdx + length)
  }

  // ── 1. Tags ────────────────────────────────────────────────────────────────
  const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi
  let match
  while ((match = tagRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('tag', match[1].toLowerCase(), startIdx, text.length, text)
  }

  // ── 2. Priority ────────────────────────────────────────────────────────────
  const bangPriorityRegex = /(?:^|\s)!(high|medium|low)\b/gi
  while ((match = bangPriorityRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('priority', match[1].toLowerCase(), startIdx, text.length, text)
  }

  if (!matchedTokens.some((t) => t.type === 'priority')) {
    const pMap = { p1: 'high', p2: 'medium', p3: 'low' }
    const pRegex = /(?:^|\s)\b(p1|p2|p3)\b/gi
    while ((match = pRegex.exec(workingText)) !== null) {
      const text = match[0].trim()
      const startIdx = match.index + (match[0].length - match[0].trimStart().length)
      registerMatch('priority', pMap[match[1].toLowerCase()], startIdx, text.length, text)
    }
  }

  // ── 3. Energy ─────────────────────────────────────────────────────────────
  const energyRegex = /(?:^|\s)@(low|normal|deep-focus|deep)\b/gi
  while ((match = energyRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    const value = match[1].toLowerCase() === 'deep' ? 'deep-focus' : match[1].toLowerCase()
    registerMatch('energy', value, startIdx, text.length, text)
  }

  // ── 4. Duration ────────────────────────────────────────────────────────────
  const durationRegex = /(?:^|\s)for\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/gi
  while ((match = durationRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const num = parseInt(match[1], 10)
    const unit = match[2].toLowerCase()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('duration', unit.startsWith('h') ? num * 60 : num, startIdx, text.length, text)
  }

  // ── 5. Reminder ────────────────────────────────────────────────────────────
  const reminderRegex =
    /(?:^|\s)remind\s+(?:me\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\s+before\b/gi
  while ((match = reminderRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const num = parseInt(match[1], 10)
    const unit = match[2].toLowerCase()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('reminder', unit.startsWith('h') ? num * 60 : num, startIdx, text.length, text)
  }

  // ── 6. Recurrence ─────────────────────────────────────────────────────────
  // Must run before chrono so weekday words like "every Monday" don't bleed
  // into the deadline parse as a spurious date.
  //
  // Supported forms:
  //   every day / daily              → { freq: 'daily' }
  //   every weekday / every weekdays → { freq: 'weekdays' }
  //   every week                     → { freq: 'weekly', weekday: <refDay> }
  //   every Monday…Sunday            → { freq: 'weekly', weekday: 0-6 }
  //   every N days                   → { freq: 'everyNDays', n: N }
  //   every N weeks                  → { freq: 'weekly', n: N }  (every 2 weeks)
  //   every month / monthly          → { freq: 'monthly' }
  //   every year / yearly            → { freq: 'yearly' }
  const WEEKDAY_MAP = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  }

  const recurrenceRegex =
    /(?:^|\s)every\s+(day|daily|weekday|weekdays|week|month|monthly|year|yearly|\d+\s+(?:days?|weeks?|months?)|(?:sun|mon|tue(?:s)?|wed|thu(?:rs?)?|fri|sat)(?:urday|nesday|rsday|urday)?(?:day)?)\b/gi

  while ((match = recurrenceRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    const raw = match[1].trim().toLowerCase()

    let recurrence = null

    if (raw === 'day' || raw === 'daily') {
      recurrence = { freq: 'daily' }
    } else if (raw === 'weekday' || raw === 'weekdays') {
      recurrence = { freq: 'weekdays' }
    } else if (raw === 'week') {
      recurrence = { freq: 'weekly', weekday: referenceDate.getDay() }
    } else if (raw === 'month' || raw === 'monthly') {
      recurrence = { freq: 'monthly' }
    } else if (raw === 'year' || raw === 'yearly') {
      recurrence = { freq: 'yearly' }
    } else {
      // "N days" / "N weeks" / "N months"
      const nMatch = /^(\d+)\s+(days?|weeks?|months?)$/.exec(raw)
      if (nMatch) {
        const n = parseInt(nMatch[1], 10)
        const unit = nMatch[2].replace(/s$/, '') // normalize plural
        if (unit === 'day') recurrence = { freq: 'everyNDays', n }
        else if (unit === 'week') recurrence = n === 1 ? { freq: 'weekly', weekday: referenceDate.getDay() } : { freq: 'everyNDays', n: n * 7 }
        else if (unit === 'month') recurrence = { freq: 'monthly' }
      } else {
        // weekday name
        const wdKey = raw.toLowerCase()
        if (WEEKDAY_MAP[wdKey] !== undefined) {
          recurrence = { freq: 'weekly', weekday: WEEKDAY_MAP[wdKey] }
        }
      }
    }

    if (recurrence) {
      registerMatch('recurrence', recurrence, startIdx, text.length, text)
    }
  }

  // ── 7. Start date ──────────────────────────────────────────────────────────
  // "start Monday", "start next week", "start Friday"
  //
  // Only date-like keywords are accepted immediately after "start" to prevent
  // consuming plain nouns (e.g. "Start project Monday" should NOT strip
  // "project" as a date phrase and leave "Monday" orphaned).
  //
  // Accepted date-like tokens:
  //   next <word>  |  this <word>  |  weekday names (full or 3-letter)
  //   tomorrow  |  today  |  weekend
  const START_DATE_WORDS =
    'next\\s+\\w+|this\\s+\\w+' +
    '|monday|tuesday|wednesday|thursday|friday|saturday|sunday' +
    '|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun' +
    '|tomorrow|today|weekend'
  const startDateRegex = new RegExp(
    `(?:^|\\s)start\\s+(${START_DATE_WORDS})`,
    'gi',
  )
  while ((match = startDateRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    const datePart = match[1].trim()
    const parsedStart = chrono.parse(datePart, referenceDate, { forwardDate: true })
    if (parsedStart.length > 0) {
      registerMatch('startDate', parsedStart[0].start.date(), startIdx, text.length, text)
    }
  }

  // ── 8. Plan for today (explicit two-word form) ─────────────────────────────
  const planTodayRegex = /(?:^|\s)(plan today)\b/gi
  while ((match = planTodayRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('planForToday', true, startIdx, text.length, text)
  }

  // ── 9. Deadline via chrono-node ────────────────────────────────────────────
  const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true })
  if (parsedDates.length > 0) {
    const dateMatch = parsedDates[0]
    let startIdx = dateMatch.index
    let text = dateMatch.text

    // Absorb preceding "due on / due / by" prepositions
    const preceding = workingText.slice(0, startIdx)
    const prepMatch = /\b(due\s+on|due|by)\s+$/i.exec(preceding)
    if (prepMatch) {
      const prepLen = prepMatch[0].length
      startIdx -= prepLen
      text = workingText.slice(startIdx, startIdx + prepLen + text.length)
    }

    registerMatch('deadline', dateMatch.start.date(), startIdx, text.length, text)
  }

  // ── 10. Clean title ────────────────────────────────────────────────────────
  const title = workingText.replace(/\s+/g, ' ').trim()

  return {
    title,
    deadline: matchedTokens.find((t) => t.type === 'deadline')?.value ?? null,
    startDate: matchedTokens.find((t) => t.type === 'startDate')?.value ?? null,
    reminderMinutes: matchedTokens.find((t) => t.type === 'reminder')?.value ?? null,
    durationMinutes: matchedTokens.find((t) => t.type === 'duration')?.value ?? null,
    recurrence: matchedTokens.find((t) => t.type === 'recurrence')?.value ?? null,
    priority: matchedTokens.find((t) => t.type === 'priority')?.value ?? null,
    energy: matchedTokens.find((t) => t.type === 'energy')?.value ?? null,
    tags: matchedTokens.filter((t) => t.type === 'tag').map((t) => t.value),
    planForToday: matchedTokens.some((t) => t.type === 'planForToday'),
    matchedTokens,
  }
}
