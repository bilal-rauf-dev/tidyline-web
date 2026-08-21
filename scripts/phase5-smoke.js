import { normalizeTask } from '../src/utils/taskMigration'
import { rankNowTasks, rotateNowExclusions, selectNowTask } from '../src/utils/nowSelection'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const reference = new Date(2026, 7, 21, 10, 0)
const task = (id, deadline, minutes = 30, extra = {}) => normalizeTask({
  id, title: id, deadline, duration: { value: minutes, unit: 'min' },
  createdAt: `2026-08-${String(10 + id.length).padStart(2, '0')}T09:00:00.000Z`,
  ...extra,
})

const active = task('active', '2026-08-30', 30, { startedAt: '2026-08-21T09:00:00.000Z' })
const missedStart = task('missed', '2026-08-22', 2520)
const today = task('today', '2026-08-21', 30)
const future = task('future', '2026-09-10', 30)
const done = task('done', '2026-08-20', 30, { done: true })
const archived = task('archived', '2026-08-20', 30, { archived: true })
const ranked = rankNowTasks([future, done, today, archived, missedStart, active], reference)
assert(ranked.map(({ id }) => id).join(',') === 'active,missed,today,future', 'Now urgency order changed')

const small = task('small', '2026-09-20', 20, { resurfaceDate: '2026-08-21' })
const large = task('large', '2026-09-20', 120, { resurfaceDate: '2026-08-21' })
const sizeRanked = rankNowTasks([large, small], reference)
assert(sizeRanked[0].id === 'small', 'Reasonable task size did not break an urgency tie')

const dueSooner = task('due-sooner', '2026-08-25', 30, { resurfaceDate: '2026-08-21' })
const dueLater = task('due-later', '2026-08-30', 30, { resurfaceDate: '2026-08-21' })
const deadlineRanked = rankNowTasks([dueLater, dueSooner], reference)
assert(deadlineRanked[0].id === 'due-sooner', 'Deadline urgency did not break an attention tie')

assert(selectNowTask(ranked, reference, ['active'])?.id === 'missed', 'Not-this exclusion did not rotate selection')
const exclusions = rotateNowExclusions(ranked, 'active', [])
assert(exclusions.length === 1 && exclusions[0] === 'active', 'First rotation was not recorded')
const wrapped = rotateNowExclusions(ranked, 'future', ['active', 'missed', 'today'])
assert(wrapped.length === 1 && wrapped[0] === 'future', 'Rotation did not wrap without getting stuck')
assert(selectNowTask([], reference) === null, 'Empty Now selection invented a task')

console.log('ok    deterministic Now selection and rotation')
