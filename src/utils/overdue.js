import { daysUntil } from './dates'

/**
 * Severity rises with age: 1 = yesterday, 3 = a week or more.
 * Drives border weight and colour intensity, all from existing tokens.
 */
export const OVERDUE_TIERS = [
  { key: 'yesterday', label: 'Yesterday', severity: 1, maxDaysLate: 1 },
  { key: 'recent', label: 'A few days ago', severity: 2, maxDaysLate: 6 },
  { key: 'stale', label: 'A week or more', severity: 3, maxDaysLate: Infinity },
]

export function daysOverdue(task, referenceDate = new Date()) {
  return -daysUntil(task.deadline, referenceDate)
}

export function isOverdue(task, referenceDate = new Date()) {
  return !task.done && !task.archived && daysUntil(task.deadline, referenceDate) < 0
}

export function overdueSeverity(task, referenceDate = new Date()) {
  if (!isOverdue(task, referenceDate)) {
    return 0
  }

  const late = daysOverdue(task, referenceDate)
  return OVERDUE_TIERS.find((tier) => late <= tier.maxDaysLate)?.severity ?? 3
}

export function groupOverdue(tasks, referenceDate = new Date()) {
  const groups = OVERDUE_TIERS.map((tier) => ({ ...tier, tasks: [] }))

  tasks.forEach((task) => {
    if (!isOverdue(task, referenceDate)) {
      return
    }

    const late = daysOverdue(task, referenceDate)
    const group = groups.find((tier) => late <= tier.maxDaysLate)
    group?.tasks.push(task)
  })

  groups.forEach((group) => {
    group.tasks.sort((a, b) => a.deadline.localeCompare(b.deadline))
  })

  // Most overdue first — the worst offenders lead the section.
  return groups.filter((group) => group.tasks.length > 0).reverse()
}
