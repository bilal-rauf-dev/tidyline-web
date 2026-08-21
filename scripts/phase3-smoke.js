import { nextOccurrence } from '../src/utils/recurrence'
import { reminderInstances } from '../src/utils/reminders'
import { applyTaskUpdates } from '../src/utils/taskFields'
import { getDeadlineContext, getReminderContext } from '../src/utils/dayContext'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(nextOccurrence({ freq: 'daily' }, '2026-08-21') === '2026-08-22', 'Daily recurrence failed')
assert(nextOccurrence({ freq: 'weekdays' }, '2026-08-21') === '2026-08-24', 'Weekend skip failed')
assert(nextOccurrence({ freq: 'monthly' }, '2026-01-31') === '2026-02-28', 'Month clamping failed')
assert(nextOccurrence({ freq: 'everyNDays', n: 3 }, '2026-08-21') === '2026-08-24', 'Interval recurrence failed')

const task = { id: 'task', deadline: '2026-08-22' }
const relative = { id: 'rel:60', kind: 'relative', minutesBefore: 60 }
const instances = reminderInstances(task, relative, new Date('2026-08-21'), new Date('2026-08-23'))
assert(instances.length === 1 && Number.isFinite(instances[0].at), 'Relative reminder did not resolve')

const updated = applyTaskUpdates(task, { title: 'Renamed', deadline: '2026-08-23' })
assert(updated.title === 'Renamed' && updated.deadline === '2026-08-23', 'Task update merge failed')
assert(task.deadline === '2026-08-22', 'Task update mutated its input')

const contextTask = {
  id: 'context', title: 'Context task', archived: false, deadline: '2026-08-22',
  reminders: [{ id: 'abs', kind: 'absolute', at: '2026-08-21T12:00' }],
}
assert(getDeadlineContext([contextTask], '2026-08-21').reminders.length === 1, 'Deadline context ignored structured reminders')
assert(getReminderContext([contextTask], '2026-08-21T12:30').nearby.length === 1, 'Reminder context ignored structured reminders')

console.log('ok    retained recurrence, reminders, and task updates')
