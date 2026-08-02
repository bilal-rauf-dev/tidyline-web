import { useEffect, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'

const STORAGE_KEY = 'tidyline:tasks'
const UNDO_MS = 6000

// Computed once at module load, never during render, so it stays lint-pure.
const BOOT_TIME = new Date().toISOString()

export function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    deadline: task.deadline,
    reminders: Array.isArray(task.reminders) ? task.reminders : [],
    tags: Array.isArray(task.tags) ? task.tags : [],
    done: Boolean(task.done),
    pinned: Boolean(task.pinned),
    archived: Boolean(task.archived),
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : BOOT_TIME,
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : []
  } catch {
    return []
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadTasks)
  const [undoState, setUndoState] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    if (!undoState) {
      return undefined
    }

    const timer = setTimeout(() => setUndoState(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [undoState])

  /** Apply a change and arm a transient undo holding the previous state. */
  function commit(message, nextTasks) {
    setUndoState({ message, snapshot: tasks })
    setTasks(nextTasks)
  }

  function mapTask(id, changes) {
    return tasks.map((task) => (task.id === id ? { ...task, ...changes } : task))
  }

  function addTask({ title, deadline, reminders, tags = [] }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title,
      deadline,
      reminders,
      tags,
      done: false,
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
  }

  function updateTask(id, updates) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    )
  }

  function deleteTask(id) {
    commit('Task deleted', tasks.filter((task) => task.id !== id))
  }

  function toggleTask(id) {
    const target = tasks.find((task) => task.id === id)

    if (target && !target.done) {
      commit('Task completed', mapTask(id, { done: true }))
      return
    }

    setTasks(mapTask(id, { done: false }))
  }

  function togglePin(id) {
    const target = tasks.find((task) => task.id === id)
    setTasks(mapTask(id, { pinned: !target?.pinned }))
  }

  function archiveTask(id) {
    commit('Task archived', mapTask(id, { archived: true }))
  }

  function unarchiveTask(id) {
    setTasks(mapTask(id, { archived: false }))
  }

  function duplicateTask(id) {
    const target = tasks.find((task) => task.id === id)

    if (!target) {
      return
    }

    const copy = normalizeTask({
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (copy)`,
      done: false,
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
    })

    const index = tasks.findIndex((task) => task.id === id)
    const next = [...tasks]
    next.splice(index + 1, 0, copy)
    setTasks(next)
  }

  /**
   * Move a task to another bucket by rewriting its deadline to the earliest
   * date inside that bucket — the drop changes the real date, not just the
   * column it renders in.
   */
  function moveTaskToBucket(id, bucketKey) {
    const target = tasks.find((task) => task.id === id)
    const nextDeadline = deadlineForBucket(bucketKey)

    if (!target || target.deadline === nextDeadline) {
      return
    }

    commit('Task moved', mapTask(id, { deadline: nextDeadline }))
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

  function bulkComplete(ids) {
    const set = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} completed`,
      tasks.map((task) => (set.has(task.id) ? { ...task, done: true } : task)),
    )
  }

  function bulkArchive(ids) {
    const set = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} archived`,
      tasks.map((task) => (set.has(task.id) ? { ...task, archived: true } : task)),
    )
  }

  function bulkDelete(ids) {
    const set = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} deleted`,
      tasks.filter((task) => !set.has(task.id)),
    )
  }

  function importTasks(newTasks) {
    setTasks(newTasks.map(normalizeTask))
  }

  function clearCompleted() {
    commit('Completed tasks cleared', tasks.filter((task) => !task.done))
  }

  function undo() {
    if (!undoState) {
      return
    }

    setTasks(undoState.snapshot)
    setUndoState(null)
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    togglePin,
    archiveTask,
    unarchiveTask,
    duplicateTask,
    moveTaskToBucket,
    addReminder,
    removeReminder,
    bulkComplete,
    bulkArchive,
    bulkDelete,
    importTasks,
    clearCompleted,
    undoState,
    undo,
    dismissUndo: () => setUndoState(null),
  }
}
