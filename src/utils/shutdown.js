import { toDateStr } from './calendar'
import { isTaskPlannedForToday, isTaskUpcoming } from './taskFields'

export function getDailyShutdown(tasks, referenceDate = new Date()) {
  const today = toDateStr(referenceDate)
  const dayTasks = tasks.filter(
    (task) =>
      task.deadline &&
      !task.archived &&
      task.status !== 'waiting' &&
      !isTaskUpcoming(task, referenceDate) &&
      (task.deadline === today || isTaskPlannedForToday(task, referenceDate)),
  )

  return {
    date: today,
    tasks: dayTasks,
    completed: dayTasks.filter((task) => task.done).length,
    unfinished: dayTasks.filter((task) => !task.done),
  }
}

export function tomorrowDate(referenceDate = new Date()) {
  const tomorrow = new Date(referenceDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return toDateStr(tomorrow)
}
