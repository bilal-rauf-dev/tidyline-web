export const BUCKET_ORDER = ['today', 'week', 'twoWeeks', 'month', 'quarter', 'year', 'later']

export const BUCKET_LABELS = {
  today: 'Today',
  week: 'Week',
  twoWeeks: '2 Weeks',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
  later: 'Later',
}

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Earliest day offset that still lands inside each bucket. Dropping a task
 * into a bucket assigns this offset — the soonest date satisfying the
 * bucket, which preserves urgency and is deterministic/reversible.
 */
export const BUCKET_START_DAYS = {
  today: 0,
  week: 1,
  twoWeeks: 8,
  month: 15,
  quarter: 31,
  year: 91,
  later: 366,
}

export function deadlineForBucket(bucketKey, referenceDate = new Date()) {
  const offset = BUCKET_START_DAYS[bucketKey] ?? 0
  const date = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + offset,
  )

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function getTaskBucket(deadline, referenceDate = new Date()) {
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  const deadlineDate = new Date(`${deadline}T00:00:00`)
  const daysUntilDeadline = Math.floor((deadlineDate - todayStart) / DAY_MS)

  if (daysUntilDeadline <= 0) return 'today'
  if (daysUntilDeadline <= 7) return 'week'
  if (daysUntilDeadline <= 14) return 'twoWeeks'
  if (daysUntilDeadline <= 30) return 'month'
  if (daysUntilDeadline <= 90) return 'quarter'
  if (daysUntilDeadline <= 365) return 'year'
  return 'later'
}

const byDeadline = (a, b) => a.deadline.localeCompare(b.deadline)

/**
 * Group tasks into buckets. Within a bucket the order is always
 * pinned first, then not-done before done, then the supplied comparator.
 */
export function groupTasksByBucket(tasks, referenceDate = new Date(), comparator = byDeadline) {
  const grouped = Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]))

  tasks.forEach((task) => {
    grouped[getTaskBucket(task.deadline, referenceDate)].push(task)
  })

  BUCKET_ORDER.forEach((bucket) => {
    grouped[bucket].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      }

      if (a.done !== b.done) {
        return Number(a.done) - Number(b.done)
      }

      return comparator(a, b)
    })
  })

  return grouped
}
