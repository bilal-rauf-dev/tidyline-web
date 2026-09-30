import { toDateStr } from './calendar'

export const DEFAULT_FILTERS = {
  query: '',
  tag: 'all',
  status: 'all',
  energyLevel: 'all',
  priority: 'all',
  durationMin: '',
  durationMax: '',
  pinnedOnly: false,
  dateFrom: '',
  dateTo: '',
  sortBy: 'deadline',
  sortDir: 'asc',
}

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Not done' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
]

export const SORT_OPTIONS = [
  { value: 'deadline', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created date' },
]

export const ENERGY_FILTER_OPTIONS = [
  { value: 'all', label: 'Any energy' },
  { value: 'low', label: 'Tired-friendly · low' },
  { value: 'normal', label: 'Normal energy' },
  { value: 'deep-focus', label: 'Deep focus' },
  { value: 'unset', label: 'No energy set' },
]

export const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Any priority' },
  { value: 'high', label: 'High priority' },
  { value: 'medium', label: 'Medium priority' },
  { value: 'low', label: 'Low priority' },
  { value: 'unset', label: 'No priority' },
]

function matchesStatus(task, status, todayStr) {
  switch (status) {
    case 'active':
      return !task.done && task.status !== 'waiting'
    case 'waiting':
      return !task.done && task.status === 'waiting'
    case 'completed':
      return task.done
    case 'overdue':
      return (
        !task.done &&
        task.status !== 'waiting' &&
        task.deadline < todayStr &&
        !(task.startDate && task.startDate > todayStr) &&
        task.plannedDate !== todayStr
      )
    case 'upcoming':
      return !task.done && Boolean(task.startDate && task.startDate > todayStr)
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

    if (
      filters.energyLevel !== 'all' &&
      (filters.energyLevel === 'unset'
        ? Boolean(task.energyLevel)
        : task.energyLevel !== filters.energyLevel)
    ) {
      return false
    }

    if (
      filters.priority !== 'all' &&
      (filters.priority === 'unset'
        ? Boolean(task.priority)
        : task.priority !== filters.priority)
    ) {
      return false
    }

    if (filters.pinnedOnly && !task.pinned) {
      return false
    }

    if (filters.dateFrom && task.deadline < filters.dateFrom) {
      return false
    }

    if (filters.dateTo && task.deadline > filters.dateTo) {
      return false
    }

    const durationMinutes = task.duration
      ? task.duration.unit === 'hr'
        ? task.duration.value * 60
        : task.duration.value
      : 0

    if (filters.durationMin !== '' && durationMinutes < Number(filters.durationMin)) {
      return false
    }

    if (filters.durationMax !== '' && durationMinutes > Number(filters.durationMax)) {
      return false
    }

    if (!query) {
      return true
    }

    const haystack = [task.title, task.waitingFor, ...(task.tags ?? [])].join(' ').toLowerCase()
    return haystack.includes(query)
  })
}

export function buildComparator({ sortBy, sortDir }) {
  const direction = sortDir === 'desc' ? -1 : 1
  const priorityRank = { high: 0, medium: 1, low: 2 }

  return (a, b) => {
    if (sortBy === 'priority') {
      const priorityDifference =
        (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3)
      if (priorityDifference !== 0) return priorityDifference * direction
      return a.deadline.localeCompare(b.deadline) * direction
    }

    const left = sortBy === 'createdAt' ? a.createdAt : a.deadline
    const right = sortBy === 'createdAt' ? b.createdAt : b.deadline
    return left.localeCompare(right) * direction
  }
}
