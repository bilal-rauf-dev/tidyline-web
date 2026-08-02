import { useEffect, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'
import { nextOccurrence } from '../utils/recurrence'
import { reminderKey } from '../utils/reminders'

const STORAGE_KEY = 'tidyline:tasks'
const UNDO_MS = 6000

// Computed once at module load, never during render, so it stays lint-pure.
const BOOT_TIME = new Date().toISOString()

function normalizeReminder(entry) {
  // Legacy shape: a bare datetime string.
  if (typeof entry === 'string') {
    return { id: `abs:${entry}`, kind: 'absolute', at: entry }
  }

  const kind = entry.kind ?? 'absolute'
  const record = { ...entry, kind }
  return { ...record, id: entry.id ?? reminderKey(record) }
}

function normalizeList(value) {
  return Array.isArray(value) ? value : []
}

export function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    deadline: task.deadline,
    reminders: normalizeList(task.reminders).map(normalizeReminder),
    tags: normalizeList(task.tags),
    done: Boolean(task.done),
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    pinned: Boolean(task.pinned),
    archived: Boolean(task.archived),
    recurrence: task.recurrence ?? null,
    notes: typeof task.notes === 'string' ? task.notes : '',
    location: typeof task.location === 'string' ? task.location : '',
    duration: task.duration ?? null,
    checklist: normalizeList(task.checklist),
    links: normalizeList(task.links),
    attachments: normalizeList(task.attachments),
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

/**
 * Build the next instance of a recurring task. Per-instance progress
 * (done state, checklist ticks) resets; definition-level fields carry over.
 */
function nextInstance(task, deadline) {
  return normalizeTask({
    ...task,
    id: crypto.randomUUID(),
    deadline,
    done: false,
    completedAt: null,
    pinned: false,
    checklist: task.checklist.map((item) => ({ ...item, done: false })),
    createdAt: new Date().toISOString(),
  })
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

  function commit(message, nextTasks) {
    setUndoState({ message, snapshot: tasks })
    setTasks(nextTasks)
  }

  function mapTask(id, changes) {
    return tasks.map((task) => (task.id === id ? { ...task, ...changes } : task))
  }

  function patch(id, updater) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...updater(task) } : task)),
    )
  }

  function addTask({ title, deadline, reminders, tags = [], recurrence = null }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title,
      deadline,
      reminders,
      tags,
      recurrence,
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

  function completeTask(id) {
    const target = tasks.find((task) => task.id === id)

    if (!target || target.done) {
      return
    }

    let next = tasks.map((task) =>
      task.id === id ? { ...task, done: true, completedAt: new Date().toISOString() } : task,
    )

    // Recurring tasks materialise their next instance on completion.
    if (target.recurrence) {
      const upcoming = nextOccurrence(target.recurrence, target.deadline)

      if (upcoming) {
        next = [nextInstance(target, upcoming), ...next]
      }
    }

    commit(target.recurrence ? 'Completed — next one scheduled' : 'Task completed', next)
  }

  function toggleTask(id) {
    const target = tasks.find((task) => task.id === id)

    if (target && !target.done) {
      completeTask(id)
      return
    }

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

    if (!target) {
      return
    }

    const copy = normalizeTask({
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (copy)`,
      done: false,
      completedAt: null,
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
    })

    const index = tasks.findIndex((task) => task.id === id)
    const next = [...tasks]
    next.splice(index + 1, 0, copy)
    setTasks(next)
  }

  function setDeadline(id, deadline) {
    const target = tasks.find((task) => task.id === id)

    if (!target || target.deadline === deadline) {
      return
    }

    commit('Task rescheduled', mapTask(id, { deadline }))
  }

  function moveTaskToBucket(id, bucketKey) {
    setDeadline(id, deadlineForBucket(bucketKey))
  }

  function setRecurrence(id, recurrence) {
    updateTask(id, { recurrence })
  }

  function addReminder(id, reminder) {
    if (!reminder) {
      return
    }

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

  /* Rich detail fields (section A) */

  function addChecklistItem(id, text) {
    if (!text.trim()) {
      return
    }

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

      if (index < 0 || target < 0 || target >= task.checklist.length) {
        return {}
      }

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

  function addAttachment(id, attachment) {
    patch(id, (task) => ({
      attachments: [...task.attachments, { id: crypto.randomUUID(), ...attachment }],
    }))
  }

  function removeAttachment(id, attachmentId) {
    patch(id, (task) => ({
      attachments: task.attachments.filter((entry) => entry.id !== attachmentId),
    }))
  }

  /* Bulk */

  function bulkComplete(ids) {
    const set = new Set(ids)
    const stamp = new Date().toISOString()
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} completed`,
      tasks.map((task) =>
        set.has(task.id) && !task.done ? { ...task, done: true, completedAt: stamp } : task,
      ),
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
    completeTask,
    togglePin,
    archiveTask,
    unarchiveTask,
    duplicateTask,
    setDeadline,
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
    addAttachment,
    removeAttachment,
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
