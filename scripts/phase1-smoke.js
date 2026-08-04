import { groupTasksByBucket } from '../src/utils/buckets'
import { filterTasks, DEFAULT_FILTERS } from '../src/utils/filters'
import { isOverdue } from '../src/utils/overdue'
import {
  applyTaskUpdates,
  getPostponeSummary,
  shiftStartDateForDeadline,
  validateStartDate,
} from '../src/utils/taskFields'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const now = new Date(2026, 7, 4)
const base = {
  done: false,
  archived: false,
  pinned: false,
  energyLevel: null,
  postponeHistory: [],
}
const tasks = [
  { ...base, id: 'future', deadline: '2026-08-20', startDate: '2026-08-10', plannedDate: null },
  { ...base, id: 'available', deadline: '2026-08-06', startDate: '2026-08-04', plannedDate: null },
  { ...base, id: 'planned', deadline: '2026-09-01', startDate: null, plannedDate: '2026-08-04' },
  { ...base, id: 'stale', deadline: '2026-08-06', startDate: null, plannedDate: '2026-08-03' },
]

const grouped = groupTasksByBucket(tasks, now)
const groupedIds = Object.fromEntries(
  Object.entries(grouped).map(([bucket, list]) => [bucket, list.map((task) => task.id)]),
)
const allBucketIds = Object.values(groupedIds).flat()

assert(!allBucketIds.includes('future'), 'Future-start task leaked into deadline buckets')
assert(groupedIds.week.includes('available'), 'Task did not activate on its start date')
assert(groupedIds.today.includes('planned'), 'Planned task did not enter Today')
assert(groupedIds.week.includes('stale'), 'Stale plan did not revert to deadline bucketing')

const archivedGrouping = groupTasksByBucket(tasks, now, undefined, undefined, {
  includeUpcoming: true,
})
assert(
  Object.values(archivedGrouping).flat().some((task) => task.id === 'future'),
  'Archive grouping hid a future-start task',
)

assert(
  !isOverdue({ ...base, deadline: '2026-08-01', plannedDate: '2026-08-04' }, now),
  'A task planned for today was also marked overdue',
)
assert(
  Boolean(validateStartDate('2026-08-05', '2026-08-04')),
  'Start-after-deadline validation did not block the invalid range',
)

const energyTasks = [
  { ...tasks[1], id: 'low', energyLevel: 'low', title: 'Low' },
  { ...tasks[1], id: 'unset', energyLevel: null, title: 'Unset' },
]
assert(
  filterTasks(energyTasks, { ...DEFAULT_FILTERS, energyLevel: 'low' })[0]?.id === 'low',
  'Low-energy filter did not perform an exact match',
)
assert(
  filterTasks(energyTasks, { ...DEFAULT_FILTERS, energyLevel: 'unset' })[0]?.id === 'unset',
  'Unset-energy filter did not isolate tasks without a value',
)

const historyBase = {
  ...base,
  id: 'history',
  deadline: '2026-08-05',
  originalDeadline: '2026-08-10',
  startDate: null,
}
const postponed = applyTaskUpdates(
  historyBase,
  { deadline: '2026-08-08' },
  'drag',
  '2026-08-04T12:00:00.000Z',
)
assert(postponed.postponeHistory.length === 1, 'Later deadline did not append history')
assert(postponed.postponeHistory[0].source === 'drag', 'Postponement source was not preserved')
assert(
  getPostponeSummary(postponed).originalDeadline === '2026-08-10',
  'Earlier edits erased the task instance original deadline',
)
assert(
  applyTaskUpdates(historyBase, { deadline: '2026-08-04' }).postponeHistory.length === 0,
  'Earlier deadline incorrectly counted as a postponement',
)
assert(
  applyTaskUpdates(
    { ...historyBase, startDate: '2026-08-05' },
    { deadline: '2026-08-04' },
  ).deadline === '2026-08-05',
  'Invalid deadline update bypassed start-date validation',
)
assert(
  shiftStartDateForDeadline('2026-08-02', '2026-08-05', '2026-08-12') === '2026-08-09',
  'Recurring instance did not preserve its start-to-deadline lead time',
)

console.log('ok    Phase 1 task date, energy, planning, and postponement rules')
