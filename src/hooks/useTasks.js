import { useEffect, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'
import { toDateStr } from '../utils/calendar'
import { nextOccurrence } from '../utils/recurrence'
import { reminderKey } from '../utils/reminders'
import {
  applyTaskUpdates,
  isTaskUpcoming,
  normalizeEnergyLevel,
  normalizePlannedDate,
  normalizePostponeHistory,
  normalizeStartDate,
  shiftStartDateForDeadline,
} from '../utils/taskFields'

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
  const deadline = typeof task.deadline === 'string' ? task.deadline : null
  const plannedDate = normalizePlannedDate(task.plannedDate)
  const postponeHistory = normalizePostponeHistory(task.postponeHistory)
  const originalDeadline =
    normalizePlannedDate(task.originalDeadline) ?? postponeHistory[0]?.from ?? deadline
  const followUpDate = normalizePlannedDate(task.followUpDate)
  const waitingExpired = followUpDate && followUpDate <= toDateStr(new Date())

  return {
    id: task.id,
    title: task.title,
    deadline,
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
    startDate: normalizeStartDate(task.startDate, deadline),
    energyLevel: normalizeEnergyLevel(task.energyLevel),
    plannedDate:
      deadline && plannedDate && plannedDate >= toDateStr(new Date()) ? plannedDate : null,
    originalDeadline,
    postponeHistory,
    scheduledStart: typeof task.scheduledStart === 'string' ? task.scheduledStart : null,
    status: task.status === 'waiting' && !waitingExpired ? 'waiting' : 'active',
    waitingFor:
      task.status === 'waiting' && !waitingExpired && typeof task.waitingFor === 'string'
        ? task.waitingFor
        : '',
    followUpDate: task.status === 'waiting' && !waitingExpired ? followUpDate : null,
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
    startDate: shiftStartDateForDeadline(task.startDate, task.deadline, deadline),
    done: false,
    completedAt: null,
    pinned: false,
    plannedDate: null,
    scheduledStart: null,
    status: 'active',
    waitingFor: '',
    followUpDate: null,
    originalDeadline: deadline,
    postponeHistory: [],
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
    const interval = window.setInterval(() => {
      const today = toDateStr(new Date())
      setTasks((current) => {
        const needsMaintenance = current.some(
          (task) =>
            (task.plannedDate && task.plannedDate < today) ||
            (task.status === 'waiting' && task.followUpDate && task.followUpDate <= today),
        )

        return needsMaintenance
          ? current.map((task) => {
              const releaseWaiting =
                task.status === 'waiting' && task.followUpDate && task.followUpDate <= today

              return {
                ...task,
                plannedDate:
                  task.plannedDate && task.plannedDate < today ? null : task.plannedDate,
                status: releaseWaiting ? 'active' : task.status,
                waitingFor: releaseWaiting ? '' : task.waitingFor,
                followUpDate: releaseWaiting ? null : task.followUpDate,
              }
            })
          : current
      })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

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

  function addTask({
    title,
    deadline,
    reminders,
    tags = [],
    recurrence = null,
    notes = '',
    checklist = [],
    links = [],
    attachments = [],
    location = '',
    duration = null,
    startDate = null,
    energyLevel = null,
    scheduledStart = null,
    status = 'active',
    waitingFor = '',
    followUpDate = null,
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
      attachments,
      location,
      duration,
      startDate,
      energyLevel,
      scheduledStart,
      status,
      waitingFor,
      followUpDate,
      plannedDate: null,
      originalDeadline: deadline,
      postponeHistory: [],
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    return task
  }

  function addSomedayTask({ title, notes = '', tags = [] }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title,
      deadline: null,
      reminders: [],
      tags,
      notes,
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    return task
  }

  function updateTask(id, updates, source = 'edit') {
    setTasks((current) =>
      current.map((task) => (task.id === id ? applyTaskUpdates(task, updates, source) : task)),
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
    let createdNext = false

    // Recurring tasks materialise their next instance on completion.
    if (target.recurrence && target.deadline) {
      const upcoming = nextOccurrence(target.recurrence, target.deadline)

      if (upcoming) {
        next = [nextInstance(target, upcoming), ...next]
        createdNext = true
      }
    }

    commit(createdNext ? 'Completed — next one scheduled' : 'Task completed', next)
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
      plannedDate: null,
      scheduledStart: null,
      status: 'active',
      waitingFor: '',
      followUpDate: null,
      originalDeadline: target.deadline,
      postponeHistory: [],
      createdAt: new Date().toISOString(),
    })

    const index = tasks.findIndex((task) => task.id === id)
    const next = [...tasks]
    next.splice(index + 1, 0, copy)
    setTasks(next)
  }

  function setDeadline(id, deadline, source = 'calendar', extraUpdates = {}) {
    const target = tasks.find((task) => task.id === id)

    if (!target || (target.deadline === deadline && Object.keys(extraUpdates).length === 0)) {
      return
    }

    const updated = applyTaskUpdates(target, { ...extraUpdates, deadline }, source)

    if (updated === target) {
      return
    }

    commit(
      'Task rescheduled',
      tasks.map((task) => (task.id === id ? updated : task)),
    )
  }

  function moveTaskToBucket(id, bucketKey, bucketOrder) {
    setDeadline(id, deadlineForBucket(bucketKey, new Date(), bucketOrder), 'drag', {
      plannedDate: null,
    })
  }

  function promoteSomeday(id, deadline) {
    if (!deadline) return

    patch(id, (task) =>
      task.deadline ? {} : { deadline, originalDeadline: deadline },
    )
  }

  function setScheduledStart(id, scheduledStart) {
    updateTask(id, { scheduledStart: scheduledStart || null })
  }

  function rescheduleTasks(moves, source = 'calendar') {
    const byId = new Map(moves.map((move) => [move.id, move.deadline]))
    let changed = false
    const next = tasks.map((task) => {
      const deadline = byId.get(task.id)
      if (!deadline || deadline === task.deadline) return task
      const updated = applyTaskUpdates(task, { deadline }, source)
      if (updated !== task) changed = true
      return updated
    })

    if (changed) commit(`${moves.length} tasks rescheduled`, next)
  }

  function togglePlanForToday(id) {
    patch(id, (task) => {
      if (isTaskUpcoming(task)) {
        return {}
      }

      const today = toDateStr(new Date())
      return { plannedDate: task.plannedDate === today ? null : today }
    })
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
    addSomedayTask,
    updateTask,
    deleteTask,
    toggleTask,
    completeTask,
    togglePin,
    togglePlanForToday,
    archiveTask,
    unarchiveTask,
    duplicateTask,
    setDeadline,
    promoteSomeday,
    setScheduledStart,
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
