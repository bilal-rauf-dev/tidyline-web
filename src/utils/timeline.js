import { toDateStr } from './calendar'

const DAY_START = 6 * 60
const DAY_END = 22 * 60

export const TIMELINE_TICKS = [6, 9, 12, 15, 18, 21]

function toPercent(minutes) {
  return ((minutes - DAY_START) / (DAY_END - DAY_START)) * 100
}

function durationMinutes(task) {
  if (!task.duration) return 30
  return task.duration.unit === 'hr' ? task.duration.value * 60 : task.duration.value
}

/**
 * Today's Day Planner blocks placed on its 06:00–22:00 axis. This deliberately
 * reads scheduledStart rather than reminders: Home is a compact view of the
 * plan someone actively placed in the planner, not a second reminder list.
 */
export function getTodayTimeline(tasks) {
  const now = new Date()
  const todayStr = toDateStr(now)
  const items = tasks
    .filter(
      (task) =>
        task.scheduledStart?.slice(0, 10) === todayStr &&
        !task.done &&
        !task.archived &&
        task.status !== 'waiting',
    )
    .map((task) => {
      const time = task.scheduledStart.slice(11, 16)
      const [hour, minute] = time.split(':').map(Number)
      const minutes = hour * 60 + minute
      const duration = durationMinutes(task)
      const visibleStart = Math.max(DAY_START, Math.min(DAY_END, minutes))
      const visibleEnd = Math.max(visibleStart + 15, Math.min(DAY_END, minutes + duration))

      return {
        key: task.id,
        title: task.title,
        minutes,
        duration,
        position: toPercent(visibleStart),
        width: Math.max(4, toPercent(visibleEnd) - toPercent(visibleStart)),
        time,
      }
    })
    .filter((item) => item.minutes < DAY_END && item.minutes + item.duration > DAY_START)
    .sort((a, b) => a.minutes - b.minutes)

  const laneEnds = []
  items.forEach((item) => {
    const end = item.minutes + item.duration
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.minutes)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    item.lane = lane
  })

  return {
    items,
    laneCount: Math.max(1, laneEnds.length),
    nowPosition: toPercent(now.getHours() * 60 + now.getMinutes()),
  }
}
