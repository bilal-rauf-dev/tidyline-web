export function serializeTasks(tasks) {
  return JSON.stringify(tasks, null, 2)
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
}

function validReminder(reminder) {
  if (typeof reminder === 'string') return !Number.isNaN(new Date(reminder).getTime())
  if (!reminder || typeof reminder !== 'object' || Array.isArray(reminder)) return false

  const kind = reminder.kind ?? 'absolute'
  if (kind === 'absolute') return typeof reminder.at === 'string' && !Number.isNaN(new Date(reminder.at).getTime())
  if (kind === 'relative') return Number.isFinite(reminder.minutesBefore) && reminder.minutesBefore > 0
  if (kind === 'recurring') {
    return reminder.rule && typeof reminder.rule === 'object' &&
      typeof reminder.rule.freq === 'string' &&
      (reminder.time === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time))
  }
  return false
}

function validObjectList(value, required) {
  return Array.isArray(value) && value.every((entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry) &&
    required.every((key) => typeof entry[key] === 'string'),
  )
}

/** Validate the whole file before any existing task is replaced. */
export function validateTaskCollection(tasks) {
  if (!Array.isArray(tasks)) throw new Error('Expected a JSON array of tasks')

  tasks.forEach((task, index) => {
    const label = `Task ${index + 1}`
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
      throw new Error(`${label} is not a task object`)
    }
    if (typeof task.id !== 'string' || !task.id.trim() ||
        typeof task.title !== 'string' || !task.title.trim()) {
      throw new Error(`${label} needs an ID and title`)
    }
    if (task.deadline !== null && !validDate(task.deadline)) {
      throw new Error(`${label} has an invalid deadline`)
    }
    if (task.reminders !== undefined &&
      (!Array.isArray(task.reminders) || !task.reminders.every(validReminder))) {
      throw new Error(`${label} has an invalid reminder`)
    }
    if (task.tags !== undefined &&
      (!Array.isArray(task.tags) || !task.tags.every((tag) => typeof tag === 'string'))) {
      throw new Error(`${label} has invalid tags`)
    }
    if (task.checklist !== undefined && !validObjectList(task.checklist, ['id', 'text'])) {
      throw new Error(`${label} has an invalid checklist`)
    }
    for (const field of ['links', 'attachments']) {
      if (task[field] !== undefined && !validObjectList(task[field], ['id', 'label', 'url'])) {
        throw new Error(`${label} has invalid ${field}`)
      }
    }
    if (task.duration != null &&
      (typeof task.duration !== 'object' ||
        !Number.isFinite(Number(task.duration.value)) ||
        Number(task.duration.value) < 0 ||
        !['min', 'hr'].includes(task.duration.unit))) {
      throw new Error(`${label} has an invalid duration`)
    }
  })

  const ids = new Set(tasks.map((task) => task.id))
  if (ids.size !== tasks.length) throw new Error('The file contains duplicate task IDs')
  return tasks
}

export function parseImportedTasks(json) {
  const parsed = JSON.parse(json)
  return validateTaskCollection(parsed).map((item) => ({ ...item }))
}
