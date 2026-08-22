import { getCalibration } from '../src/utils/calibration'
import { deriveStartBy, getTaskAttentionDate } from '../src/utils/timeAwareness'
import { rankNowTasks } from '../src/utils/nowSelection'
import { normalizeTask } from '../src/utils/taskMigration'
import { TASK_FIELDS } from '../src/utils/taskFields'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const reference = new Date(2026, 7, 26, 14, 0)
const samples = [
  { id: 'sample-1', title: 'Sample 1', done: true, duration: { value: 30, unit: 'min' }, actualMinutes: 60 },
  { id: 'sample-2', title: 'Sample 2', done: true, duration: { value: 60, unit: 'min' }, actualMinutes: 120 },
  { id: 'sample-3', title: 'Sample 3', done: true, duration: { value: 45, unit: 'min' }, actualMinutes: 90 },
].map(normalizeTask)
const calibration = getCalibration(samples)
assert(calibration.calibrated && calibration.multiplier === 2, 'Personal calibration did not stabilize at the median')

const focusTask = normalizeTask({
  id: 'focus',
  title: 'Start the long assignment',
  deadline: '2026-08-28',
  duration: { value: 1440, unit: 'min' },
})
const startBy = deriveStartBy(focusTask, [...samples, focusTask], reference)
assert(startBy && getTaskAttentionDate(focusTask, [...samples, focusTask], reference) === startBy, 'Calibrated start timing was not derived')
assert(!('startBy' in focusTask), 'Derived start timing leaked into persisted task data')
assert(rankNowTasks([focusTask], reference)[0].id === 'focus', 'Start-aware task was not eligible for Now')

const malformedLegacy = normalizeTask({
  id: 'legacy', title: 'Keep this task', deadline: '2026-08-30',
  checklist: [{ text: 'Keep', done: false }, null, { invalid: true }],
  links: [{ url: 'https://example.com' }, { bad: true }],
  reminders: [{ kind: 'relative', minutesBefore: 30 }, { kind: 'relative', minutesBefore: -1 }],
  status: 'waiting', priority: 'high', energyLevel: 'deep-focus',
})
assert(malformedLegacy.title === 'Keep this task', 'Legacy task was lost during normalization')
assert(malformedLegacy.checklist.length === 1 && malformedLegacy.links.length === 1, 'Malformed nested records were not filtered independently')
assert(Object.keys(malformedLegacy).every((key) => TASK_FIELDS.includes(key)), 'Removed task fields leaked through final migration')

console.log('ok    final calibrated-start scenario, task boundary, and malformed-data audit')
