const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export { WEEKDAY_LABELS }

export function toDateStr(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonthWeeks(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

  const days = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    days.push({
      dateStr: toDateStr(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    })
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return weeks
}

export function groupTasksByDate(tasks) {
  const grouped = {}

  tasks.forEach((task) => {
    if (!task.deadline) return

    if (!grouped[task.deadline]) {
      grouped[task.deadline] = []
    }

    grouped[task.deadline].push(task)
  })

  return grouped
}

export function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

export function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function todayDateStr() {
  return toDateStr(new Date())
}
