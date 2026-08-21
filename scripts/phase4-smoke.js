import { getTaskBucketForTask, groupTasksByBucket } from '../src/utils/buckets'
import { normalizeTask } from '../src/utils/taskMigration'
import {
  START_BUFFER_MINUTES,
  availableWorkMinutes,
  concreteDistance,
  deriveStartBy,
  getDayWorkload,
  getFitAssessment,
  getTaskTimingLabel,
} from '../src/utils/timeAwareness'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const reference = new Date(2026, 7, 21, 9, 0)
const task = (id, deadline, minutes, extra = {}) => normalizeTask({
  id, title: id, deadline, duration: minutes ? { value: minutes, unit: 'min' } : null, ...extra,
})

assert(START_BUFFER_MINUTES === 30, 'Start buffer stopped being deterministic')
assert(deriveStartBy(task('short', '2026-08-21', 120), [], reference) === '2026-08-21', 'Same-day start-by failed')
assert(deriveStartBy(task('long', '2026-08-24', 4320), [], reference) === '2026-08-21', 'Multi-day start-by failed')

const samples = [
  task('done-a', '2026-08-10', 300, { done: true, actualMinutes: 600 }),
  task('done-b', '2026-08-11', 300, { done: true, actualMinutes: 600 }),
  task('done-c', '2026-08-12', 300, { done: true, actualMinutes: 600 }),
]
const calibrated = task('calibrated', '2026-08-24', 600)
assert(deriveStartBy(calibrated, [...samples, calibrated], reference) === '2026-08-23', 'Calibrated duration did not move start-by earlier')

const startToday = task('start-today', '2026-08-24', 4320)
const resurfaced = task('resurfaced', '2026-10-01', 30, { resurfaceDate: '2026-08-21' })
const active = task('active', '2026-10-01', 30, { startedAt: '2026-08-21T08:00:00.000Z' })
const all = [startToday, resurfaced, active]
assert(getTaskBucketForTask(startToday, all, reference) === 'today', 'Start-by-today task did not enter Today')
assert(getTaskBucketForTask(resurfaced, all, reference) === 'today', 'Resurfaced task did not enter Today')
assert(getTaskBucketForTask(active, all, reference) === 'today', 'Active task did not remain in Today')
assert(groupTasksByBucket(all, reference, all).today.length === 3, 'Start-aware grouping lost tasks')
assert(getTaskTimingLabel(startToday, all, reference) === 'Start now', 'Start-now language failed')
assert(getTaskTimingLabel(resurfaced, all, reference) === 'Back on your radar', 'Resurface language failed')

assert(availableWorkMinutes('2026-08-21', reference) === 360, 'Daily capacity calculation failed')
assert(getFitAssessment(task('comfortable', '2026-08-21', 60), [], reference).level === 'comfortable', 'Comfortable fit failed')
assert(getFitAssessment(task('tight', '2026-08-21', 300), [], reference).level === 'tight', 'Tight fit failed')
assert(getFitAssessment(task('impossible', '2026-08-21', 400), [], reference).level === 'wont-fit', 'Impossible fit failed')
const target = task('target', '2026-08-21', 100)
const competing = task('competing', '2026-08-21', 300)
assert(getFitAssessment(target, [target, competing], reference).level === 'wont-fit', 'Earlier committed workload did not affect fit')
assert(getFitAssessment(task('undated', null, 400), [], reference) === null, 'Undated task received false fit language')

assert(concreteDistance('2026-08-25', reference) === 'in 4 days', 'Near-future distance failed')
assert(concreteDistance('2026-09-20', reference) === 'in 5 weekends', 'Long-future distance failed')

const work = getDayWorkload([startToday], '2026-08-21', [startToday], reference)
assert(work.tasks.length === 1 && work.minutes === 4320, 'Calibrated workload did not use canonical duration')

const invalidResurface = normalizeTask({ title: 'Invalid resurface', deadline: '2026-08-25', resurfaceDate: '2026-08-26' })
assert(invalidResurface.resurfaceDate === null, 'Resurface date after deadline survived migration')
const validResurface = normalizeTask({ title: 'Valid resurface', deadline: '2026-08-25', resurfaceDate: '2026-08-22' })
assert(validResurface.resurfaceDate === '2026-08-22', 'Valid resurface date was lost')
assert(normalizeTask({ title: 'Bad date', deadline: '2026-99-99' }).deadline === null, 'Impossible calendar date survived migration')

console.log('ok    derived start-by, fit language, workload, and resurfacing')
