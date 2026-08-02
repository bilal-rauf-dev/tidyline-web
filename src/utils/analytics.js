import { toDateStr } from './calendar'

const HEATMAP_DAYS = 70

export function getCompletionStat(tasks) {
  const done = tasks.filter((task) => task.done).length
  const total = tasks.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return { done, total, percent }
}

export function getActivityHeatmap(tasks, days = HEATMAP_DAYS) {
  const completedDates = new Set(
    tasks.filter((task) => task.done).map((task) => task.deadline),
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))

  const cells = []
  const leadingBlanks = start.getDay()

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push(null)
  }

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = toDateStr(date)
    cells.push({ dateStr, active: completedDates.has(dateStr) })
  }

  return cells
}
