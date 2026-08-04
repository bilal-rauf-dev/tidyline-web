import { toDateStr } from './calendar'
import { BUCKET_LABELS, BUCKET_ORDER, groupTasksByBucket } from './buckets'
import { isTaskUpcoming } from './taskFields'

const HEATMAP_DAYS = 70
const BUSIEST_WINDOW_DAYS = 14
const COMPLETION_HISTORY_DAYS = 14
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function getCompletionStat(tasks) {
  const done = tasks.filter((task) => task.done).length
  const total = tasks.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return { done, total, percent }
}

/**
 * Top buckets by task count, with per-bucket completion.
 * Feeds the ring-stat tiles.
 */
export function getTopBuckets(tasks, limit = 2, bucketOrder = BUCKET_ORDER) {
  const grouped = groupTasksByBucket(tasks, new Date(), undefined, bucketOrder)

  return bucketOrder.map((bucket) => {
    const list = grouped[bucket]
    const done = list.filter((task) => task.done).length

    return {
      bucket,
      label: BUCKET_LABELS[bucket],
      done,
      total: list.length,
    }
  })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/**
 * Per-bucket count plus a week-over-week delta.
 *
 * "Last week" is reconstructed rather than recorded: tasks that already
 * existed a week ago (by createdAt) are re-bucketed against a reference date
 * of today-7d. No new task fields are introduced.
 */
export function getBucketTrends(tasks, bucketOrder = BUCKET_ORDER) {
  const now = new Date()
  const lastWeek = new Date(now.getTime() - WEEK_MS)

  const current = groupTasksByBucket(tasks, now, undefined, bucketOrder)
  const existedLastWeek = tasks.filter((task) => new Date(task.createdAt) <= lastWeek)
  const prior = groupTasksByBucket(existedLastWeek, lastWeek, undefined, bucketOrder)

  return bucketOrder.map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    count: current[bucket].length,
    delta: current[bucket].length - prior[bucket].length,
  }))
}

/**
 * Day cells for the activity grid.
 *
 * state: 'active'  — a completed task falls on this day
 *        'overdue' — a still-undone task's deadline has already passed
 *        'empty'   — neither
 * Overdue wins over active when a day has both, since it is the actionable one.
 */
export function getActivityHeatmap(tasks, days = HEATMAP_DAYS) {
  const today = startOfToday()
  const todayStr = toDateStr(today)

  const completed = new Set()
  const overdue = new Set()

  tasks.forEach((task) => {
    if (task.done) {
      completed.add(task.deadline)
    } else if (
      task.status !== 'waiting' &&
      !isTaskUpcoming(task, today) &&
      task.deadline < todayStr
    ) {
      overdue.add(task.deadline)
    }
  })

  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))

  const cells = []

  for (let i = 0; i < start.getDay(); i += 1) {
    cells.push(null)
  }

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = toDateStr(date)

    let state = 'empty'
    if (overdue.has(dateStr)) {
      state = 'overdue'
    } else if (completed.has(dateStr)) {
      state = 'active'
    }

    cells.push({ dateStr, state })
  }

  return cells
}

export function summarizeHeatmap(cells) {
  const real = cells.filter(Boolean)

  return {
    activeDays: real.filter((cell) => cell.state === 'active').length,
    overdueDays: real.filter((cell) => cell.state === 'overdue').length,
  }
}

/**
 * Deadline load per day across the next `days` days, and the heaviest of them.
 * Feeds the sparkline card.
 */
export function getBusiestDay(tasks, days = BUSIEST_WINDOW_DAYS) {
  const today = startOfToday()
  const counts = new Map()

  tasks.forEach((task) => {
    counts.set(task.deadline, (counts.get(task.deadline) ?? 0) + 1)
  })

  const series = []

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = toDateStr(date)
    series.push({ dateStr, count: counts.get(dateStr) ?? 0 })
  }

  const total = series.reduce((sum, point) => sum + point.count, 0)
  let peakIndex = 0

  series.forEach((point, index) => {
    if (point.count > series[peakIndex].count) {
      peakIndex = index
    }
  })

  return {
    series,
    total,
    peakIndex,
    peakCount: series[peakIndex].count,
    peakDate: series[peakIndex].dateStr,
    windowDays: days,
  }
}

/**
 * Actual completions per day, using completedAt rather than reconstructing
 * history from current task state. Older tasks without completedAt simply do
 * not contribute, which keeps the chart honest.
 */
export function getCompletionHistory(tasks, days = COMPLETION_HISTORY_DAYS) {
  const today = startOfToday()
  const counts = new Map()

  tasks.forEach((task) => {
    if (!task.done || !task.completedAt) {
      return
    }

    const dateStr = task.completedAt.slice(0, 10)
    counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1)
  })

  const series = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const dateStr = toDateStr(date)
    series.push({ dateStr, count: counts.get(dateStr) ?? 0 })
  }

  const total = series.reduce((sum, point) => sum + point.count, 0)
  let peakIndex = 0

  series.forEach((point, index) => {
    if (point.count > series[peakIndex].count) {
      peakIndex = index
    }
  })

  return {
    series,
    total,
    peakIndex,
    peakCount: series[peakIndex]?.count ?? 0,
    peakDate: series[peakIndex]?.dateStr ?? toDateStr(today),
    windowDays: days,
  }
}

export function getPostponeAnalytics(tasks, limit = 5) {
  const totalPostponements = tasks.reduce(
    (total, task) => total + (task.postponeHistory?.length ?? 0),
    0,
  )
  const delayedTasks = tasks.filter((task) => (task.postponeHistory?.length ?? 0) > 0)
  const topTasks = [...delayedTasks]
    .sort(
      (a, b) =>
        b.postponeHistory.length - a.postponeHistory.length ||
        a.title.localeCompare(b.title),
    )
    .slice(0, limit)
  const tagCounts = new Map()

  tasks.forEach((task) => {
    const count = task.postponeHistory?.length ?? 0
    if (count === 0) return
    ;(task.tags ?? []).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + count))
  })

  const tags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ bucket: tag, label: tag, count, delta: 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)

  return {
    totalPostponements,
    delayedTaskCount: delayedTasks.length,
    average: tasks.length === 0 ? 0 : totalPostponements / tasks.length,
    topTasks,
    tags,
  }
}
