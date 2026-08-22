import { serializeCalendar } from '../src/utils/ics'
import { normalizeTask } from '../src/utils/taskMigration'
import { existsSync, readFileSync } from 'node:fs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const generatedAt = new Date('2026-08-21T05:00:00.000Z')
const task = normalizeTask({
  id: 'report',
  title: 'Report, review; ship',
  deadline: '2026-08-24',
  notes: 'First line\nSecond line',
  recurrence: { freq: 'weekly', weekday: 1 },
  reminders: [
    { kind: 'relative', minutesBefore: 30 },
    { kind: 'absolute', at: '2026-08-23T08:15:00.000Z' },
    { kind: 'recurring', rule: { freq: 'weekdays' }, time: '08:00' },
  ],
  createdAt: '2026-08-01T09:00:00.000Z',
})
const ignored = normalizeTask({ id: 'done', title: 'Done', deadline: '2026-08-25', done: true })
const reminderOnly = normalizeTask({
  id: 'reminder-only', title: 'No deadline', deadline: null,
  reminders: [{ kind: 'absolute', at: '2026-08-22T07:00:00.000Z' }],
})
const recurrenceTasks = [
  ['daily', { freq: 'daily' }, 'FREQ=DAILY'],
  ['monthly', { freq: 'monthly' }, 'FREQ=MONTHLY'],
  ['yearly', { freq: 'yearly' }, 'FREQ=YEARLY'],
  ['interval', { freq: 'everyNDays', n: 3 }, 'FREQ=DAILY;INTERVAL=3'],
].map(([id, recurrence]) => normalizeTask({
  id, title: id, deadline: '2026-08-26', recurrence,
}))
const calendar = serializeCalendar([task, ignored, reminderOnly, ...recurrenceTasks], {
  generatedAt,
  referenceDate: generatedAt,
  timeZone: 'Asia/Karachi',
})

assert(calendar.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'), 'ICS envelope is invalid')
assert(calendar.endsWith('END:VCALENDAR\r\n'), 'ICS does not end with CRLF')
assert(calendar.includes('X-WR-TIMEZONE:Asia/Karachi'), 'Device timezone metadata is missing')
assert(calendar.includes('DTSTAMP:20260821T050000Z'), 'UTC generation timestamp is invalid')
assert(calendar.includes('SUMMARY:Report\\, review\\; ship'), 'ICS text was not escaped')
assert(calendar.includes('DESCRIPTION:First line\\nSecond line'), 'ICS newlines were not escaped')
assert(calendar.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'), 'Task recurrence was not exported')
assert(calendar.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'), 'Recurring reminder was not exported')
;['FREQ=DAILY', 'FREQ=MONTHLY', 'FREQ=YEARLY', 'FREQ=DAILY;INTERVAL=3'].forEach((rule) => {
  assert(calendar.includes(`RRULE:${rule}`), `Recurrence rule ${rule} was not exported`)
})
assert(calendar.includes('TRIGGER:-PT30M'), 'Relative reminder alarm is missing')
assert(calendar.includes('TRIGGER;VALUE=DATE-TIME:20260823T081500Z'), 'Absolute reminder alarm is missing')
assert(calendar.includes('UID:reminder-only-'), 'Reminder without a deadline was dropped')
assert(!calendar.includes('UID:done@'), 'Completed task leaked into calendar export')
assert(calendar.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75), 'ICS line folding exceeded 75 bytes')

const repositoryRoot = new URL('../../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('public/manifest.webmanifest', repositoryRoot), 'utf8'))
const indexHtml = readFileSync(new URL('index.html', repositoryRoot), 'utf8')
assert(manifest.name === 'TidyLine' && manifest.display === 'standalone', 'PWA manifest identity is invalid')
assert(manifest.start_url === '/' && manifest.scope === '/', 'PWA manifest navigation boundary is invalid')
assert(manifest.icons.some((icon) => icon.type === 'image/png' && icon.sizes === '1254x1254'), 'PWA icon metadata is missing')
assert(existsSync(new URL('public/logo.png', repositoryRoot)), 'PWA icon asset is missing')
assert(indexHtml.includes('rel="manifest" href="/manifest.webmanifest"'), 'Document does not link the manifest')

console.log('ok    ICS structure, alarms, recurrence, folding, and PWA metadata')
