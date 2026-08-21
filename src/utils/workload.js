export const DEFAULT_OVERLOAD_HOURS = 6
export function durationToMinutes(duration) {
  if (!duration || !Number.isFinite(Number(duration.value))) return 0
  return duration.unit === 'hr' ? Number(duration.value) * 60 : Number(duration.value)
}
export function getDayWorkload(tasks, overloadHours = DEFAULT_OVERLOAD_HOURS) {
  const active = tasks.filter((task) => !task.done && !task.archived && task.status !== 'waiting')
  const estimatedMinutes = active.reduce((total, task) => total + durationToMinutes(task.duration), 0)
  const unestimated = active.filter((task) => !task.duration).length
  return { estimatedMinutes, unestimated, overloaded: estimatedMinutes > overloadHours * 60 }
}
export function getCapacitySummary(tasks, dateStr, overloadHours = DEFAULT_OVERLOAD_HOURS) {
  const due = tasks.filter((task) => !task.done && !task.archived && task.status !== 'waiting' && task.deadline === dateStr)
  const estimatedMinutes = due.reduce((total, task) => total + durationToMinutes(task.duration), 0)
  const capacityMinutes = overloadHours * 60
  return { taskCount: due.length, estimatedMinutes, unestimatedCount: due.filter((task) => !task.duration).length, capacityMinutes, overBy: Math.max(0, estimatedMinutes - capacityMinutes) }
}
export function formatWorkload(minutes) {
  if (minutes === 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}m`
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}
export function formatCapacitySummary(summary) {
  const tasks = `${summary.taskCount} task${summary.taskCount === 1 ? '' : 's'} due`
  const unknown = summary.unestimatedCount ? ` (${summary.unestimatedCount} unestimated)` : ''
  const estimate = `${formatWorkload(summary.estimatedMinutes)} estimated`
  if (summary.overBy > 0) return `${tasks}${unknown}, ${estimate}, ${formatWorkload(summary.capacityMinutes)} capacity — ${formatWorkload(summary.overBy)} over.`
  return `${tasks}${unknown}, ${estimate}.`
}
