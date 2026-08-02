import { useEffect, useRef } from 'react'
import { notifyReminder } from '../utils/notifications'
import { formatDate } from '../utils/dates'

const CHECK_INTERVAL_MS = 15000

export function useReminderNotifications(tasks) {
  const firedRef = useRef(new Set())
  const startedAtRef = useRef(null)

  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now()
    }

    function checkReminders() {
      const now = Date.now()

      tasks.forEach((task) => {
        if (task.done) {
          return
        }

        task.reminders.forEach((reminder) => {
          const key = `${task.id}:${reminder}`

          if (firedRef.current.has(key)) {
            return
          }

          const reminderTime = new Date(reminder).getTime()

          if (reminderTime > now || reminderTime < startedAtRef.current) {
            return
          }

          firedRef.current.add(key)
          notifyReminder(task.title, `Deadline: ${formatDate(task.deadline)}`)
        })
      })
    }

    checkReminders()
    const id = setInterval(checkReminders, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [tasks])
}
