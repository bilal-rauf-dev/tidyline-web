import { parseNaturalTask } from '../src/utils/parseNaturalTask.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function toYMD(date) {
  if (!date) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const reference = new Date(2026, 7, 11)
const parsed = parseNaturalTask('Finish DB assignment tomorrow 8pm for 2h remind 30m before #university', reference)
assert(parsed.title === 'Finish DB assignment', `Unexpected title: ${parsed.title}`)
assert(toYMD(parsed.deadline) === '2026-08-12', 'Deadline parsing failed')
assert(parsed.durationMinutes === 120, 'Duration parsing failed')
assert(parsed.reminderMinutes === 30, 'Reminder parsing failed')
assert(parsed.tags.includes('university'), 'Tag parsing failed')
assert(parseNaturalTask('Task for 90m', reference).durationMinutes === 90, 'Minute duration failed')
assert(parseNaturalTask('Task remind 2hr before', reference).reminderMinutes === 120, 'Hour reminder failed')
assert(parseNaturalTask('Water plants every weekday', reference).recurrence?.freq === 'weekdays', 'Weekday recurrence failed')
assert(parseNaturalTask('Review every 3 days', reference).recurrence?.n === 3, 'Interval recurrence failed')

for (const phrase of ['before September', 'until Friday', 'till Monday', 'til Friday', 'no later than Friday', 'by tomorrow', 'due Monday', 'due on Friday']) {
  const result = parseNaturalTask(`Finish report ${phrase}`, reference)
  assert(result.deadline, `Deadline missing for ${phrase}`)
  assert(!result.title.includes('Friday') && !result.title.includes('Monday'), `Date leaked into title for ${phrase}`)
}

const removedSyntax = parseNaturalTask('Study @deep !high plan today start Monday', reference)
assert(removedSyntax.title.includes('@deep') && removedSyntax.title.includes('!high'), 'Removed tokens should remain ordinary title text')
assert(!('priority' in removedSyntax) && !('energy' in removedSyntax), 'Removed parser fields survived')
assert(!('startDate' in removedSyntax) && !('planForToday' in removedSyntax), 'Planning parser fields survived')
const empty = parseNaturalTask('', reference)
assert(empty.title === '' && empty.deadline === null && empty.tags.length === 0, 'Empty input failed')
assert(parseNaturalTask('Call Ali on xyzzy', reference).title.length > 0, 'Malformed phrase crashed')

console.log('ok    reduced natural-language task syntax')
