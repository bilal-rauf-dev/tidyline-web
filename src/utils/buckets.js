import { daysUntil } from './dates'
import { isTaskPlannedForToday, isTaskUpcoming } from './taskFields'

export const BUCKET_ORDER = ['today', 'week', 'month', 'later']

export const BUCKET_RANGES = [
  { key: 'today', label: 'Today', minDays: Number.NEGATIVE_INFINITY, maxDays: 0 },
  { key: 'week', label: 'Week', minDays: 1, maxDays: 7 },
  { key: 'month', label: 'Month', minDays: 8, maxDays: 30 },
  { key: 'later', label: 'Later', minDays: 31, maxDays: Number.POSITIVE_INFINITY },
]

export const BUCKET_LABELS = Object.fromEntries(BUCKET_RANGES.map(({ key, label }) => [key, label]))

export function deadlineForBucket(bucketKey, referenceDate = new Date()) {
  const range = BUCKET_RANGES.find(({ key }) => key === bucketKey)
  const offset = Math.max(0, range?.minDays ?? 0)
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function getTaskBucket(deadline, referenceDate = new Date()) {
  const distance = daysUntil(deadline, referenceDate)
  return BUCKET_RANGES.find(({ minDays, maxDays }) => distance >= minDays && distance <= maxDays)?.key ?? 'later'
}

const byDeadline = (a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? '')

/** Group tasks into disjoint deadline buckets plus a non-draggable undated group. */
export function groupTasksByBucket(tasks, referenceDate = new Date(), comparator = byDeadline, { includeUpcoming = false } = {}) {
  const grouped = Object.fromEntries([...BUCKET_ORDER, 'nodate'].map((key) => [key, []]))
  tasks.forEach((task) => {
    if (!task.deadline) {
      grouped.nodate.push(task)
      return
    }
    if (!includeUpcoming && isTaskUpcoming(task, referenceDate)) return
    const bucket = isTaskPlannedForToday(task, referenceDate) ? 'today' : getTaskBucket(task.deadline, referenceDate)
    grouped[bucket].push(task)
  })
  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      if (a.done !== b.done) return Number(a.done) - Number(b.done)
      return comparator(a, b)
    })
  })
  return grouped
}
