import { toDateStr } from './calendar'

const MINUTES_PER_DAY = 24 * 60

export const TIMELINE_TICKS = [0, 6, 12, 18, 24]

function toPercent(minutes) {
  return (minutes / MINUTES_PER_DAY) * 100
}

/**
 * Today's reminders placed on a 24-hour axis, plus the current-time marker.
 * Derived entirely from existing reminder datetimes — no new fields.
 */
export function getTodayTimeline(tasks) {
  const now = new Date()
  const todayStr = toDateStr(now)
  const items = []

  tasks.forEach((task) => {
    task.reminders.forEach((reminder) => {
      const date = new Date(reminder)

      if (Number.isNaN(date.getTime()) || toDateStr(date) !== todayStr) {
        return
      }

      const minutes = date.getHours() * 60 + date.getMinutes()

      items.push({
        key: `${task.id}:${reminder}`,
        title: task.title,
        done: task.done,
        minutes,
        position: toPercent(minutes),
        time: new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }).format(date),
      })
    })
  })

  items.sort((a, b) => a.minutes - b.minutes)

  return {
    items,
    nowPosition: toPercent(now.getHours() * 60 + now.getMinutes()),
  }
}
