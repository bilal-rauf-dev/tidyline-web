import assert from 'node:assert/strict'
import {
  deliveryPayload,
  dueReminderInstances,
  zonedDateTimeToTimestamp,
} from '../supabase/functions/send-reminders/schedule.js'

const at = (value) => new Date(value).getTime()

assert.equal(
  zonedDateTimeToTimestamp({ year: 2026, month: 9, day: 20, hour: 9, minute: 0 }, 'Asia/Karachi'),
  at('2026-09-20T04:00:00.000Z'),
)
assert.equal(
  zonedDateTimeToTimestamp({ year: 2026, month: 7, day: 1, hour: 9, minute: 0 }, 'America/New_York'),
  at('2026-07-01T13:00:00.000Z'),
)

const task = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'Submit report',
  deadline: '2026-09-20',
  created_at: '2026-09-01T12:00:00.000Z',
}

const relative = dueReminderInstances(
  task,
  { id: 'rel:60', kind: 'relative', minutesBefore: 60 },
  at('2026-09-20T02:59:00.000Z'),
  at('2026-09-20T03:00:00.000Z'),
  'Asia/Karachi',
)
assert.deepEqual(relative, [{ reminderId: 'rel:60', scheduledFor: '2026-09-20T03:00:00.000Z' }])

const timedTask = { ...task, deadline_time: '17:45:00' }
const timedRelative = dueReminderInstances(
  timedTask,
  { id: 'rel:60', kind: 'relative', minutesBefore: 60 },
  at('2026-09-20T11:44:00.000Z'),
  at('2026-09-20T11:45:00.000Z'),
  'Asia/Karachi',
)
assert.deepEqual(timedRelative, [{ reminderId: 'rel:60', scheduledFor: '2026-09-20T11:45:00.000Z' }])

const absolute = dueReminderInstances(
  task,
  { id: 'abs:local', kind: 'absolute', at: '2026-09-20T09:30' },
  at('2026-09-20T04:29:00.000Z'),
  at('2026-09-20T04:30:00.000Z'),
  'Asia/Karachi',
)
assert.equal(absolute[0].scheduledFor, '2026-09-20T04:30:00.000Z')

const weekday = dueReminderInstances(
  task,
  { id: 'weekdays', kind: 'recurring', rule: { freq: 'weekdays' }, time: '09:00' },
  at('2026-09-21T03:59:00.000Z'),
  at('2026-09-21T04:00:00.000Z'),
  'Asia/Karachi',
)
assert.equal(weekday.length, 1)
assert.equal(weekday[0].scheduledFor, '2026-09-21T04:00:00.000Z')

assert.equal(dueReminderInstances(
  task,
  { id: 'weekdays', kind: 'recurring', rule: { freq: 'weekdays' }, time: '09:00' },
  at('2026-09-20T03:59:00.000Z'),
  at('2026-09-20T04:00:00.000Z'),
  'Asia/Karachi',
).length, 0)

const monthEndTask = {
  ...task,
  id: 'month-end',
  created_at: '2026-01-31T12:00:00.000Z',
}
const monthEndReminder = dueReminderInstances(
  monthEndTask,
  { id: 'monthly', kind: 'recurring', rule: { freq: 'monthly' }, time: '09:00' },
  at('2026-02-28T08:59:00.000Z'),
  at('2026-02-28T09:00:00.000Z'),
  'UTC',
)
assert.equal(monthEndReminder.length, 1)

const localAnchorTask = {
  ...task,
  id: 'local-anchor',
  created_at: '2026-01-31T21:00:00.000Z',
}
const localAnchorReminder = dueReminderInstances(
  localAnchorTask,
  { id: 'monthly-local', kind: 'recurring', rule: { freq: 'monthly' }, time: '09:00' },
  at('2026-03-01T03:59:00.000Z'),
  at('2026-03-01T04:00:00.000Z'),
  'Asia/Karachi',
)
assert.equal(localAnchorReminder.length, 1)

assert.deepEqual(deliveryPayload(task, relative[0]), {
  title: 'Submit report',
  body: 'Due 2026-09-20',
  taskId: 'task-1',
  reminderId: 'rel:60',
  scheduledFor: '2026-09-20T03:00:00.000Z',
  url: '/board?expand=task-1',
})

assert.equal(deliveryPayload(timedTask, timedRelative[0]).body, 'Due 2026-09-20 at 17:45')

console.log('ok    Background reminders respect device time zones and month-end recurrence')
