import { toDateStr } from './calendar'
import { daysUntil } from './dates'

export const ENERGY_LEVEL_OPTIONS = [
  { value: '', label: 'Unset' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'deep-focus', label: 'Deep focus' },
]

export const PRIORITY_OPTIONS = [
  { value: '', label: 'No priority' },
  { value: 'high', label: 'High priority' },
  { value: 'medium', label: 'Medium priority' },
  { value: 'low', label: 'Low priority' },
]

const ENERGY_LEVELS = new Set(ENERGY_LEVEL_OPTIONS.map((option) => option.value).filter(Boolean))
const PRIORITIES = new Set(PRIORITY_OPTIONS.map((option) => option.value).filter(Boolean))
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/
const TIME_VALUE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d{1,6})?)?$/

export function normalizeEnergyLevel(value) {
  return ENERGY_LEVELS.has(value) ? value : null
}

export function normalizePriority(value) {
  return PRIORITIES.has(value) ? value : null
}

export function priorityLabel(value) {
  return PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? 'No priority'
}

export function normalizeStartDate(value, deadline) {
  if (!deadline || !DATE_VALUE.test(value ?? '')) {
    return null
  }

  return value <= deadline ? value : null
}

export function normalizePlannedDate(value) {
  return DATE_VALUE.test(value ?? '') ? value : null
}

export function normalizeDeadlineTime(value) {
  return TIME_VALUE.test(value ?? '') ? value.slice(0, 5) : null
}

export function validateStartDate(startDate, deadline) {
  if (!startDate) {
    return ''
  }

  if (!deadline) {
    return 'Choose a deadline before adding a start date.'
  }

  if (startDate <= deadline) return ''

  return 'Start date cannot be after the deadline.'
}

export function applyTaskUpdates(task, updates, source = 'edit', at = new Date().toISOString()) {
  const deadline = updates.deadline ?? task.deadline
  const startDate = updates.startDate === undefined ? task.startDate : updates.startDate || null
  const deadlineTime = updates.deadlineTime === undefined
    ? task.deadlineTime
    : normalizeDeadlineTime(updates.deadlineTime)

  if (validateStartDate(startDate, deadline)) {
    return task
  }

  const next = {
    ...task,
    ...updates,
    deadlineTime: deadline ? deadlineTime : null,
    priority:
      updates.priority === undefined ? task.priority : normalizePriority(updates.priority),
    startDate,
    energyLevel:
      updates.energyLevel === undefined
        ? task.energyLevel
        : normalizeEnergyLevel(updates.energyLevel),
  }

  if (updates.deadline && task.deadline && updates.deadline > task.deadline) {
    next.postponeHistory = [
      ...(task.postponeHistory ?? []),
      { from: task.deadline, to: updates.deadline, at, source },
    ]
  }

  return next
}

export function applyTaskRescheduleMoves(
  tasks,
  moves,
  source = 'calendar',
  at = new Date().toISOString(),
) {
  const deadlinesById = new Map(moves.map((move) => [move.id, move.deadline]))
  const updatedTasks = []
  const nextTasks = tasks.map((task) => {
    const deadline = deadlinesById.get(task.id)
    if (!deadline || deadline === task.deadline) return task

    const updated = applyTaskUpdates(task, { deadline }, source, at)
    if (updated !== task) updatedTasks.push(updated)
    return updated
  })

  return { tasks: nextTasks, updatedTasks }
}

export function isTaskUpcoming(task, referenceDate = new Date()) {
  return Boolean(task.startDate && task.startDate > toDateStr(referenceDate))
}

export function isTaskPlannedForToday(task, referenceDate = new Date()) {
  return task.plannedDate === toDateStr(referenceDate)
}

export function shiftStartDateForDeadline(startDate, currentDeadline, nextDeadline) {
  if (!startDate || !currentDeadline || !nextDeadline) {
    return null
  }

  const leadDays = Math.max(0, daysUntil(currentDeadline, new Date(`${startDate}T00:00:00`)))
  const shifted = new Date(`${nextDeadline}T00:00:00`)
  shifted.setDate(shifted.getDate() - leadDays)
  return toDateStr(shifted)
}

export function normalizePostponeHistory(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry) =>
        entry &&
        DATE_VALUE.test(entry.from ?? '') &&
        DATE_VALUE.test(entry.to ?? '') &&
        entry.to > entry.from,
    )
    .map((entry) => ({
      from: entry.from,
      to: entry.to,
      at: typeof entry.at === 'string' ? entry.at : new Date().toISOString(),
      source: entry.source === 'drag' || entry.source === 'calendar' ? entry.source : 'edit',
    }))
}

export function getPostponeSummary(task) {
  const history = normalizePostponeHistory(task.postponeHistory)

  return {
    count: history.length,
    originalDeadline: task.originalDeadline ?? history[0]?.from ?? task.deadline,
  }
}
