import { useEffect, useRef, useState } from 'react'
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
import {
  deleteTaskRow,
  deleteManyTaskRows,
  fetchTasks,
  replaceAllTasks,
  upsertManyTasks,
  upsertTask,
} from '../utils/supabaseStorage'

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

function loadTasksFromLocalStorage() {
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

/**
 * useTasks — the main task state hook.
 *
 * Pass `auth` (the object returned by useAuth) to enable Supabase sync.
 * When `auth.isAuthenticated` is false (guest), the hook behaves exactly as
 * before: data lives in localStorage, reads are synchronous, writes are instant.
 *
 * When authenticated:
 *  - Tasks are fetched from Supabase on mount (loading = true until done).
 *  - Every mutation optimistically updates local state and fires a background
 *    Supabase write. Failed writes surface via `dbError`.
 *  - `hasPendingMigration` is true when the DB is empty but localStorage has
 *    tasks. Call `migrateLocalTasks()` to import them.
 */
export function useTasks(auth = null) {
  const isAuthenticated = auth?.isAuthenticated ?? false
  const userId          = auth?.user?.id ?? null

  // For guests: load synchronously from localStorage.
  // For authenticated: start empty, populate from Supabase asynchronously.
  const [tasks,               setTasks]               = useState(() =>
    isAuthenticated ? [] : loadTasksFromLocalStorage(),
  )
  const [undoState,           setUndoState]           = useState(null)
  const [loading,             setLoading]             = useState(() => Boolean(isAuthenticated && userId))
  const [dbError,             setDbError]             = useState(null)
  const [hasPendingMigration, setHasPendingMigration] = useState(false)

  // Track previous auth state so we can detect sign-out transitions and
  // prevent Supabase data from leaking into the guest session.
  const prevAuthRef = useRef(isAuthenticated)

  // Keep a ref to current tasks so the daily-maintenance interval can read
  // them without stale closure issues.
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  // ── Reset on sign-out (authenticated → guest) ─────────────────────────────
  // When the user signs out, React state still holds the Supabase-fetched
  // tasks. We must clear them and reload from localStorage so the guest
  // session never sees another account's data.
  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current
    prevAuthRef.current = isAuthenticated

    if (wasAuthenticated && !isAuthenticated) {
      // User just signed out — reset to local-only data.
      setTasks(loadTasksFromLocalStorage())
      setUndoState(null)
      setDbError(null)
      setHasPendingMigration(false)
      setLoading(false)
    }
  }, [isAuthenticated])

  // ── Initial Supabase fetch (authenticated users only) ─────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false

    fetchTasks(userId)
      .then((data) => {
        if (cancelled) return
        setDbError(null)

        // Offer migration if the user has local tasks but nothing in the DB yet.
        if (data.length === 0) {
          const alreadyDismissed = sessionStorage.getItem('tidyline:tasks-migration-dismissed')
          if (!alreadyDismissed) {
            try {
              const local = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
              if (Array.isArray(local) && local.length > 0) {
                setHasPendingMigration(true)
              }
            } catch { /* ignore */ }
          }
        }

        setTasks(data.map(normalizeTask))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[useTasks] fetch failed:', err)
        setDbError('Could not load tasks from your account. Check your connection.')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [isAuthenticated, userId])

  // ── Guest localStorage persistence ────────────────────────────────────────
  // Only runs for guest users. Authenticated writes go through Supabase helpers.
  // Skip the write when we just transitioned from authenticated to prevent
  // stale Supabase data from being flushed into localStorage.
  const authStableRef = useRef(isAuthenticated)
  useEffect(() => {
    if (isAuthenticated) { authStableRef.current = true; return }

    // If we just transitioned from authenticated → guest, the reset effect
    // above already set tasks to the correct local data. However, this
    // effect fires in the same render cycle with the stale tasks value from
    // before the reset. Skip this write until the next genuine guest change.
    if (authStableRef.current) { authStableRef.current = false; return }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks, isAuthenticated])

  // ── Daily maintenance: clear past plannedDates, release expired waits ─────
  // Uses the tasks ref so it doesn't need tasks in its deps. This keeps the
  // interval stable. Note: these updates are intentionally NOT synced to
  // Supabase — normalizeTask on the next fetch will produce the same result,
  // and the DB row is corrected the next time that task is touched by the user.
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
                status:     releaseWaiting ? 'active'  : task.status,
                waitingFor: releaseWaiting ? ''        : task.waitingFor,
                followUpDate: releaseWaiting ? null    : task.followUpDate,
              }
            })
          : current
      })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  // ── Undo timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!undoState) return undefined
    const timer = setTimeout(() => setUndoState(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [undoState])

  // ── Internal helpers ──────────────────────────────────────────────────────

  function handleSyncError(label, err) {
    console.error(`[useTasks] ${label} error:`, {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
      raw: err,
    })
    setDbError(err?.message ? `Failed to sync task: ${err.message}` : 'Failed to sync a change. Your data is safe locally — retry or refresh.')
  }

  function syncUpsert(task) {
    if (!isAuthenticated || !userId) return
    upsertTask(userId, task).catch((err) => handleSyncError('upsert', err))
  }

  function syncUpsertMany(taskList) {
    if (!isAuthenticated || !userId || taskList.length === 0) return
    upsertManyTasks(userId, taskList).catch((err) => handleSyncError('upsert_many', err))
  }

  function syncDelete(taskId) {
    if (!isAuthenticated || !userId) return
    deleteTaskRow(taskId).catch((err) => handleSyncError('delete', err))
  }

  function syncDeleteMany(taskIds) {
    if (!isAuthenticated || !userId || taskIds.length === 0) return
    deleteManyTaskRows(taskIds).catch((err) => handleSyncError('delete_many', err))
  }

  function commit(message, nextTasks) {
    setUndoState({ message, snapshot: tasks })
    setTasks(nextTasks)
  }

  /** Look up a task in the current snapshot. */
  function getTask(id) {
    return tasksRef.current.find((t) => t.id === id) ?? null
  }

  function mapTask(id, changes) {
    return tasks.map((task) => (task.id === id ? { ...task, ...changes } : task))
  }

  /**
   * Apply an updater function to one task, update state, and sync the result.
   * Reads from `tasks` closure for the Supabase payload; uses functional
   * setTasks for correctness under React batching.
   */
  function patch(id, updater) {
    // Read the task at call time (closure) for the Supabase payload.
    const task = getTask(id)
    if (!task) return
    const changes = updater(task)
    if (!changes || Object.keys(changes).length === 0) return
    const updated = { ...task, ...changes }

    // Functional form ensures correctness if multiple patches queue up.
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    )
    syncUpsert(updated)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  function addTask({
    title, deadline, reminders, tags = [], recurrence = null,
    notes = '', checklist = [], links = [], attachments = [],
    location = '', duration = null, startDate = null, energyLevel = null,
    scheduledStart = null, archived = false, status = 'active',
    waitingFor = '', followUpDate = null, plannedDate = null,
  }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title, deadline, reminders, tags, recurrence, notes, checklist, links,
      attachments, location, duration, startDate, energyLevel, scheduledStart,
      archived, status, waitingFor, followUpDate, plannedDate,
      originalDeadline: deadline, postponeHistory: [],
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    syncUpsert(task)
    return task
  }

  function addSomedayTask({ title, notes = '', tags = [] }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title, deadline: null, reminders: [], tags, notes,
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    syncUpsert(task)
    return task
  }

  function updateTask(id, updates, source = 'edit') {
    const task = getTask(id)
    if (!task) return
    const updated = applyTaskUpdates(task, updates, source)
    if (updated === task) return
    setTasks((current) =>
      current.map((t) => (t.id === id ? updated : t)),
    )
    syncUpsert(updated)
  }

  function deleteTask(id) {
    commit('Task deleted', tasks.filter((task) => task.id !== id))
    syncDelete(id)
  }

  function completeTask(id) {
    const target = getTask(id)
    if (!target || target.done) return

    const completed = { ...target, done: true, completedAt: new Date().toISOString() }
    let next = tasks.map((t) => (t.id === id ? completed : t))
    let createdNext = false
    let newInstance = null

    // Recurring tasks materialise their next instance on completion.
    if (target.recurrence && target.deadline) {
      const upcoming = nextOccurrence(target.recurrence, target.deadline)
      if (upcoming) {
        newInstance = nextInstance(target, upcoming)
        next = [newInstance, ...next]
        createdNext = true
      }
    }

    commit(createdNext ? 'Completed — next one scheduled' : 'Task completed', next)
    syncUpsert(completed)
    if (newInstance) syncUpsert(newInstance)
  }

  function toggleTask(id) {
    const target = getTask(id)

    if (target && !target.done) {
      completeTask(id)
      return
    }

    if (target) {
      const updated = { ...target, done: false, completedAt: null }
      setTasks(mapTask(id, { done: false, completedAt: null }))
      syncUpsert(updated)
    }
  }

  function togglePin(id) {
    const target = getTask(id)
    if (!target) return
    const updated = { ...target, pinned: !target.pinned }
    setTasks(mapTask(id, { pinned: !target.pinned }))
    syncUpsert(updated)
  }

  function archiveTask(id) {
    const target = getTask(id)
    if (!target) return
    const updated = { ...target, archived: true }
    commit('Task archived', tasks.map((t) => (t.id === id ? updated : t)))
    syncUpsert(updated)
  }

  function unarchiveTask(id) {
    const target = getTask(id)
    if (!target) return
    const updated = { ...target, archived: false }
    setTasks(mapTask(id, { archived: false }))
    syncUpsert(updated)
  }

  function duplicateTask(id) {
    const target = getTask(id)
    if (!target) return

    const copy = normalizeTask({
      ...target,
      id: crypto.randomUUID(),
      title: `${target.title} (copy)`,
      done: false, completedAt: null, pinned: false, archived: false,
      plannedDate: null, scheduledStart: null, status: 'active',
      waitingFor: '', followUpDate: null,
      originalDeadline: target.deadline, postponeHistory: [],
      createdAt: new Date().toISOString(),
    })

    const index = tasks.findIndex((t) => t.id === id)
    const next = [...tasks]
    next.splice(index + 1, 0, copy)
    setTasks(next)
    syncUpsert(copy)
    return copy
  }

  function setDeadline(id, deadline, source = 'calendar', extraUpdates = {}) {
    const target = getTask(id)
    if (!target || (target.deadline === deadline && Object.keys(extraUpdates).length === 0)) return

    const updated = applyTaskUpdates(target, { ...extraUpdates, deadline }, source)
    if (updated === target) return

    commit('Task rescheduled', tasks.map((t) => (t.id === id ? updated : t)))
    syncUpsert(updated)
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
    const updatedList = []

    const next = tasks.map((task) => {
      const deadline = byId.get(task.id)
      if (!deadline || deadline === task.deadline) return task
      const updated = applyTaskUpdates(task, { deadline }, source)
      if (updated !== task) { changed = true; updatedList.push(updated) }
      return updated
    })

    if (changed) {
      commit(`${moves.length} tasks rescheduled`, next)
      syncUpsertMany(updatedList)
    }
  }

  function togglePlanForToday(id) {
    patch(id, (task) => {
      if (isTaskUpcoming(task)) return {}
      const today = toDateStr(new Date())
      return { plannedDate: task.plannedDate === today ? null : today }
    })
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

  /* Rich detail fields */

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
    const updatedList = []

    const next = tasks.map((task) => {
      if (set.has(task.id) && !task.done) {
        const updated = { ...task, done: true, completedAt: stamp }
        updatedList.push(updated)
        return updated
      }
      return task
    })

    commit(`${ids.length} task${ids.length === 1 ? '' : 's'} completed`, next)
    syncUpsertMany(updatedList)
  }

  function bulkArchive(ids) {
    const set = new Set(ids)
    const updatedList = []

    const next = tasks.map((task) => {
      if (set.has(task.id)) {
        const updated = { ...task, archived: true }
        updatedList.push(updated)
        return updated
      }
      return task
    })

    commit(`${ids.length} task${ids.length === 1 ? '' : 's'} archived`, next)
    syncUpsertMany(updatedList)
  }

  function bulkDelete(ids) {
    const set = new Set(ids)
    commit(
      `${ids.length} task${ids.length === 1 ? '' : 's'} deleted`,
      tasks.filter((task) => !set.has(task.id)),
    )
    syncDeleteMany([...ids])
  }

  function importTasks(newTasks) {
    const normalized = newTasks.map(normalizeTask)
    setTasks(normalized)

    if (isAuthenticated && userId) {
      replaceAllTasks(userId, normalized).catch((err) =>
        handleSyncError('importTasks replaceAll', err),
      )
    }
  }

  function clearCompleted() {
    const completedIds = tasks.filter((t) => t.done).map((t) => t.id)
    commit('Completed tasks cleared', tasks.filter((t) => !t.done))
    syncDeleteMany(completedIds)
  }

  function undo() {
    if (!undoState) return
    const snapshot = undoState.snapshot
    setTasks(snapshot)
    setUndoState(null)

    if (isAuthenticated && userId) {
      // Replace all: delete current rows, re-insert the snapshot.
      replaceAllTasks(userId, snapshot).catch((err) =>
        handleSyncError('undo replaceAll', err),
      )
    }
  }

  /**
   * One-time migration: copy localStorage tasks into Supabase.
   * Offered via the MigrationBanner when DB is empty but local data exists.
   */
  async function migrateLocalTasks() {
    if (!isAuthenticated || !userId) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { setHasPendingMigration(false); return }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) { setHasPendingMigration(false); return }

      const normalized = parsed.map(normalizeTask)
      await upsertManyTasks(userId, normalized)
      setTasks(normalized)
      localStorage.removeItem(STORAGE_KEY)
      setHasPendingMigration(false)
    } catch (err) {
      console.error('[useTasks] migrateLocalTasks failed:', err)
      setDbError('Failed to migrate local tasks to your account. Please try again.')
    }
  }

  function dismissMigration() {
    sessionStorage.setItem('tidyline:tasks-migration-dismissed', 'true')
    setHasPendingMigration(false)
  }

  return {
    tasks,
    loading,
    dbError,
    clearDbError: () => setDbError(null),
    hasPendingMigration,
    migrateLocalTasks,
    dismissMigration,
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
