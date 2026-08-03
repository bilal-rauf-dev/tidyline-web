import { daysUntil } from './dates'

export const BUCKET_ORDER = ['today', 'week', 'twoWeeks', 'month', 'quarter', 'year', 'later']
export const REQUIRED_BUCKETS = ['today', 'later']

export const BUCKET_LABELS = {
  today: 'Today',
  week: 'Week',
  twoWeeks: '2 Weeks',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
  later: 'Later',
}

export const BUCKET_END_DAYS = {
  today: 0,
  week: 7,
  twoWeeks: 14,
  month: 30,
  quarter: 90,
  year: 365,
  later: Number.POSITIVE_INFINITY,
}

export function normalizeBucketOrder(bucketOrder = BUCKET_ORDER) {
  const requested = new Set(Array.isArray(bucketOrder) ? bucketOrder : [])
  REQUIRED_BUCKETS.forEach((bucket) => requested.add(bucket))
  return BUCKET_ORDER.filter((bucket) => requested.has(bucket))
}

export function deadlineForBucket(
  bucketKey,
  referenceDate = new Date(),
  bucketOrder = BUCKET_ORDER,
) {
  const activeBuckets = normalizeBucketOrder(bucketOrder)
  const index = activeBuckets.indexOf(bucketKey)
  const previousBucket = index > 0 ? activeBuckets[index - 1] : null
  const offset = previousBucket ? BUCKET_END_DAYS[previousBucket] + 1 : 0
  const date = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + offset,
  )

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function getTaskBucket(
  deadline,
  referenceDate = new Date(),
  bucketOrder = BUCKET_ORDER,
) {
  const daysUntilDeadline = daysUntil(deadline, referenceDate)
  const activeBuckets = normalizeBucketOrder(bucketOrder)

  if (daysUntilDeadline <= 0) return 'today'

  return activeBuckets.find(
    (bucket) => bucket !== 'today' && daysUntilDeadline <= BUCKET_END_DAYS[bucket],
  ) ?? 'later'
}

const byDeadline = (a, b) => a.deadline.localeCompare(b.deadline)

/**
 * Group tasks into buckets. Within a bucket the order is always
 * pinned first, then not-done before done, then the supplied comparator.
 */
export function groupTasksByBucket(
  tasks,
  referenceDate = new Date(),
  comparator = byDeadline,
  bucketOrder = BUCKET_ORDER,
) {
  const activeBuckets = normalizeBucketOrder(bucketOrder)
  const grouped = Object.fromEntries(activeBuckets.map((bucket) => [bucket, []]))

  tasks.forEach((task) => {
    grouped[getTaskBucket(task.deadline, referenceDate, activeBuckets)].push(task)
  })

  activeBuckets.forEach((bucket) => {
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
