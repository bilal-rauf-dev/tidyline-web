import { daysUntil } from './dates'
import { toDateStr } from './calendar'
import { getTaskAttentionDate } from './timeAwareness'

export const BUCKET_ORDER = ['today', 'week', 'month', 'later']

export const BUCKET_LABELS = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  later: 'Later',
}

export const BUCKET_END_DAYS = {
  today: 0,
  week: 7,
  month: 30,
  later: Number.POSITIVE_INFINITY,
}

const BUCKET_START_DAYS = {
  today: 0,
  week: 1,
  month: 8,
  later: 31,
}

export function deadlineForBucket(bucketKey, referenceDate = new Date()) {
  const offset = BUCKET_START_DAYS[bucketKey] ?? BUCKET_START_DAYS.later
  const date = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + offset,
  )
  return toDateStr(date)
}

export function getTaskBucket(deadline, referenceDate = new Date()) {
  if (!deadline) return 'later'

  const distance = daysUntil(deadline, referenceDate)
  if (distance <= 0) return 'today'
  if (distance <= BUCKET_END_DAYS.week) return 'week'
  if (distance <= BUCKET_END_DAYS.month) return 'month'
  return 'later'
}

export function getTaskBucketForTask(task, tasks, referenceDate = new Date()) {
  const attentionDate = getTaskAttentionDate(task, tasks, referenceDate)
  return getTaskBucket(attentionDate ?? task.deadline, referenceDate)
}

const byDeadline = (a, b) => {
  if (!a.deadline && !b.deadline) return a.createdAt.localeCompare(b.createdAt)
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return a.deadline.localeCompare(b.deadline)
}

export function groupTasksByBucket(tasks, referenceDate = new Date(), allTasks = tasks) {
  const grouped = Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]))

  tasks.forEach((task) => {
    grouped[getTaskBucketForTask(task, allTasks, referenceDate)].push(task)
  })

  BUCKET_ORDER.forEach((bucket) => {
    grouped[bucket].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      }
      if (a.done !== b.done) return Number(a.done) - Number(b.done)
      const aAttention = getTaskAttentionDate(a, allTasks, referenceDate)
      const bAttention = getTaskAttentionDate(b, allTasks, referenceDate)
      if (aAttention && bAttention && aAttention !== bAttention) return aAttention.localeCompare(bAttention)
      if (aAttention && !bAttention) return -1
      if (!aAttention && bAttention) return 1
      return byDeadline(a, b)
    })
  })

  return grouped
}
