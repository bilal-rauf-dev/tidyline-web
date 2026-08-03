import { getDeadlineRisk } from '../src/utils/risk'
import { buildRedistributionPlan, getDayWorkload } from '../src/utils/workload'
import { getPostponeAnalytics } from '../src/utils/analytics'
import { getDailyShutdown } from '../src/utils/shutdown'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const now = new Date(2026, 7, 4)
const base = { done: false, archived: false, status: 'active', checklist: [], postponeHistory: [] }
const easy = { ...base, id: 'easy', title: 'Easy', deadline: '2026-08-20' }
const risky = {
  ...base,
  id: 'risky',
  title: 'Risky',
  deadline: '2026-08-05',
  duration: { value: 4, unit: 'hr' },
  energyLevel: 'deep-focus',
  checklist: [{ done: false }, { done: false }],
  postponeHistory: [{ from: '2026-08-01', to: '2026-08-05' }],
}
assert(
  getDeadlineRisk(risky, [easy, risky], now).score > getDeadlineRisk(easy, [easy, risky], now).score,
  'Risk score did not rise with time, effort, checklist, energy, and postponement pressure',
)
assert(
  getDeadlineRisk({ ...risky, status: 'waiting' }, [risky], now) === null,
  'Waiting task received an actionable risk label',
)

const workloadTasks = [
  { ...base, id: 'move', title: 'Flexible', deadline: '2026-08-05', duration: { value: 4, unit: 'hr' }, pinned: false, recurrence: null, scheduledStart: null },
  { ...base, id: 'fixed', title: 'Pinned', deadline: '2026-08-05', duration: { value: 4, unit: 'hr' }, pinned: true, recurrence: null, scheduledStart: null },
]
assert(getDayWorkload(workloadTasks, 6).overloaded, 'Eight-hour day was not flagged overloaded')
const plan = buildRedistributionPlan(workloadTasks, '2026-08-05', 6)
assert(plan.proposals.length === 1 && plan.proposals[0].task.id === 'move', 'Redistribution moved a constrained task or missed a flexible one')

const delayed = [
  { ...base, id: 'a', title: 'A', tags: ['study'], postponeHistory: [{}, {}] },
  { ...base, id: 'b', title: 'B', tags: ['study', 'work'], postponeHistory: [{}] },
  { ...base, id: 'c', title: 'C', tags: [], postponeHistory: [] },
]
const analytics = getPostponeAnalytics(delayed)
assert(analytics.average === 1, 'Average postponements was not calculated across all tasks')
assert(analytics.tags[0].label === 'study' && analytics.tags[0].count === 3, 'Tag delay aggregation was incorrect')

const today = '2026-08-04'
const shutdown = getDailyShutdown([
  { ...base, id: 'due', deadline: today },
  { ...base, id: 'done', deadline: today, done: true },
  { ...base, id: 'waiting', deadline: today, status: 'waiting' },
  { ...base, id: 'idea', deadline: null },
], now)
assert(shutdown.tasks.length === 2 && shutdown.completed === 1, 'Shutdown totals included waiting or deadline-free work')

console.log('ok    Phase 3 risk, workload, postpone analytics, and shutdown rules')
