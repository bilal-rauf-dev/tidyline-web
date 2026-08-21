import { BUCKET_ORDER, BUCKET_RANGES, deadlineForBucket, getTaskBucket, groupTasksByBucket } from '../src/utils/buckets'
import { buildComparator, DEFAULT_FILTERS, filterTasks } from '../src/utils/filters'
import { groupOverdue, overdueSeverity } from '../src/utils/overdue'
import { nextOccurrence } from '../src/utils/recurrence'
import { getCapacitySummary } from '../src/utils/workload'
import { applyDailyMaintenance, normalizeTask } from '../src/hooks/useTasks'
import { cleanupLegacyPreferences, CURRENT_SCHEMA_VERSION, migrateTaskData } from '../src/utils/migrations'
import { validateImport } from '../src/utils/tasksIO'
import { TASK_FIELDS } from '../src/utils/taskFields'
import { parseNaturalTask } from '../src/utils/parseNaturalTask'
import { buildQuickAddTask, PARSER_FIELD_MAP, PARSER_ONLY_KEYS } from '../src/utils/quickAddTask'
import { toDateStr } from '../src/utils/calendar'

let passed = 0
let failed = 0
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok    ${name}`) }
  catch (error) { failed += 1; console.error(`FAIL  ${name}: ${error.message}`) }
}
function assert(value, message) { if (!value) throw new Error(message) }

const reference = new Date(2026, 7, 10)
const task = (overrides = {}) => ({ id: crypto.randomUUID(), title: 'Task', deadline: '2026-08-11', done: false, archived: false, pinned: false, status: 'active', tags: [], checklist: [], postponeHistory: [], ...overrides })

test('bucket ranges tile tested integer line exactly once', () => {
  for (let day = -400; day <= 800; day += 1) assert(BUCKET_RANGES.filter((range) => day >= range.minDays && day <= range.maxDays).length === 1, `day ${day}`)
})
;[[0, 'today'], [1, 'week'], [7, 'week'], [8, 'month'], [30, 'month'], [31, 'later'], [-1, 'today']].forEach(([day, key]) => test(`bucket boundary ${day} → ${key}`, () => {
  const date = new Date(reference); date.setDate(date.getDate() + day)
  assert(getTaskBucket(toDateStr(date), reference) === key, 'wrong bucket')
}))
test('bucket deadlines round-trip', () => BUCKET_ORDER.forEach((key) => assert(getTaskBucket(deadlineForBucket(key, reference), reference) === key, key)))
test('undated tasks land in nodate', () => assert(groupTasksByBucket([task({ deadline: null })], reference).nodate.length === 1, 'missing nodate'))
test('bucket order is pinned then not-done then comparator', () => {
  const grouped = groupTasksByBucket([task({ id: 'done', done: true }), task({ id: 'open' }), task({ id: 'pin', pinned: true, done: true })], reference)
  assert(grouped.week.map((entry) => entry.id).join(',') === 'pin,open,done', 'wrong order')
})

test('overdue tier boundaries are 1, 6, and 7 days', () => {
  assert(overdueSeverity(task({ deadline: '2026-08-09' }), reference) === 1, 'one day')
  assert(overdueSeverity(task({ deadline: '2026-08-04' }), reference) === 2, 'six days')
  assert(overdueSeverity(task({ deadline: '2026-08-03' }), reference) === 3, 'seven days')
})
test('overdue exclusions hold', () => {
  const excluded = [task({ status: 'waiting', deadline: '2026-08-01' }), task({ startDate: '2026-08-12', deadline: '2026-08-01' }), task({ plannedDate: '2026-08-10', deadline: '2026-08-01' }), task({ archived: true, deadline: '2026-08-01' }), task({ done: true, deadline: '2026-08-01' })]
  assert(groupOverdue(excluded, reference).length === 0, 'excluded task appeared')
})

test('every filter status branch', () => {
  const today = new Date().toISOString().slice(0, 10)
  const list = [task({ id: 'active', deadline: today }), task({ id: 'waiting', deadline: today, status: 'waiting' }), task({ id: 'done', deadline: today, done: true }), task({ id: 'overdue', deadline: '2000-01-01' }), task({ id: 'upcoming', deadline: '2099-02-01', startDate: '2099-01-01' })]
  for (const status of ['active', 'waiting', 'completed', 'overdue', 'upcoming']) assert(filterTasks(list, { ...DEFAULT_FILTERS, status }).length >= 1, status)
})
test('combined tag priority and date filters', () => {
  const list = [task({ tags: ['work'], priority: 'high', deadline: '2026-08-20' }), task({ tags: ['home'], priority: 'low', deadline: '2026-08-20' })]
  assert(filterTasks(list, { ...DEFAULT_FILTERS, tag: 'work', priority: 'high', dateFrom: '2026-08-15', dateTo: '2026-08-25' }).length === 1, 'combined filter')
})
test('priority comparator keeps unset last in both directions', () => {
  const list = [task({ id: 'unset', priority: null }), task({ id: 'high', priority: 'high' }), task({ id: 'low', priority: 'low' })]
  assert([...list].sort(buildComparator({ sortBy: 'priority', sortDir: 'asc' })).at(-1).id === 'unset', 'asc unset')
  assert([...list].sort(buildComparator({ sortBy: 'priority', sortDir: 'desc' })).at(-1).id === 'unset', 'desc unset')
})

const recurrenceCases = [
  [{ freq: 'daily' }, '2026-08-10', '2026-08-11'], [{ freq: 'weekdays' }, '2026-08-14', '2026-08-17'],
  [{ freq: 'weekly', weekday: 1 }, '2026-08-10', '2026-08-17'], [{ freq: 'everyNDays', n: 14 }, '2026-08-10', '2026-08-24'],
  [{ freq: 'monthly' }, '2025-01-31', '2025-02-28'], [{ freq: 'yearly' }, '2024-02-29', '2025-02-28'],
]
recurrenceCases.forEach(([rule, from, expected]) => test(`recurrence ${rule.freq} from ${from}`, () => assert(nextOccurrence(rule, from) === expected, nextOccurrence(rule, from))))
test('parser maps every 2 weeks to fourteen days', () => assert(parseNaturalTask('Review every 2 weeks').recurrence?.n === 14, 'not 14'))

test('capacity counts sums and unestimated work', () => {
  const summary = getCapacitySummary([task({ duration: { value: 2, unit: 'hr' } }), task({ duration: null })], '2026-08-11', 1)
  assert(summary.taskCount === 2 && summary.estimatedMinutes === 120 && summary.unestimatedCount === 1 && summary.overBy === 60, JSON.stringify(summary))
})
test('capacity overBy clamps at zero', () => assert(getCapacitySummary([task({ duration: { value: 30, unit: 'min' } })], '2026-08-11', 6).overBy === 0, 'not clamped'))

test('maintenance clears stale plan and releases waiting', () => {
  const list = [task({ plannedDate: '2026-08-09' }), task({ status: 'waiting', waitingFor: 'Reply', followUpDate: '2026-08-10' })]
  const next = applyDailyMaintenance(list, '2026-08-10')
  assert(next[0].plannedDate === null && next[1].status === 'active' && !next[1].followUpDate, 'maintenance failed')
})
test('maintenance preserves array identity when unchanged', () => { const list = [task()]; assert(applyDailyMaintenance(list, '2026-08-10') === list, 'new reference') })

test('v1 bare array migrates to v2 and drops energy', () => {
  const result = migrateTaskData([{ title: 'Old', energyLevel: 'deep-focus' }])
  assert(result.schemaVersion === CURRENT_SCHEMA_VERSION && !('energyLevel' in result.tasks[0]), 'migration failed')
})
test('future schema refuses to load', () => assert(migrateTaskData({ schemaVersion: 99, tasks: [] }).status === 'future', 'future accepted'))
test('legacy bucket preferences are removed', () => {
  const values = new Map([['tidyline:bucket-config', 'x'], ['tidyline:bucket-order', 'x'], ['keep', 'x']])
  cleanupLegacyPreferences({ removeItem: (key) => values.delete(key) })
  assert(values.size === 1 && values.has('keep'), 'cleanup removed the wrong keys')
})
test('import validation reports skip and repair counts', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000'
  const result = validateImport([{ id, title: 'A', deadline: null }, { id, title: 'B', deadline: '2026-08-10' }, { title: 'C', deadline: null }, { title: '', deadline: null }, { title: 'D', deadline: 'bad' }])
  assert(result.tasks.length === 3 && result.repaired === 2 && result.skipped === 2, JSON.stringify(result))
})

test('normalized task keys exactly match TASK_FIELDS', () => assert(Object.keys(normalizeTask({ id: 'x', title: 'X', deadline: null })).join('|') === TASK_FIELDS.join('|'), 'schema drift'))
test('parser keys map to task fields or explicit parser-only keys', () => {
  const parsed = parseNaturalTask('Report tomorrow !high #work for 30m', reference)
  Object.keys(parsed).forEach((key) => assert(PARSER_ONLY_KEYS.includes(key) || TASK_FIELDS.includes(PARSER_FIELD_MAP[key]), `unmapped ${key}`))
  const normalized = normalizeTask({ id: crypto.randomUUID(), ...buildQuickAddTask(parsed, reference) })
  assert(normalized.priority === 'high' && normalized.tags.includes('work') && normalized.duration.value === 30, 'round-trip lost data')
})
test('filter and sort pipeline handles 2,000 tasks', () => {
  const many = Array.from({ length: 2000 }, (_, index) => task({ id: crypto.randomUUID(), title: `Task ${index}`, priority: index % 4 === 0 ? 'high' : null }))
  const started = performance.now()
  const result = filterTasks(many, DEFAULT_FILTERS).sort(buildComparator({ sortBy: 'priority', sortDir: 'asc' }))
  assert(result.length === 2000 && performance.now() - started < 1000, 'pipeline stalled')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exitCode = 1
