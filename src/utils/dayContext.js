import { toDateStr } from './calendar'
import { deadlineMoment } from './dates'

const CLOSE_WINDOW_MINUTES = 120

function eligible(task, excludeId) {
  return task.id !== excludeId && !task.archived
}

function reminderDate(task, reminder) {
  if (typeof reminder === 'string') return new Date(reminder)
  if (reminder?.kind === 'absolute') return new Date(reminder.at)
  if (reminder?.kind === 'relative' && task.deadline) {
    return new Date(deadlineMoment(task.deadline).getTime() - reminder.minutesBefore * 60000)
  }
  return new Date(Number.NaN)
}

function remindersOn(tasks, dateStr, excludeId) {
  const found = []

  tasks.forEach((task) => {
    if (!eligible(task, excludeId)) {
      return
    }

    task.reminders.forEach((reminder) => {
      const at = reminderDate(task, reminder)

      if (!Number.isNaN(at.getTime()) && toDateStr(at) === dateStr) {
        found.push({ key: `${task.id}:${reminder.id ?? at.toISOString()}`, title: task.title, at })
      }
    })
  })

  return found
}

/** Tasks already landing on a candidate deadline date. */
export function getDeadlineContext(tasks, dateStr, excludeId) {
  if (!dateStr) {
    return { deadlines: [], reminders: [] }
  }

  return {
    deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
    reminders: remindersOn(tasks, dateStr, excludeId),
  }
}

/** Reminders within a close time window of a candidate reminder datetime. */
export function getReminderContext(
  tasks,
  datetimeStr,
  excludeId,
  windowMinutes = CLOSE_WINDOW_MINUTES,
) {
  if (!datetimeStr) {
    return { nearby: [], deadlines: [], windowMinutes }
  }

  const target = new Date(datetimeStr)

  if (Number.isNaN(target.getTime())) {
    return { nearby: [], deadlines: [], windowMinutes }
  }

  const dateStr = toDateStr(target)
  const nearby = []

  tasks.forEach((task) => {
    if (!eligible(task, excludeId)) {
      return
    }

    task.reminders.forEach((reminder) => {
      const at = reminderDate(task, reminder)

      if (Number.isNaN(at.getTime())) {
        return
      }

      const minutesApart = Math.abs(at.getTime() - target.getTime()) / 60000

      if (minutesApart <= windowMinutes) {
        nearby.push({ key: `${task.id}:${reminder.id ?? at.toISOString()}`, title: task.title, at, minutesApart })
      }
    })
  })

  nearby.sort((a, b) => a.minutesApart - b.minutesApart)

  return {
    nearby,
    deadlines: tasks.filter((task) => eligible(task, excludeId) && task.deadline === dateStr),
    windowMinutes,
  }
}
