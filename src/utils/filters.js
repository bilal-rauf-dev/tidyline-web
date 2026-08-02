import { toDateStr } from './calendar'

export const DEFAULT_FILTERS = {
  query: '',
  tag: 'all',
  status: 'all',
  sortBy: 'deadline',
  sortDir: 'asc',
}

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Not done' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
]

export const SORT_OPTIONS = [
  { value: 'deadline', label: 'Due date' },
  { value: 'createdAt', label: 'Created date' },
]

function matchesStatus(task, status, todayStr) {
  switch (status) {
    case 'active':
      return !task.done
    case 'completed':
      return task.done
    case 'overdue':
      return !task.done && task.deadline < todayStr
    case 'upcoming':
      return !task.done && task.deadline >= todayStr
    default:
      return true
  }
}

export function filterTasks(tasks, filters) {
  const todayStr = toDateStr(new Date())
  const query = filters.query.trim().toLowerCase()

  return tasks.filter((task) => {
    if (!matchesStatus(task, filters.status, todayStr)) {
      return false
    }

    if (filters.tag !== 'all' && !(task.tags ?? []).includes(filters.tag)) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = [task.title, ...(task.tags ?? [])].join(' ').toLowerCase()
    return haystack.includes(query)
  })
}

export function buildComparator({ sortBy, sortDir }) {
  const direction = sortDir === 'desc' ? -1 : 1

  return (a, b) => {
    const left = sortBy === 'createdAt' ? a.createdAt : a.deadline
    const right = sortBy === 'createdAt' ? b.createdAt : b.deadline
    return left.localeCompare(right) * direction
  }
}
