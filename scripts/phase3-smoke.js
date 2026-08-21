import {
  CALIBRATION_MIN_SAMPLES,
  FALLBACK_MINUTES,
  durationToMinutes,
  estimateTaskDuration,
  formatMinutes,
  getCalibration,
  median,
} from '../src/utils/calibration'
import { normalizeTask } from '../src/utils/taskMigration'
import { completeTiming, elapsedMinutes, pauseTiming, startTiming } from '../src/utils/taskTiming'
import { nextOccurrence } from '../src/utils/recurrence'
import { reminderInstances } from '../src/utils/reminders'
import { getDeadlineContext, getReminderContext } from '../src/utils/dayContext'
import { serializeTasks, TASK_SCHEMA_VERSION } from '../src/utils/tasksIO'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const task = normalizeTask({ id: 'timed', title: 'Timed task', deadline: '2026-08-22' })
const started = startTiming(task, '2026-08-21T10:00:00.000Z')
assert(started.startedAt === '2026-08-21T10:00:00.000Z', 'Start timestamp was not recorded')
assert(normalizeTask(started).startedAt === started.startedAt, 'Active timing did not survive normalization/reload')
const persisted = JSON.parse(serializeTasks([normalizeTask(started)]))
assert(persisted.schemaVersion === TASK_SCHEMA_VERSION && persisted.tasks[0].startedAt === started.startedAt, 'Active timing was not export/persistence safe')
assert(startTiming(started, '2026-08-21T10:05:00.000Z') === started, 'Starting twice replaced the active interval')
assert(startTiming({ ...task, archived: true }, '2026-08-21T10:05:00.000Z').startedAt === null, 'Archived task could be started')
assert(elapsedMinutes(started.startedAt, '2026-08-21T10:30:00.000Z') === 30, 'Elapsed time calculation failed')

const paused = pauseTiming(started, '2026-08-21T10:30:00.000Z')
assert(paused.startedAt === null && paused.actualMinutes === 30, 'Pause did not accumulate elapsed time')
const resumed = startTiming(paused, '2026-08-21T11:00:00.000Z')
const completed = completeTiming(resumed, '2026-08-21T11:45:00.000Z')
assert(completed.done && completed.startedAt === null, 'Completion left timing active')
assert(completed.actualMinutes === 75, 'Resumed intervals were not accumulated')
assert(normalizeTask({ ...completed, startedAt: '2026-08-21T12:00:00.000Z' }).startedAt === null, 'Completed task retained an active interval')
assert(completeTiming(task, '2026-08-21T12:00:00.000Z').actualMinutes === null, 'Unstarted completion invented actual time')
assert(elapsedMinutes('invalid', '2026-08-21T12:00:00.000Z') === 0, 'Invalid timestamps produced elapsed time')

assert(durationToMinutes({ value: 2, unit: 'hr' }) === 120, 'Hour estimate conversion failed')
assert(durationToMinutes({ value: 30, unit: 'min' }) === 30, 'Minute estimate conversion failed')
assert(durationToMinutes({ value: 0, unit: 'min' }) === null, 'Zero estimate was treated as work duration')
assert(durationToMinutes(null) === null, 'Missing estimate was treated as work duration')
assert(formatMinutes(70) === '1h 10m', 'Duration display formatting failed')
assert(median([3, 1, 2, 100]) === 2.5, 'Median calculation failed')

const sample = (id, estimate, actual, extra = {}) => normalizeTask({
  id, title: id, done: true, completedAt: '2026-08-21T12:00:00.000Z',
  duration: { value: estimate, unit: 'min' }, actualMinutes: actual, ...extra,
})
const calibratedTasks = [sample('a', 30, 60), sample('b', 60, 90), sample('c', 45, 90)]
const calibration = getCalibration(calibratedTasks)
assert(calibration.sampleCount === CALIBRATION_MIN_SAMPLES, 'Valid calibration samples were lost')
assert(calibration.multiplier === 2 && calibration.calibrated, 'Median multiplier was incorrect')
const expected = estimateTaskDuration(normalizeTask({ title: 'New', duration: { value: 30, unit: 'min' } }), calibratedTasks)
assert(expected.minutes === 60 && expected.source === 'calibrated', 'Calibrated estimate was incorrect')

const insufficient = getCalibration(calibratedTasks.slice(0, 2))
assert(insufficient.multiplier === 1 && !insufficient.calibrated, 'Insufficient samples changed estimates')
const invalidSamples = [
  sample('zero-estimate', 0, 40),
  sample('zero-actual', 30, 0),
  sample('unfinished', 30, 60, { done: false }),
  sample('runaway', 30, 999999),
]
assert(getCalibration(invalidSamples).sampleCount === 0, 'Invalid calibration samples were accepted')

const historical = estimateTaskDuration(normalizeTask({ title: 'No estimate' }), calibratedTasks)
assert(historical.minutes === 90 && historical.source === 'history', 'Missing estimate did not use median history')
const fallback = estimateTaskDuration(normalizeTask({ title: 'No history' }), [])
assert(fallback.minutes === FALLBACK_MINUTES && fallback.source === 'fallback', 'Missing history did not use conservative fallback')

assert(nextOccurrence({ freq: 'weekdays' }, '2026-08-21') === '2026-08-24', 'Retained recurrence failed')
const reminderTask = { id: 'reminder', deadline: '2026-08-22' }
const relative = { id: 'rel:60', kind: 'relative', minutesBefore: 60 }
assert(reminderInstances(reminderTask, relative, new Date('2026-08-21'), new Date('2026-08-23')).length === 1, 'Retained relative reminder failed')
const contextTask = {
  id: 'context', title: 'Context task', archived: false, deadline: '2026-08-22',
  reminders: [{ id: 'abs', kind: 'absolute', at: '2026-08-21T12:00' }],
}
assert(getDeadlineContext([contextTask], '2026-08-21').reminders.length === 1, 'Deadline context ignored structured reminders')
assert(getReminderContext([contextTask], '2026-08-21T12:30').nearby.length === 1, 'Reminder context ignored structured reminders')

console.log('ok    actual-time capture, calibration, and canonical duration estimation')
