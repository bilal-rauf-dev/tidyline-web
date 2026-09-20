import { normalizeTask } from '../src/hooks/useTasks'
import { DEFAULT_FILTERS, buildComparator, filterTasks } from '../src/utils/filters'
import { taskToTemplate } from '../src/hooks/useTemplates'
import { toDateStr } from '../src/utils/calendar'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const today = toDateStr(new Date())
const someday = normalizeTask({ id: 'idea', title: 'Idea', deadline: null })
assert(someday.deadline === null, 'Someday task was given a synthetic deadline')

const scheduled = normalizeTask({
  id: 'scheduled',
  title: 'Scheduled',
  deadline: '2099-01-02',
  scheduledStart: '2099-01-01T10:30',
})
assert(scheduled.scheduledStart === '2099-01-01T10:30', 'Scheduled start was not preserved')

const prioritized = normalizeTask({
  id: 'priority',
  title: 'Priority task',
  deadline: '2099-01-02',
  priority: 'high',
  plannedDate: today,
})
assert(prioritized.priority === 'high', 'Task priority was not preserved')
assert(prioritized.plannedDate === today, 'Plan-today state was not preserved')

const futurePlanned = normalizeTask({
  id: 'future-plan',
  title: 'Future start',
  deadline: '2099-01-02',
  startDate: '2099-01-01',
  plannedDate: today,
})
assert(futurePlanned.plannedDate === null, 'A future-start task stayed planned for today')

const waitingPlanned = normalizeTask({
  id: 'waiting-plan',
  title: 'Waiting task',
  deadline: '2099-01-02',
  status: 'waiting',
  waitingFor: 'Approval',
  followUpDate: '2099-01-01',
  plannedDate: today,
})
assert(waitingPlanned.plannedDate === null, 'A waiting task stayed planned for today')

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

const priorityCandidates = [
  { ...candidates[0], id: 'high', priority: 'high' },
  { ...candidates[0], id: 'low', priority: 'low' },
  { ...candidates[0], id: 'unset', priority: null },
]
assert(
  filterTasks(priorityCandidates, { ...DEFAULT_FILTERS, priority: 'high' })[0]?.id === 'high',
  'Priority filter did not isolate high-priority tasks',
)
assert(
  [...priorityCandidates].sort(buildComparator({ sortBy: 'priority', sortDir: 'asc' }))[0].id === 'high',
  'Priority sorting did not put high priority first',
)

const template = taskToTemplate(
  normalizeTask({
    id: 'source',
    title: 'Do not copy title',
    deadline: '2099-01-10',
    priority: 'medium',
    notes: 'Reusable notes',
    tags: ['study'],
    checklist: [{ id: 'one', text: 'Read', done: true }],
    duration: { value: 1, unit: 'hr' },
  }),
  'Study setup',
)
assert(!('title' in template) && !('deadline' in template), 'Template copied task-specific fields')
assert(template.notes === 'Reusable notes' && template.checklist.length === 1, 'Template lost details')
assert(template.priority === 'medium', 'Template lost task priority')

console.log('ok    Phase 2 scheduling, waiting, someday, template, and filter rules')
