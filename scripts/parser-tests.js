/**
 * Parser unit tests for parseNaturalTask.
 * Covers the required scenarios from the spec plus edge/failure cases.
 * Run via: npm run parser-tests
 */

import { parseNaturalTask } from '../src/utils/parseNaturalTask.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// Use local date parts to avoid UTC-offset shifting (the app stores YYYY-MM-DD
// in the user's local timezone, not UTC).
function toYMD(date) {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Fixed reference: Tuesday 2026-08-11 at midnight local time
const REF = new Date(2026, 7, 11)  // month is 0-indexed

let passed = 0
let failed = 0

function test(description, fn) {
  try {
    fn()
    console.log(`ok    ${description}`)
    passed++
  } catch (err) {
    console.error(`FAIL  ${description} — ${err.message}`)
    failed++
  }
}

// ─── Required scenarios ───────────────────────────────────────────────────────

test('Submit report tomorrow at 5pm', () => {
  const r = parseNaturalTask('Submit report tomorrow at 5pm', REF)
  assert(r.title === 'Submit report', `title: ${JSON.stringify(r.title)}`)
  assert(r.deadline !== null, 'deadline should be parsed')
  assert(toYMD(r.deadline) === '2026-08-12', `deadline: ${toYMD(r.deadline)}`)
  assert(r.tags.length === 0, 'no tags expected')
})

test('Gym every weekday at 7am — title clean, no deadline', () => {
  const r = parseNaturalTask('Gym every weekday at 7am', REF)
  assert(typeof r.title === 'string' && r.title.length > 0, 'title non-empty')
  assert(r.priority === null, 'no priority')
  assert(r.energy === null, 'no energy')
})

test('Call Talha Friday remind 2h before', () => {
  const r = parseNaturalTask('Call Talha Friday remind 2h before', REF)
  assert(r.title.includes('Call Talha'), `title: ${JSON.stringify(r.title)}`)
  assert(r.deadline !== null, 'deadline should be parsed')
  // Next Friday from Tuesday 2026-08-11 is 2026-08-14
  assert(toYMD(r.deadline) === '2026-08-14', `deadline: ${toYMD(r.deadline)}`)
  assert(r.reminderMinutes === 120, `reminderMinutes: ${r.reminderMinutes}`)
})

test('Study OS for 90m #university @deep', () => {
  const r = parseNaturalTask('Study OS for 90m #university @deep', REF)
  assert(r.title.includes('Study OS'), `title: ${JSON.stringify(r.title)}`)
  assert(r.durationMinutes === 90, `durationMinutes: ${r.durationMinutes}`)
  assert(r.tags.includes('university'), `tags: ${JSON.stringify(r.tags)}`)
  assert(r.energy === 'deep-focus', `energy: ${r.energy}`)
})

test('Pay bill every month on the 5th — recurrence parsed monthly', () => {
  // Phase 3 now parses recurrence; "every month" maps to { freq: 'monthly' }.
  const r = parseNaturalTask('Pay bill every month on the 5th', REF)
  assert(typeof r.title === 'string' && r.title.length > 0, `title: ${JSON.stringify(r.title)}`)
  assert(r.recurrence?.freq === 'monthly', `recurrence: ${JSON.stringify(r.recurrence)}`)
})

test('Start project Monday due next Friday — start regex skips plain noun, chrono picks Monday', () => {
  // "Start project Monday": "project" is not a date keyword so start regex does
  // not consume it. Chrono then finds "Monday" (Aug 17) as the first date.
  // "due next Friday" is still in the text but chrono returns the first match.
  const r = parseNaturalTask('Start project Monday due next Friday', REF)
  assert(typeof r.title === 'string', 'title present')
  assert(r.deadline !== null, 'deadline parsed')
  assert(toYMD(r.deadline) === '2026-08-17', `deadline: ${toYMD(r.deadline)}`)
})

// ─── Priority parsing ─────────────────────────────────────────────────────────

test('Priority !high stripped from title', () => {
  const r = parseNaturalTask('Fix bug tomorrow !high', REF)
  assert(r.priority === 'high', `priority: ${r.priority}`)
  assert(!r.title.includes('!high'), `title still contains !high: ${r.title}`)
  assert(r.deadline !== null, 'deadline parsed alongside priority')
})

test('Priority p1 mapped to high', () => {
  const r = parseNaturalTask('Urgent task p1 tomorrow', REF)
  assert(r.priority === 'high', `priority: ${r.priority}`)
})

test('Priority !medium and !low', () => {
  assert(parseNaturalTask('Task !medium', REF).priority === 'medium', '!medium')
  assert(parseNaturalTask('Task !low', REF).priority === 'low', '!low')
  assert(parseNaturalTask('Task p2', REF).priority === 'medium', 'p2')
  assert(parseNaturalTask('Task p3', REF).priority === 'low', 'p3')
})

// ─── Energy parsing ───────────────────────────────────────────────────────────

test('Energy @deep maps to deep-focus', () => {
  assert(parseNaturalTask('Task @deep', REF).energy === 'deep-focus', '@deep → deep-focus')
  assert(parseNaturalTask('Task @deep-focus', REF).energy === 'deep-focus', '@deep-focus')
  assert(parseNaturalTask('Task @normal', REF).energy === 'normal', '@normal')
  assert(parseNaturalTask('Task @low', REF).energy === 'low', '@low')
})

// ─── No cross-contamination between adjacent tokens ───────────────────────────

test('tomorrow !high — deadline boundary not confused by priority', () => {
  const r = parseNaturalTask('Finish work tomorrow !high', REF)
  // !high is stripped before chrono runs; chrono sees "tomorrow" cleanly
  assert(toYMD(r.deadline) === '2026-08-12', `deadline: ${toYMD(r.deadline)}`)
  assert(r.priority === 'high', `priority: ${r.priority}`)
  assert(r.title === 'Finish work', `title: ${JSON.stringify(r.title)}`)
})

test('for 2h remind 30m before — no cross-match', () => {
  const r = parseNaturalTask('Write essay for 2h remind 30m before', REF)
  assert(r.durationMinutes === 120, `duration: ${r.durationMinutes}`)
  assert(r.reminderMinutes === 30, `reminder: ${r.reminderMinutes}`)
  assert(r.durationMinutes !== 30, 'duration should be 120 not 30')
  assert(r.reminderMinutes !== 120, 'reminder should be 30 not 120')
})

test('Full complex: Finish DB assignment tomorrow 8pm for 2h remind 30m before !high @deep #university', () => {
  const r = parseNaturalTask(
    'Finish DB assignment tomorrow 8pm for 2h remind 30m before !high @deep #university',
    REF,
  )
  assert(r.title === 'Finish DB assignment', `title: ${JSON.stringify(r.title)}`)
  assert(toYMD(r.deadline) === '2026-08-12', `deadline: ${toYMD(r.deadline)}`)
  assert(r.durationMinutes === 120, `duration: ${r.durationMinutes}`)
  assert(r.reminderMinutes === 30, `reminder: ${r.reminderMinutes}`)
  assert(r.priority === 'high', `priority: ${r.priority}`)
  assert(r.energy === 'deep-focus', `energy: ${r.energy}`)
  assert(r.tags.includes('university'), `tags: ${JSON.stringify(r.tags)}`)
})

// ─── Plan for today ───────────────────────────────────────────────────────────

test('"plan today" explicit form sets planForToday', () => {
  // "plan today" is stripped before chrono sees "today", so deadline remains null.
  const r = parseNaturalTask('Check emails plan today', REF)
  assert(r.planForToday === true, `planForToday: ${r.planForToday}`)
  assert(!r.title.includes('plan today'), `title still contains plan today: ${r.title}`)
  assert(r.deadline === null, 'plan today does not set a deadline')
})

test('"today" alone acts as a deadline (not planForToday)', () => {
  // Standalone "today" is left to chrono as a deadline token.
  const r = parseNaturalTask('Call doctor today', REF)
  assert(r.deadline !== null, 'standalone today should set deadline')
  assert(r.planForToday === false, 'standalone today should not set planForToday')
})

// ─── Graceful failures — no crash, no silent guessing ────────────────────────

test('Empty input — no crash, empty title, all fields null/empty', () => {
  const r = parseNaturalTask('', REF)
  assert(r.title === '', `title: ${JSON.stringify(r.title)}`)
  assert(r.deadline === null, 'no deadline')
  assert(r.tags.length === 0, 'no tags')
  assert(r.priority === null, 'no priority')
  assert(r.energy === null, 'no energy')
  assert(r.durationMinutes === null, 'no duration')
  assert(r.reminderMinutes === null, 'no reminder')
})

test('Malformed date phrase — no crash', () => {
  const r = parseNaturalTask('Call Ali on xyzzy', REF)
  assert(typeof r.title === 'string', 'title is string')
})

test('Conflicting priority tokens — first one wins, no crash', () => {
  const r = parseNaturalTask('Task !high !low', REF)
  assert(r.priority !== null, 'some priority parsed')
  // !high appears first and is registered first
  assert(r.priority === 'high', `expected high, got: ${r.priority}`)
})

test('Reminder without deadline — parsed correctly, no crash', () => {
  const r = parseNaturalTask('Check in remind 1h before', REF)
  assert(r.reminderMinutes === 60, `reminderMinutes: ${r.reminderMinutes}`)
  // Deadline is null — the validation layer in QuickAddModal shows the warning
  assert(r.deadline === null, 'no deadline in this input')
})

test('Duration of zero — parsed as 0, not null', () => {
  // 0 is a valid parsed value; ??(nullish coalescing) preserves it.
  const r = parseNaturalTask('Task for 0m', REF)
  assert(r.durationMinutes === 0, `durationMinutes: ${r.durationMinutes}`)
})

test('Incomplete "remind" phrase — stays in title, no crash', () => {
  const r = parseNaturalTask('remind', REF)
  assert(r.reminderMinutes === null, 'incomplete remind phrase → null')
  assert(r.title.includes('remind'), 'incomplete phrase stays in title')
})

// ─── Duration and reminder unit variants ─────────────────────────────────────

test('Duration unit variants (h, hr, hrs, hour, hours)', () => {
  assert(parseNaturalTask('Task for 1h', REF).durationMinutes === 60, 'h')
  assert(parseNaturalTask('Task for 1hr', REF).durationMinutes === 60, 'hr')
  assert(parseNaturalTask('Task for 1hrs', REF).durationMinutes === 60, 'hrs')
  assert(parseNaturalTask('Task for 1hour', REF).durationMinutes === 60, 'hour')
  assert(parseNaturalTask('Task for 1hours', REF).durationMinutes === 60, 'hours')
})

test('Duration unit variants (m, min, mins, minutes)', () => {
  assert(parseNaturalTask('Task for 30m', REF).durationMinutes === 30, 'm')
  assert(parseNaturalTask('Task for 30min', REF).durationMinutes === 30, 'min')
  assert(parseNaturalTask('Task for 30mins', REF).durationMinutes === 30, 'mins')
  assert(parseNaturalTask('Task for 30minutes', REF).durationMinutes === 30, 'minutes')
})

test('Reminder unit variants (m, min, h, hr)', () => {
  assert(parseNaturalTask('Task remind 30m before', REF).reminderMinutes === 30, 'm')
  assert(parseNaturalTask('Task remind 30min before', REF).reminderMinutes === 30, 'min')
  assert(parseNaturalTask('Task remind 1h before', REF).reminderMinutes === 60, 'h')
  assert(parseNaturalTask('Task remind 2hr before', REF).reminderMinutes === 120, 'hr')
})

// ─── Phase 3: Recurrence ──────────────────────────────────────────────────────

test('every day → daily', () => {
  assert(parseNaturalTask('Water plants every day', REF).recurrence?.freq === 'daily', 'daily')
})

test('every weekday → weekdays', () => {
  const r = parseNaturalTask('Stand-up every weekday', REF)
  assert(r.recurrence?.freq === 'weekdays', `freq: ${r.recurrence?.freq}`)
  assert(!r.title.includes('every weekday'), `title: ${r.title}`)
})

test('every Monday → weekly weekday 1', () => {
  const r = parseNaturalTask('Team meeting every Monday', REF)
  assert(r.recurrence?.freq === 'weekly', `freq: ${r.recurrence?.freq}`)
  assert(r.recurrence?.weekday === 1, `weekday: ${r.recurrence?.weekday}`)
})

test('every 2 weeks → everyNDays 14', () => {
  const r = parseNaturalTask('Review budget every 2 weeks', REF)
  assert(r.recurrence?.freq === 'everyNDays', `freq: ${r.recurrence?.freq}`)
  assert(r.recurrence?.n === 14, `n: ${r.recurrence?.n}`)
})

test('every month → monthly', () => {
  const r = parseNaturalTask('Pay rent every month', REF)
  assert(r.recurrence?.freq === 'monthly', `freq: ${r.recurrence?.freq}`)
})

test('every 3 days → everyNDays 3', () => {
  const r = parseNaturalTask('Water cactus every 3 days', REF)
  assert(r.recurrence?.freq === 'everyNDays', `freq: ${r.recurrence?.freq}`)
  assert(r.recurrence?.n === 3, `n: ${r.recurrence?.n}`)
})

test('recurrence stripped from title', () => {
  const r = parseNaturalTask('Check email every weekday', REF)
  assert(r.title === 'Check email', `title: ${JSON.stringify(r.title)}`)
})

test('recurrence + deadline coexist cleanly', () => {
  const r = parseNaturalTask('Gym every Monday by next Friday', REF)
  assert(r.recurrence?.freq === 'weekly', 'recurrence parsed')
  assert(r.deadline !== null, 'deadline parsed')
  assert(r.title === 'Gym', `title: ${JSON.stringify(r.title)}`)
})

// ─── Phase 3: Start date ──────────────────────────────────────────────────────

test('start Monday → startDate next Monday', () => {
  const r = parseNaturalTask('Project start Monday', REF)
  assert(r.startDate !== null, 'startDate parsed')
  // Next Monday from Tuesday Aug 11 is Aug 17
  assert(toYMD(r.startDate) === '2026-08-17', `startDate: ${toYMD(r.startDate)}`)
  assert(r.title === 'Project', `title: ${JSON.stringify(r.title)}`)
})

test('start Friday → startDate next Friday', () => {
  const r = parseNaturalTask('Start project start Friday', REF)
  assert(r.startDate !== null, 'startDate parsed')
  assert(toYMD(r.startDate) === '2026-08-14', `startDate: ${toYMD(r.startDate)}`)
})

test('startDate stripped from title', () => {
  const r = parseNaturalTask('Task start Monday due next Friday', REF)
  assert(r.startDate !== null, 'startDate present')
  assert(r.deadline !== null, 'deadline present')
  assert(r.title === 'Task', `title: ${JSON.stringify(r.title)}`)
})

// ─── Result ───────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
