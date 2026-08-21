import { toDateStr } from './calendar'

export const DEFAULT_FILTERS = { query: '', tag: 'all', priority: 'all', status: 'all', durationMin: '', durationMax: '', pinnedOnly: false, dateFrom: '', dateTo: '', sortBy: 'deadline', sortDir: 'asc' }
export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' }, { value: 'active', label: 'Not done' }, { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' }, { value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: 'Upcoming' },
]
export const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }, { value: 'unset', label: 'No priority' },
]
export const SORT_OPTIONS = [
  { value: 'deadline', label: 'Due date' }, { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' }, { value: 'tags', label: 'Tags' },
  { value: 'duration', label: 'Duration' }, { value: 'createdAt', label: 'Created date' },
]
function matchesStatus(task, status, todayStr) {
  switch (status) {
    case 'active': return !task.done && task.status !== 'waiting'
    case 'waiting': return !task.done && task.status === 'waiting'
    case 'completed': return task.done
    case 'overdue': return !task.done && task.status !== 'waiting' && task.deadline < todayStr && !(task.startDate && task.startDate > todayStr) && task.plannedDate !== todayStr
    case 'upcoming': return !task.done && Boolean(task.startDate && task.startDate > todayStr)
    default: return true
  }
}
function durationMinutes(duration) { return duration ? (duration.unit === 'hr' ? duration.value * 60 : duration.value) : 0 }
export function filterTasks(tasks, filters = DEFAULT_FILTERS) {
  const settings = { ...DEFAULT_FILTERS, ...filters }
  const todayStr = toDateStr(new Date())
  const query = settings.query.trim().toLowerCase()
  return tasks.filter((task) => {
    if (!matchesStatus(task, settings.status, todayStr)) return false
    if (settings.tag !== 'all' && !(task.tags ?? []).includes(settings.tag)) return false
    if (settings.priority !== 'all' && (settings.priority === 'unset' ? Boolean(task.priority) : task.priority !== settings.priority)) return false
    if (settings.pinnedOnly && !task.pinned) return false
    if (settings.dateFrom && (!task.deadline || task.deadline < settings.dateFrom)) return false
    if (settings.dateTo && (!task.deadline || task.deadline > settings.dateTo)) return false
    const minutes = durationMinutes(task.duration)
    if (settings.durationMin !== '' && minutes < Number(settings.durationMin)) return false
    if (settings.durationMax !== '' && minutes > Number(settings.durationMax)) return false
    if (!query) return true
    return [task.title, task.waitingFor, ...(task.tags ?? [])].join(' ').toLowerCase().includes(query)
  })
}
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
export function buildComparator({ sortBy = 'deadline', sortDir = 'asc' } = {}) {
  const direction = sortDir === 'desc' ? -1 : 1
  return (a, b) => {
    if (sortBy === 'priority') {
      const aUnset = !a.priority
      const bUnset = !b.priority
      if (aUnset !== bUnset) return aUnset ? 1 : -1
      if (!aUnset && a.priority !== b.priority) return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * direction
      return (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31')
    }
    if (sortBy === 'duration') {
      const aUnset = !a.duration
      const bUnset = !b.duration
      if (aUnset !== bUnset) return aUnset ? 1 : -1
      return (durationMinutes(a.duration) - durationMinutes(b.duration)) * direction
    }
    if (sortBy === 'title') return a.title.localeCompare(b.title) * direction
    if (sortBy === 'tags') return (a.tags?.join(', ') ?? '').localeCompare(b.tags?.join(', ') ?? '') * direction
    const left = sortBy === 'createdAt' ? a.createdAt : (a.deadline ?? '9999-12-31')
    const right = sortBy === 'createdAt' ? b.createdAt : (b.deadline ?? '9999-12-31')
    return left.localeCompare(right) * direction
  }
}
