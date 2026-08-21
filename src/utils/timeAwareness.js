import { estimateTaskDuration } from './calibration'
import { daysUntil, startOfDay } from './dates'
import { toDateStr } from './calendar'

export const START_BUFFER_MINUTES = 30
export const DAILY_CAPACITY_MINUTES = 6 * 60
const WORKDAY_START_HOUR = 9
const WORKDAY_END_HOUR = 17

function planningDeadline(deadline) {
  const date = new Date(`${deadline}T00:00:00`)
  date.setHours(WORKDAY_END_HOUR, 0, 0, 0)
  return date
}

export function deriveStartBy(task, tasks, referenceDate = new Date()) {
  if (!task.deadline || task.done) return null
  if (task.startedAt) return toDateStr(referenceDate)
  const expected = estimateTaskDuration(task, tasks).minutes
  const start = planningDeadline(task.deadline)
  start.setMinutes(start.getMinutes() - expected - START_BUFFER_MINUTES)
  return toDateStr(start)
}

function minDate(...values) {
  return values.filter(Boolean).sort()[0] ?? null
}

export function getTaskAttentionDate(task, tasks, referenceDate = new Date()) {
  if (task.done) return task.deadline
  if (task.startedAt) return toDateStr(referenceDate)
  return minDate(deriveStartBy(task, tasks, referenceDate), task.resurfaceDate)
}

function remainingTodayMinutes(referenceDate) {
  const minutes = referenceDate.getHours() * 60 + referenceDate.getMinutes()
  const start = WORKDAY_START_HOUR * 60
  const end = WORKDAY_END_HOUR * 60
  if (minutes <= start) return DAILY_CAPACITY_MINUTES
  if (minutes >= end) return 0
  return Math.round(((end - minutes) / (end - start)) * DAILY_CAPACITY_MINUTES)
}

export function availableWorkMinutes(deadline, referenceDate = new Date()) {
  if (!deadline) return Number.POSITIVE_INFINITY
  const days = daysUntil(deadline, referenceDate)
  if (days < 0) return 0
  return remainingTodayMinutes(referenceDate) + days * DAILY_CAPACITY_MINUTES
}

function remainingTaskMinutes(task, tasks) {
  const expected = estimateTaskDuration(task, tasks).minutes
  return Math.max(0, expected - (Number(task.actualMinutes) || 0))
}

export function getFitAssessment(task, tasks, referenceDate = new Date()) {
  if (!task.deadline || task.done) return null
  const needed = remainingTaskMinutes(task, tasks) + START_BUFFER_MINUTES
  const committed = tasks
    .filter((other) =>
      other.id !== task.id && !other.done && !other.archived && other.deadline && other.deadline <= task.deadline,
    )
    .reduce((total, other) => total + remainingTaskMinutes(other, tasks), 0)
  const available = Math.max(0, availableWorkMinutes(task.deadline, referenceDate) - committed)

  if (available < needed) return { level: 'wont-fit', label: "Won't fit at your usual pace", available, needed }
  if (available < needed * 1.5) return { level: 'tight', label: 'Getting tight', available, needed }
  return { level: 'comfortable', label: 'Fits comfortably', available, needed }
}

function workdaysUntil(dateStr, referenceDate) {
  const cursor = startOfDay(referenceDate)
  const end = new Date(`${dateStr}T00:00:00`)
  let count = 0
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1
  }
  return count
}

export function concreteDistance(dateStr, referenceDate = new Date()) {
  const days = daysUntil(dateStr, referenceDate)
  if (days <= 1) return days === 1 ? 'tomorrow' : 'today'
  if (days <= 6) return `in ${days} days`
  if (days <= 21) {
    const workdays = workdaysUntil(dateStr, referenceDate)
    return `in ${workdays} workday${workdays === 1 ? '' : 's'}`
  }
  const weekends = Math.ceil(days / 7)
  return `in ${weekends} weekends`
}

export function getTaskTimingLabel(task, tasks, referenceDate = new Date()) {
  if (task.done) return 'Completed'
  if (task.startedAt) return 'In progress'

  const startBy = deriveStartBy(task, tasks, referenceDate)
  const resurface = task.resurfaceDate
  const attention = minDate(startBy, resurface)
  if (!attention) return 'Set a deadline when it becomes clear'

  const distance = daysUntil(attention, referenceDate)
  const resurfacingFirst = resurface && resurface === attention && (!startBy || resurface < startBy)
  if (distance <= 0) return resurfacingFirst ? 'Back on your radar' : 'Start now'
  return `${resurfacingFirst ? 'Back' : 'Start'} ${concreteDistance(attention, referenceDate)}`
}

export function getDayWorkload(tasks, dateStr, allTasks = tasks, referenceDate = new Date()) {
  const active = tasks.filter(
    (task) => !task.done && !task.archived && getTaskAttentionDate(task, allTasks, referenceDate) === dateStr,
  )
  return {
    tasks: active,
    minutes: active.reduce((total, task) => total + remainingTaskMinutes(task, allTasks), 0),
  }
}
