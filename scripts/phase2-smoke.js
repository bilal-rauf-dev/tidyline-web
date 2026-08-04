import { normalizeTask } from '../src/hooks/useTasks'
import { DEFAULT_FILTERS, filterTasks } from '../src/utils/filters'
import { taskToTemplate } from '../src/hooks/useTemplates'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const today = new Date().toISOString().slice(0, 10)
const someday = normalizeTask({ id: 'idea', title: 'Idea', deadline: null })
assert(someday.deadline === null, 'Someday task was given a synthetic deadline')

const scheduled = normalizeTask({
  id: 'scheduled',
  title: 'Scheduled',
  deadline: '2099-01-02',
  scheduledStart: '2099-01-01T10:30',
})
assert(scheduled.scheduledStart === '2099-01-01T10:30', 'Scheduled start was not preserved')

const released = normalizeTask({
  id: 'waiting',
  title: 'Waiting',
  deadline: '2099-01-02',
  status: 'waiting',
  waitingFor: 'Reply',
  followUpDate: today,
})
assert(released.status === 'active', 'Due follow-up did not release the waiting task')
assert(!released.followUpDate && !released.waitingFor, 'Released waiting metadata was not cleared')

const candidates = [
  normalizeTask({
    id: 'match',
    title: 'Match',
    deadline: '2099-01-10',
    pinned: true,
    duration: { value: 45, unit: 'min' },
  }),
  normalizeTask({
    id: 'miss',
    title: 'Miss',
    deadline: '2099-02-10',
    duration: { value: 10, unit: 'min' },
  }),
]
const filtered = filterTasks(candidates, {
  ...DEFAULT_FILTERS,
  pinnedOnly: true,
  durationMin: '30',
  durationMax: '60',
  dateFrom: '2099-01-01',
  dateTo: '2099-01-31',
})
assert(filtered.length === 1 && filtered[0].id === 'match', 'Advanced filters did not compose')

const template = taskToTemplate(
  normalizeTask({
    id: 'source',
    title: 'Do not copy title',
    deadline: '2099-01-10',
    notes: 'Reusable notes',
    tags: ['study'],
    checklist: [{ id: 'one', text: 'Read', done: true }],
    duration: { value: 1, unit: 'hr' },
  }),
  'Study setup',
)
assert(!('title' in template) && !('deadline' in template), 'Template copied task-specific fields')
assert(template.notes === 'Reusable notes' && template.checklist.length === 1, 'Template lost details')

console.log('ok    Phase 2 scheduling, waiting, someday, template, and filter rules')
