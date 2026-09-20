import { durationToMinutes } from './risk'
import { toDateStr } from './calendar'

export const DEFAULT_OVERLOAD_HOURS = 6

export function getDayWorkload(tasks, overloadHours = DEFAULT_OVERLOAD_HOURS) {
  const active = tasks.filter(
    (task) => !task.done && !task.archived && task.status !== 'waiting',
  )
  const estimatedMinutes = active.reduce(
    (total, task) => total + durationToMinutes(task.duration),
    0,
  )
  const unestimated = active.filter((task) => !task.duration).length

  return {
    estimatedMinutes,
    unestimated,
    overloaded: estimatedMinutes > overloadHours * 60,
  }
}

export function formatWorkload(minutes) {
  if (minutes === 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

function nearbyDates(sourceDate, count = 3) {
  const source = new Date(`${sourceDate}T00:00:00`)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(source)
    date.setDate(source.getDate() + index + 1)
    return toDateStr(date)
  })
}

/** Flexible means it is actionable but carries no explicit stability signal. */
export function isFlexibleTask(task) {
  return (
    !task.done &&
    !task.archived &&
    !task.pinned &&
    task.status !== 'waiting' &&
    !task.recurrence &&
    !task.scheduledStart &&
    !task.plannedDate &&
    !task.deadlineTime
  )
}

export function buildRedistributionPlan(
  tasks,
  sourceDate,
  overloadHours = DEFAULT_OVERLOAD_HOURS,
) {
  const candidates = nearbyDates(sourceDate)
  const loads = new Map(
    candidates.map((date) => [
      date,
      getDayWorkload(tasks.filter((task) => task.deadline === date), overloadHours).estimatedMinutes,
    ]),
  )
  let sourceMinutes = getDayWorkload(
    tasks.filter((task) => task.deadline === sourceDate),
    overloadHours,
  ).estimatedMinutes
  const flexible = tasks
    .filter((task) => task.deadline === sourceDate && isFlexibleTask(task))
    .sort((a, b) => durationToMinutes(b.duration) - durationToMinutes(a.duration))
  const proposals = []
  const capacity = overloadHours * 60

  for (const task of flexible) {
    if (sourceMinutes <= capacity) break
    const minutes = durationToMinutes(task.duration)
    if (minutes <= 0) continue

    const allowedDates = candidates.filter((date) => !task.startDate || task.startDate <= date)
    const target = allowedDates
      .sort((a, b) => loads.get(a) - loads.get(b))
      .find((date) => loads.get(date) + minutes <= capacity)
    if (!target) continue

    proposals.push({ task, from: sourceDate, to: target, minutes })
    sourceMinutes -= minutes
    loads.set(target, loads.get(target) + minutes)
  }

  return { sourceDate, proposals, remainingMinutes: sourceMinutes }
}
