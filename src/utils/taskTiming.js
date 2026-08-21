const MINUTE_MS = 60_000

function validTimestamp(value) {
  if (typeof value !== 'string' || !value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function elapsedMinutes(startedAt, endedAt = new Date().toISOString()) {
  const start = validTimestamp(startedAt)
  const end = validTimestamp(endedAt)
  if (start === null || end === null || end <= start) return 0
  return Math.max(1, Math.round((end - start) / MINUTE_MS))
}

export function startTiming(task, at = new Date().toISOString()) {
  if (task.done || task.archived || task.startedAt || validTimestamp(at) === null) return task
  return { ...task, startedAt: at }
}

export function pauseTiming(task, at = new Date().toISOString()) {
  if (!task.startedAt) return task
  const elapsed = elapsedMinutes(task.startedAt, at)
  return {
    ...task,
    startedAt: null,
    actualMinutes: Math.max(0, Number(task.actualMinutes) || 0) + elapsed || null,
  }
}

export function completeTiming(task, at = new Date().toISOString()) {
  const paused = pauseTiming(task, at)
  return {
    ...paused,
    done: true,
    completedAt: at,
    startedAt: null,
  }
}
