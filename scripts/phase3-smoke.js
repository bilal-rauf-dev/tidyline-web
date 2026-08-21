import { getCapacitySummary, getDayWorkload } from '../src/utils/workload'
import { getDailyShutdown } from '../src/utils/shutdown'

function assert(condition, message) { if (!condition) throw new Error(message) }

const base = { done: false, archived: false, status: 'active', checklist: [], postponeHistory: [] }
const workloadTasks = [
  { ...base, id: 'a', title: 'Estimated', deadline: '2026-08-05', duration: { value: 7, unit: 'hr' } },
  { ...base, id: 'b', title: 'Unknown', deadline: '2026-08-05', duration: null },
]
assert(getDayWorkload(workloadTasks, 6).overloaded, 'Seven-hour day was not flagged overloaded')
const capacity = getCapacitySummary(workloadTasks, '2026-08-05', 6)
assert(capacity.taskCount === 2 && capacity.unestimatedCount === 1, 'Capacity did not disclose task and unestimated counts')
assert(capacity.overBy === 60, 'Capacity overage was not factual')

const today = '2026-08-04'
const shutdown = getDailyShutdown([
  { ...base, id: 'due', deadline: today },
  { ...base, id: 'done', deadline: today, done: true },
  { ...base, id: 'waiting', deadline: today, status: 'waiting' },
  { ...base, id: 'idea', deadline: null },
], new Date(2026, 7, 4))
assert(shutdown.tasks.length === 2 && shutdown.completed === 1, 'Shutdown totals included waiting or deadline-free work')

console.log('ok    Phase 3 capacity and shutdown rules')
