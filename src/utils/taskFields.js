export const TASK_FIELDS = [
  'id',
  'title',
  'deadline',
  'resurfaceDate',
  'reminders',
  'tags',
  'done',
  'completedAt',
  'pinned',
  'archived',
  'recurrence',
  'notes',
  'location',
  'duration',
  'startedAt',
  'actualMinutes',
  'checklist',
  'links',
  'createdAt',
]

const DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeDate(value) {
  if (typeof value !== 'string' || !DATE_VALUE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? value
    : null
}

export function normalizeDuration(value) {
  const amount = Number(value?.value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return { value: amount, unit: value?.unit === 'hr' ? 'hr' : 'min' }
}

export function applyTaskUpdates(task, updates) {
  return { ...task, ...updates }
}
