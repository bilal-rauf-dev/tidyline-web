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

export function groupTasksByBucket(tasks, referenceDate = new Date()) {
  const grouped = Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]))

  tasks.forEach((task) => {
    grouped[getTaskBucket(task.deadline, referenceDate)].push(task)
  })

  BUCKET_ORDER.forEach((bucket) => {
    grouped[bucket].sort((a, b) => {
      if (a.done !== b.done) {
        return Number(a.done) - Number(b.done)
      }

      return a.deadline.localeCompare(b.deadline)
    })
  })

  return grouped
}
