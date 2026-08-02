import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tidyline:tasks'

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadTasks)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  function addTask({ title, deadline, reminders }) {
    const task = {
      id: crypto.randomUUID(),
      title,
      deadline,
      reminders,
      done: false,
      createdAt: new Date().toISOString(),
    }

    setTasks((current) => [task, ...current])
  }

  function updateTask(id, updates) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    )
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  function addReminder(id, reminder) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id && !task.reminders.includes(reminder)
          ? { ...task, reminders: [...task.reminders, reminder].sort() }
          : task,
      ),
    )
  }

  function removeReminder(id, reminder) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, reminders: task.reminders.filter((entry) => entry !== reminder) }
          : task,
      ),
    )
  }

  function importTasks(newTasks) {
    setTasks(newTasks)
  }

  function clearCompleted() {
    setTasks((current) => current.filter((task) => !task.done))
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addReminder,
    removeReminder,
    importTasks,
    clearCompleted,
  }
}
