import { useEffect, useRef, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'
import { toDateStr } from '../utils/calendar'
import { nextOccurrence } from '../utils/recurrence'
import { reminderKey } from '../utils/reminders'
import {
  applyTaskUpdates,
  isTaskUpcoming,
  normalizePriority,
  normalizePlannedDate,
  normalizePostponeHistory,
  normalizeStartDate,
  shiftStartDateForDeadline,
  TASK_FIELDS,
} from '../utils/taskFields'
import { cleanupLegacyPreferences, migrateTaskData, taskEnvelope } from '../utils/migrations'

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
  const normalized = {
    id: task.id,
    title: task.title,
    deadline,
    reminders: normalizeList(task.reminders).map(normalizeReminder),
    tags: normalizeList(task.tags),
    priority: normalizePriority(task.priority),
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
    plannedDate: deadline ? plannedDate : null,
    originalDeadline,
    postponeHistory,
    scheduledStart: typeof task.scheduledStart === 'string' ? task.scheduledStart : null,
    status: task.status === 'waiting' ? 'waiting' : 'active',
    waitingFor: task.status === 'waiting' && typeof task.waitingFor === 'string' ? task.waitingFor : '',
    followUpDate: task.status === 'waiting' ? normalizePlannedDate(task.followUpDate) : null,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : BOOT_TIME,
  }
  return Object.fromEntries(TASK_FIELDS.map((field) => [field, normalized[field]]))
}

export function applyDailyMaintenance(tasks, todayStr) {
  let changed = false
  const next = tasks.map((task) => {
    const clearPlanned = Boolean(task.plannedDate && task.plannedDate < todayStr)
    const releaseWaiting = Boolean(task.status === 'waiting' && task.followUpDate && task.followUpDate <= todayStr)
    if (!clearPlanned && !releaseWaiting) return task
    changed = true
    return {
      ...task,
      plannedDate: clearPlanned ? null : task.plannedDate,
      status: releaseWaiting ? 'active' : task.status,
      waitingFor: releaseWaiting ? '' : task.waitingFor,
      followUpDate: releaseWaiting ? null : task.followUpDate,
    }
  })
  return changed ? next : tasks
}

function loadTaskState() {
  try {
    cleanupLegacyPreferences(localStorage)
    const raw = localStorage.getItem(STORAGE_KEY)
    const migrated = migrateTaskData(raw ? JSON.parse(raw) : [])
    if (migrated.status === 'future') {
      return { tasks: [], dataError: `Your task data was written by schema version ${migrated.schemaVersion}. Update TidyLine to open it safely.` }
    }
    return { tasks: migrated.status === 'ok' ? migrated.tasks.map(normalizeTask) : [], dataError: '' }
  } catch {
    return { tasks: [], dataError: '' }
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
  const [{ tasks: initialTasks, dataError }] = useState(loadTaskState)
  const [tasks, setTasks] = useState(initialTasks)
  const [undoState, setUndoState] = useState(null)
  const tasksRef = useRef(tasks)
  const writeTimerRef = useRef(null)

  useEffect(() => {
    tasksRef.current = tasks
    if (dataError) return undefined
    window.clearTimeout(writeTimerRef.current)
    writeTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskEnvelope(tasksRef.current)))
    }, 250)
    return () => window.clearTimeout(writeTimerRef.current)
  }, [tasks, dataError])

  useEffect(() => {
    if (dataError) return undefined
    const flush = () => {
      window.clearTimeout(writeTimerRef.current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskEnvelope(tasksRef.current)))
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [dataError])

  useEffect(() => {
    const maintain = () => setTasks((current) => applyDailyMaintenance(current, toDateStr(new Date())))
    maintain()
    const interval = window.setInterval(maintain, 60_000)

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
    priority = null,
    scheduledStart = null,
    archived = false,
    status = 'active',
    waitingFor = '',
    followUpDate = null,
    plannedDate = null,
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
      priority,
      scheduledStart,
      archived,
      status,
      waitingFor,
      followUpDate,
      plannedDate,
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

  function moveTaskToBucket(id, bucketKey) {
    setDeadline(id, deadlineForBucket(bucketKey, new Date()), 'drag', {
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
    const entries = Array.isArray(newTasks) ? newTasks : newTasks.tasks
    setTasks(entries.map(normalizeTask))
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
    dataError,
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
