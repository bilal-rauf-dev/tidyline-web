import { useEffect, useRef } from 'react'
import { notifyReminder, registerNotificationWorker } from '../utils/notifications'
import { formatDate } from '../utils/dates'
import { reminderInstances } from '../utils/reminders'

const CHECK_INTERVAL_MS = 15000
export const SNOOZE_MINUTES = 10

export function useReminderNotifications(tasks, { onComplete } = {}) {
  const firedRef = useRef(new Set())
  const snoozedRef = useRef(new Map())
  const startedAtRef = useRef(null)
  const tasksRef = useRef(tasks)

  // Kept in sync via an effect so the checker always sees the latest tasks
  // without the interval needing to restart on every task change.
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    registerNotificationWorker()
  }, [])

  // Notification action buttons are handled by the worker, which forwards the
  // click here because task state lives in localStorage, not in the worker.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined
    }

    function handleMessage(event) {
      const data = event.data

      if (!data || data.source !== 'tidyline-notification') {
        return
      }

      if (data.action === 'complete' && data.taskId) {
        onComplete?.(data.taskId)
      }

      if (data.action === 'snooze' && data.taskId) {
        snoozedRef.current.set(
          `${data.taskId}:${data.reminderId}`,
          {
            dueAt: Date.now() + SNOOZE_MINUTES * 60000,
            taskId: data.taskId,
            reminderId: data.reminderId,
          },
        )
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [onComplete])

  useEffect(() => {
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now()
    }

    function checkReminders() {
      const now = Date.now()
      const windowStart = startedAtRef.current

      tasksRef.current.forEach((task) => {
        if (task.done || task.archived || !task.deadline) {
          return
        }

        task.reminders.forEach((reminder) => {
          const snoozeKey = `${task.id}:${reminder.id}`
          const snooze = snoozedRef.current.get(snoozeKey)
          const snoozedUntil = snooze?.dueAt

          if (snoozedUntil && now < snoozedUntil) {
            return
          }

          reminderInstances(task, reminder, windowStart, now).forEach((instance) => {
            const key = snoozedUntil ? `${instance.key}:${snoozedUntil}` : instance.key

            if (firedRef.current.has(key)) {
              return
            }

            // Only fire things that came due during this session.
            if (instance.at > now || instance.at < windowStart) {
              return
            }

            firedRef.current.add(key)
            notifyReminder({
              title: task.title,
              body: `Deadline: ${formatDate(task.deadline)}`,
              taskId: task.id,
              reminderId: reminder.id,
            })
          })
        })
      })

      // Fire any snoozes whose time has come.
      snoozedRef.current.forEach(({ dueAt, taskId, reminderId }, key) => {
        if (now < dueAt || firedRef.current.has(`snooze:${key}:${dueAt}`)) {
          return
        }

        const task = tasksRef.current.find((entry) => entry.id === taskId)

        if (!task || task.done || task.archived) {
          snoozedRef.current.delete(key)
          return
        }

        firedRef.current.add(`snooze:${key}:${dueAt}`)
        snoozedRef.current.delete(key)
        notifyReminder({
          title: task.title,
          body: `Snoozed reminder — deadline ${formatDate(task.deadline)}`,
          taskId,
          reminderId,
        })
      })
    }

    checkReminders()
    const id = setInterval(checkReminders, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])
}
