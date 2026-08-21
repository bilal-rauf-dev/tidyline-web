import { useEffect, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'
import { nextOccurrence } from '../utils/recurrence'
import { cleanupLegacyPreferences, migrateTaskData, taskEnvelope } from '../utils/tasksIO'
import { normalizeTask } from '../utils/taskMigration'
import { completeTiming, pauseTiming, startTiming } from '../utils/taskTiming'
import { durationToMinutes } from '../utils/calibration'

export { normalizeTask } from '../utils/taskMigration'

const STORAGE_KEY = 'tidyline:tasks'
const UNDO_MS = 6000

function loadTaskState() {
  cleanupLegacyPreferences(localStorage)
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) return { tasks: [], canPersist: true, dataError: '' }

  try {
    const migrated = migrateTaskData(JSON.parse(raw))
    return {
      tasks: migrated.tasks.map(normalizeTask),
      canPersist: true,
      dataError: '',
    }
  } catch {
    return {
      tasks: [],
      canPersist: false,
      dataError: 'Your saved tasks could not be read. The original browser data has been left untouched.',
    }
  }
}

function nextInstance(task, deadline) {
  return normalizeTask({
    ...task,
    id: crypto.randomUUID(),
    deadline,
    done: false,
    completedAt: null,
    pinned: false,
    archived: false,
    startedAt: null,
    actualMinutes: null,
    checklist: task.checklist.map((item) => ({ ...item, done: false })),
    createdAt: new Date().toISOString(),
  })
}

