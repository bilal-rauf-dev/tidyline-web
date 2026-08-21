import { estimateTaskDuration } from './calibration'
import { daysUntil } from './dates'
import { deriveStartBy, getFitAssessment, getTaskAttentionDate } from './timeAwareness'

function fitOrder(task, tasks, referenceDate) {
  const fit = getFitAssessment(task, tasks, referenceDate)
  return { 'wont-fit': 0, tight: 1, comfortable: 2 }[fit?.level] ?? 3
}

function attentionOrder(task, tasks, referenceDate) {
  if (task.startedAt) return 0
  const startBy = deriveStartBy(task, tasks, referenceDate)
  const attention = getTaskAttentionDate(task, tasks, referenceDate)
  if (startBy && daysUntil(startBy, referenceDate) < 0) return 1
  if (attention && daysUntil(attention, referenceDate) <= 0) return 2
  if (task.deadline && daysUntil(task.deadline, referenceDate) <= 0) return 3
  if (attention) return 4
  return 5
}

function remainingMinutes(task, tasks) {
  return Math.max(
    0,
    estimateTaskDuration(task, tasks).minutes - (Number(task.actualMinutes) || 0),
  )
}

function compareValues(a, b) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] < b[index]) return -1
    if (a[index] > b[index]) return 1
  }
  return 0
}

export function rankNowTasks(tasks, referenceDate = new Date()) {
  const eligible = tasks.filter((task) => !task.done && !task.archived)
  return [...eligible].sort((a, b) => compareValues(
    [
      attentionOrder(a, tasks, referenceDate),
      getTaskAttentionDate(a, tasks, referenceDate) ?? '9999-12-31',
      a.deadline ?? '9999-12-31',
      fitOrder(a, tasks, referenceDate),
      remainingMinutes(a, tasks),
      a.createdAt,
      a.id,
    ],
    [
      attentionOrder(b, tasks, referenceDate),
      getTaskAttentionDate(b, tasks, referenceDate) ?? '9999-12-31',
      b.deadline ?? '9999-12-31',
      fitOrder(b, tasks, referenceDate),
      remainingMinutes(b, tasks),
      b.createdAt,
      b.id,
    ],
  ))
}

export function selectNowTask(tasks, referenceDate = new Date(), excludedIds = []) {
  const ranked = rankNowTasks(tasks, referenceDate)
  const excluded = new Set(excludedIds)
  return ranked.find((task) => !excluded.has(task.id)) ?? ranked[0] ?? null
}

export function rotateNowExclusions(rankedTasks, currentId, excludedIds = []) {
  const skipped = new Set([...excludedIds, currentId])
  const hasUnseen = rankedTasks.some((task) => !skipped.has(task.id))
  return hasUnseen ? [...skipped] : [currentId]
}