export function useTasks() {
  const [initial] = useState(loadTaskState)
  const [tasks, setTasks] = useState(initial.tasks)
  const [undoState, setUndoState] = useState(null)
  const [completionFeedback, setCompletionFeedback] = useState(null)

  useEffect(() => {
    if (!initial.canPersist) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskEnvelope(tasks)))
  }, [initial.canPersist, tasks])

  useEffect(() => {
    if (!undoState) return undefined
    const timer = setTimeout(() => setUndoState(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [undoState])

  function commit(message, nextTasks) {
    setUndoState({ message, snapshot: tasks })
    setTasks(nextTasks)
  }

  function persistImmediately(nextTasks) {
    if (!initial.canPersist) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskEnvelope(nextTasks)))
  }

  function mapTask(id, changes) {
    return tasks.map((task) =>
      task.id === id ? normalizeTask({ ...task, ...changes }) : task,
    )
  }

  function patch(id, updater) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? normalizeTask({ ...task, ...updater(task) }) : task,
      ),
    )
  }

  function addTask({
    title,
    deadline,
    reminders = [],
    tags = [],
    recurrence = null,
    notes = '',
    checklist = [],
    links = [],
    location = '',
    duration = null,
    archived = false,
  }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title,
      deadline,
      reminders,
      tags,
      recurrence,
      notes,
      checklist,
      links,
      location,
      duration,
      archived,
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    return task
  }

  function updateTask(id, updates) {
    patch(id, () => updates)
  }

  function deleteTask(id) {
    commit('Task deleted', tasks.filter((task) => task.id !== id))
  }

  function completeTask(id) {
    const target = tasks.find((task) => task.id === id)
    if (!target || target.done) return

    const completedAt = new Date().toISOString()
    const completedTarget = normalizeTask(completeTiming(target, completedAt))
    let next = tasks.map((task) =>
      task.id === id ? completedTarget : task,
    )
    let createdNext = false

    if (target.recurrence && target.deadline) {
      const upcoming = nextOccurrence(target.recurrence, target.deadline)
      if (upcoming) {
        next = [nextInstance(target, upcoming), ...next]
        createdNext = true
      }
    }

    const estimateMinutes = durationToMinutes(target.duration)
    if (estimateMinutes && completedTarget.actualMinutes) {
      setCompletionFeedback({
        id: `${target.id}:${completedAt}`,
        title: target.title,
        estimateMinutes,
        actualMinutes: completedTarget.actualMinutes,
      })
    }
    persistImmediately(next)
    commit(createdNext ? 'Completed — next one scheduled' : 'Task completed', next)
  }

  function startTask(id) {
    const next = tasks.map((task) =>
      task.id === id ? normalizeTask(startTiming(task)) : task,
    )
    persistImmediately(next)
    setTasks(next)
  }

  function pauseTask(id) {
    const next = tasks.map((task) =>
      task.id === id ? normalizeTask(pauseTiming(task)) : task,
    )
    persistImmediately(next)
    setTasks(next)
  }

  function toggleTask(id) {
    const target = tasks.find((task) => task.id === id)
    if (target && !target.done) {
      completeTask(id)
      return
    }
    setCompletionFeedback(null)
    setTasks(mapTask(id, { done: false, completedAt: null }))
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
    if (!target) return

    const copy = normalizeTask({
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (copy)`,
      done: false,
      completedAt: null,
      pinned: false,
      archived: false,
      startedAt: null,
      actualMinutes: null,
      createdAt: new Date().toISOString(),
    })
    const index = tasks.findIndex((task) => task.id === id)
    const next = [...tasks]
    next.splice(index + 1, 0, copy)
    setTasks(next)
  }

  function setDeadline(id, deadline) {
    const target = tasks.find((task) => task.id === id)
    if (!target || target.deadline === deadline) return
    commit('Task rescheduled', mapTask(id, { deadline }))
  }

  function moveTaskToBucket(id, bucketKey) {
    setDeadline(id, deadlineForBucket(bucketKey))
  }

  function rescheduleTasks(moves) {
    const byId = new Map(moves.map((move) => [move.id, move.deadline]))
    const next = tasks.map((task) =>
      byId.has(task.id) ? normalizeTask({ ...task, deadline: byId.get(task.id) }) : task,
    )
    commit(`${moves.length} task${moves.length === 1 ? '' : 's'} rescheduled`, next)
  }

  function setRecurrence(id, recurrence) {
    updateTask(id, { recurrence })
  }

  function addReminder(id, reminder) {
    if (!reminder) return
    patch(id, (task) =>
      task.reminders.some((entry) => entry.id === reminder.id)
        ? {}
        : { reminders: [...task.reminders, reminder] },
    )
  }

  function removeReminder(id, reminderId) {
    patch(id, (task) => ({
      reminders: task.reminders.filter((entry) => entry.id !== reminderId),
    }))
  }

  function addChecklistItem(id, text) {
    if (!text.trim()) return
    patch(id, (task) => ({
      checklist: [...task.checklist, { id: crypto.randomUUID(), text: text.trim(), done: false }],
    }))
  }

  function toggleChecklistItem(id, itemId) {
    patch(id, (task) => ({
      checklist: task.checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      ),
    }))
  }

  function removeChecklistItem(id, itemId) {
    patch(id, (task) => ({
      checklist: task.checklist.filter((item) => item.id !== itemId),
    }))
  }

  function moveChecklistItem(id, itemId, direction) {
    patch(id, (task) => {
      const index = task.checklist.findIndex((item) => item.id === itemId)
      const target = index + direction
      if (index < 0 || target < 0 || target >= task.checklist.length) return {}

      const checklist = [...task.checklist]
      const [moved] = checklist.splice(index, 1)
      checklist.splice(target, 0, moved)
      return { checklist }
    })
  }

  function addLink(id, link) {
    patch(id, (task) => ({ links: [...task.links, { id: crypto.randomUUID(), ...link }] }))
  }

  function removeLink(id, linkId) {
    patch(id, (task) => ({ links: task.links.filter((entry) => entry.id !== linkId) }))
  }

  function bulkComplete(ids) {
    const selected = new Set(ids)
    const stamp = new Date().toISOString()
    const next = tasks.map((task) =>
      selected.has(task.id) && !task.done
        ? normalizeTask(completeTiming(task, stamp))
        : task,
    )
    persistImmediately(next)
    commit(`${ids.length} task${ids.length === 1 ? '' : 's'} completed`, next)
  }

  function bulkArchive(ids) {
    const selected = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} archived`,
      tasks.map((task) =>
        selected.has(task.id) ? normalizeTask({ ...task, archived: true }) : task,
      ),
    )
  }

  function bulkDelete(ids) {
    const selected = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} deleted`,
      tasks.filter((task) => !selected.has(task.id)),
    )
  }

  function importTasks(newTasks) {
    setTasks(newTasks.map(normalizeTask))
  }

  function clearCompleted() {
    commit('Completed tasks cleared', tasks.filter((task) => !task.done))
  }

  function undo() {
    if (!undoState) return
    setCompletionFeedback(null)
    setTasks(undoState.snapshot)
    setUndoState(null)
  }

  return {
    tasks,
    dataError: initial.dataError,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    completeTask,
    startTask,
    pauseTask,
    togglePin,
    archiveTask,
    unarchiveTask,
    duplicateTask,
    setDeadline,
    rescheduleTasks,
    moveTaskToBucket,
    setRecurrence,
    addReminder,
    removeReminder,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    moveChecklistItem,
    addLink,
    removeLink,
    bulkComplete,
    bulkArchive,
    bulkDelete,
    importTasks,
    clearCompleted,
    undoState,
    undo,
    dismissUndo: () => setUndoState(null),
    completionFeedback,
    dismissCompletionFeedback: () => setCompletionFeedback(null),
  }
}
