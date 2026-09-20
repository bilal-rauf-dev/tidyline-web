import { useCallback, useEffect, useRef, useState } from 'react'
import { deadlineForBucket } from '../utils/buckets'
import { toDateStr } from '../utils/calendar'
import { nextOccurrence } from '../utils/recurrence'
import { reminderKey } from '../utils/reminders'
import { validateTaskCollection } from '../utils/tasksIO'
import { planLocalTaskMigration } from '../utils/taskMigration'
import {
  accountSyncKey,
  acknowledgeAccountOperation,
  applyAccountOperations,
  cacheAccountSnapshot,
  cacheCleanAccountSnapshot,
  enqueueAccountOperation,
  readAccountSyncState,
} from '../utils/taskSyncStore'
import {
  applyTaskUpdates,
  applyTaskRescheduleMoves,
  isTaskUpcoming,
  normalizeEnergyLevel,
  normalizeDeadlineTime,
  normalizePriority,
  normalizePlannedDate,
  normalizePostponeHistory,
  normalizeStartDate,
  shiftStartDateForDeadline,
} from '../utils/taskFields'
import {
  deleteManyTaskRows,
  fetchTasks,
  insertManyTasks,
  replaceAllTasks,
  upsertManyTasks,
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

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null

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
  const startDate = normalizeStartDate(task.startDate, deadline)
  const status = task.status === 'waiting' && !waitingExpired ? 'waiting' : 'active'
  const today = toDateStr(new Date())
  const actionablePlannedDate =
    deadline &&
    plannedDate &&
    plannedDate >= today &&
    status === 'active' &&
    (!startDate || startDate <= plannedDate)
      ? plannedDate
      : null

  return {
    id: task.id,
    title: task.title,
    deadline,
    deadlineTime: deadline ? normalizeDeadlineTime(task.deadlineTime) : null,
    reminders: normalizeList(task.reminders).map(normalizeReminder).filter(Boolean),
    tags: normalizeList(task.tags),
    done: Boolean(task.done),
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    pinned: Boolean(task.pinned),
    archived: Boolean(task.archived),
    recurrence: task.recurrence ?? null,
    notes: typeof task.notes === 'string' ? task.notes : '',
    location: typeof task.location === 'string' ? task.location : '',
    duration: task.duration ?? null,
    priority: normalizePriority(task.priority),
    checklist: normalizeList(task.checklist),
    links: normalizeList(task.links),
    attachments: normalizeList(task.attachments),
    startDate,
    energyLevel: normalizeEnergyLevel(task.energyLevel),
    plannedDate: actionablePlannedDate,
    originalDeadline,
    postponeHistory,
    scheduledStart: typeof task.scheduledStart === 'string' ? task.scheduledStart : null,
    status,
    waitingFor:
      task.status === 'waiting' && !waitingExpired && typeof task.waitingFor === 'string'
        ? task.waitingFor
        : '',
    followUpDate: task.status === 'waiting' && !waitingExpired ? followUpDate : null,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : BOOT_TIME,
  }
}

function loadTasksFromLocalStorage() {
  let raw = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw === null ? [] : JSON.parse(raw)
    return { tasks: validateTaskCollection(parsed).map(normalizeTask), error: null }
  } catch (error) {
    // Keep the original value untouched. The recovery screen can export it.
    return {
      tasks: [],
      error: {
        message: error instanceof Error ? error.message : 'Could not read saved tasks',
        raw,
      },
    }
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
 *  - Mutations are first saved in a per-account browser queue, then submitted
 *    to Supabase. Failed writes stay queued and surface via the sync banner.
 *  - `hasPendingMigration` is true when localStorage has tasks that can be
 *    reviewed for an additive account merge.
 */
export function useTasks(auth = null) {
  const isAuthenticated = auth?.isAuthenticated ?? false
  const userId          = auth?.user?.id ?? null

  // For guests: load synchronously from localStorage.
  // For authenticated: start empty, populate from Supabase asynchronously.
  const [initialLocalLoad] = useState(() =>
    isAuthenticated ? { tasks: [], error: null } : loadTasksFromLocalStorage(),
  )
  const [tasks,               setTasks]               = useState(initialLocalLoad.tasks)
  const [localDataError,      setLocalDataError]      = useState(initialLocalLoad.error)
  const [undoState,           setUndoState]           = useState(null)
  const [loadedAccountId,     setLoadedAccountId]     = useState(null)
  const [loadGeneration,      setLoadGeneration]      = useState(0)
  const [accountLoadError,    setAccountLoadError]    = useState(false)
  const [dbError,             setDbError]             = useState(null)
  const [hasPendingMigration, setHasPendingMigration] = useState(false)
  const [pendingSyncCount,    setPendingSyncCount]    = useState(0)
  const [syncing,             setSyncing]             = useState(false)
  const [syncError,           setSyncError]           = useState(false)
  const flushActiveRef = useRef(false)
  const migrationActiveRef = useRef(false)
  const loading = Boolean(
    (isAuthenticated && userId && loadedAccountId !== userId) ||
    (!isAuthenticated && loadedAccountId),
  )

  // Track previous auth state so we can detect sign-out transitions and
  // prevent Supabase data from leaking into the guest session.
  const prevAuthRef = useRef(isAuthenticated)

  // Keep a ref to current tasks so the daily-maintenance interval can read
  // them without stale closure issues.
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const flushSyncQueue = useCallback(async () => {
    if (!isAuthenticated || !userId || flushActiveRef.current) return
    flushActiveRef.current = true
    setSyncing(true)
    try {
      while (true) {
        const current = readAccountSyncState(localStorage, userId)
        const operation = current.operations[0]
        if (!operation) {
          setPendingSyncCount(0)
          setSyncError(false)
          break
        }

        if (operation.kind === 'upsert') await upsertManyTasks(userId, operation.tasks)
        if (operation.kind === 'delete') await deleteManyTaskRows(operation.ids)
        if (operation.kind === 'replace') await replaceAllTasks(userId, operation.tasks)

        const acknowledged = acknowledgeAccountOperation(localStorage, userId, operation.id)
        setPendingSyncCount(acknowledged.operations.length)
        setSyncError(false)
      }
    } catch (error) {
      console.error('[useTasks] queued sync failed:', error)
      setSyncError(true)
      setDbError('Changes are saved in this browser but have not reached your account. Sync will retry.')
    } finally {
      flushActiveRef.current = false
      setSyncing(false)
    }
  }, [isAuthenticated, userId])

  useEffect(() => {
    if (!isAuthenticated || !userId || loading) return undefined
    const retry = () => flushSyncQueue()
    const firstRetry = window.setTimeout(retry, 0)
    const interval = window.setInterval(retry, 30_000)
    window.addEventListener('online', retry)
    return () => {
      window.clearTimeout(firstRetry)
      window.clearInterval(interval)
      window.removeEventListener('online', retry)
    }
  }, [isAuthenticated, userId, loading, flushSyncQueue])

  // Refresh a clean account view when another device changes it. A pending
  // browser operation always keeps precedence until it is resolved.
  useEffect(() => {
    if (!isAuthenticated || !userId || loading || accountLoadError) return undefined
    let cancelled = false
    let refreshing = false

    async function refreshFromAccount() {
      if (refreshing) return
      try {
        const before = readAccountSyncState(localStorage, userId)
        if (before.operations.length > 0) return
        refreshing = true
        const remote = (await fetchTasks(userId)).map(normalizeTask)
        const latest = readAccountSyncState(localStorage, userId)
        if (cancelled || latest.operations.length > 0) return
        if (!cacheCleanAccountSnapshot(localStorage, userId, remote)) return
        tasksRef.current = remote
        setTasks(remote)
      } catch (error) {
        console.error('[useTasks] account refresh failed:', error)
      } finally {
        refreshing = false
      }
    }

    function onStorage(event) {
      if (event.key !== accountSyncKey(userId)) return
      try {
        const saved = readAccountSyncState(localStorage, userId)
        tasksRef.current = saved.snapshot
        setTasks(saved.snapshot)
        setPendingSyncCount(saved.operations.length)
      } catch (error) {
        console.error('[useTasks] shared account cache unreadable:', error)
        setDbError('Saved account changes in this browser could not be read.')
      }
    }

    function onFocus() {
      if (document.visibilityState === 'visible') refreshFromAccount()
    }

    const interval = window.setInterval(refreshFromAccount, 60_000)
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [isAuthenticated, userId, loading, accountLoadError])

  // ── Reset on sign-out (authenticated → guest) ─────────────────────────────
  // When the user signs out, React state still holds the Supabase-fetched
  // tasks. We must clear them and reload from localStorage so the guest
  // session never sees another account's data.
  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current
    prevAuthRef.current = isAuthenticated

    if (wasAuthenticated && !isAuthenticated) {
      // User just signed out — reset to local-only data.
      const loaded = loadTasksFromLocalStorage()
      setTasks(loaded.tasks)
      setLocalDataError(loaded.error)
      setUndoState(null)
      setDbError(null)
      setHasPendingMigration(false)
      setLoadedAccountId(null)
      setAccountLoadError(false)
      setPendingSyncCount(0)
      setSyncError(false)
    }
  }, [isAuthenticated])

  // ── Initial Supabase fetch (authenticated users only) ─────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false
    let accountCache = null
    try {
      accountCache = readAccountSyncState(localStorage, userId)
      const pending = accountCache.operations.length
      queueMicrotask(() => { if (!cancelled) setPendingSyncCount(pending) })
    } catch (error) {
      console.error('[useTasks] account cache unreadable:', error)
      queueMicrotask(() => {
        if (!cancelled) setDbError('Saved account changes in this browser could not be read. Export your tasks before editing.')
      })
    }

    fetchTasks(userId)
      .then((data) => {
        if (cancelled) return
        if (accountCache) setDbError(null)

        // Offer a reviewed merge even when the account already has tasks.
        const alreadyDismissed = sessionStorage.getItem(`tidyline:tasks-migration-dismissed:${userId}`)
        if (!alreadyDismissed) {
          try {
            const local = validateTaskCollection(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
            if (local.length > 0) setHasPendingMigration(true)
          } catch { /* keep unreadable local data untouched */ }
        }

        const remote = data.map(normalizeTask)
        // Another tab may have queued an edit while this network request ran.
        const latestCache = accountCache ? readAccountSyncState(localStorage, userId) : null
        const merged = applyAccountOperations(remote, latestCache?.operations ?? [])
        try {
          if (latestCache) cacheAccountSnapshot(localStorage, userId, merged)
        } catch (error) {
          console.error('[useTasks] could not cache account tasks:', error)
          setDbError('Could not save an account copy in this browser. Check available storage.')
        }
        tasksRef.current = merged
        setTasks(merged)
        setAccountLoadError(false)
        setLoadedAccountId(userId)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[useTasks] fetch failed:', err)
        setDbError(accountCache?.hasSnapshot
          ? 'Showing tasks saved in this browser. Account sync will retry when connected.'
          : 'Could not load tasks from your account. Check your connection.')
        if (accountCache?.hasSnapshot) {
          tasksRef.current = accountCache.snapshot
          setTasks(accountCache.snapshot)
          setAccountLoadError(false)
        } else {
          tasksRef.current = []
          setTasks([])
          setAccountLoadError(true)
        }
        setLoadedAccountId(userId)
      })

    return () => { cancelled = true }
  }, [isAuthenticated, userId, loadGeneration])

  function retryAccountLoad() {
    setAccountLoadError(false)
    setLoadedAccountId(null)
    setLoadGeneration((current) => current + 1)
  }

  // ── Guest localStorage persistence ────────────────────────────────────────
  // Only runs for guest users. Authenticated writes go through Supabase helpers.
  // Skip the write when we just transitioned from authenticated to prevent
  // stale Supabase data from being flushed into localStorage.
  const authStableRef = useRef(isAuthenticated)
  useEffect(() => {
    if (isAuthenticated) { authStableRef.current = true; return }
    if (localDataError) return

    // If we just transitioned from authenticated → guest, the reset effect
    // above already set tasks to the correct local data. However, this
    // effect fires in the same render cycle with the stale tasks value from
    // before the reset. Skip this write until the next genuine guest change.
    if (authStableRef.current) { authStableRef.current = false; return }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    } catch {
      const timer = window.setTimeout(() => {
        setDbError('Could not save tasks in this browser. Export your tasks and check available storage.')
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [tasks, isAuthenticated, localDataError])

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

  function queueAccountChange(kind, payload) {
    const operation = { id: crypto.randomUUID(), kind, ...payload }
    const nextTasks = applyAccountOperations(tasksRef.current, [operation])
    try {
      const saved = isAuthenticated && userId
        ? enqueueAccountOperation(localStorage, userId, nextTasks, operation)
        : null
      if (!saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks))
      tasksRef.current = nextTasks
      setTasks(nextTasks)
      if (saved) {
        setPendingSyncCount(saved.operations.length)
        if (!loading) queueMicrotask(flushSyncQueue)
      }
      return true
    } catch (error) {
      console.error('[useTasks] could not queue task change:', error)
      setTasks(tasksRef.current)
      setUndoState(null)
      setDbError('Could not save this change in the browser. Check available storage and try again.')
      return false
    }
  }

  function syncUpsert(task) {
    return queueAccountChange('upsert', { tasks: [task] })
  }

  function syncUpsertMany(taskList) {
    if (taskList.length === 0) return true
    return queueAccountChange('upsert', { tasks: taskList })
  }

  function syncDelete(taskId) {
    return queueAccountChange('delete', { ids: [taskId] })
  }

  function syncDeleteMany(taskIds) {
    if (taskIds.length === 0) return true
    return queueAccountChange('delete', { ids: taskIds })
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
    title, deadline, deadlineTime = null, reminders, tags = [], recurrence = null,
    notes = '', checklist = [], links = [], attachments = [],
    location = '', duration = null, startDate = null, energyLevel = null, priority = null,
    scheduledStart = null, archived = false, status = 'active',
    waitingFor = '', followUpDate = null, plannedDate = null,
  }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title, deadline, deadlineTime, reminders, tags, recurrence, notes, checklist, links,
      attachments, location, duration, startDate, energyLevel, priority, scheduledStart,
      archived, status, waitingFor, followUpDate, plannedDate,
      originalDeadline: deadline, postponeHistory: [],
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    return syncUpsert(task) ? task : null
  }

  function addSomedayTask({ title, notes = '', tags = [] }) {
    const task = normalizeTask({
      id: crypto.randomUUID(),
      title, deadline: null, reminders: [], tags, notes,
      createdAt: new Date().toISOString(),
    })

    setTasks((current) => [task, ...current])
    return syncUpsert(task) ? task : null
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
    const result = applyTaskRescheduleMoves(tasks, moves, source)
    if (result.updatedTasks.length === 0) return

    const count = result.updatedTasks.length
    commit(`${count} task${count === 1 ? '' : 's'} rescheduled`, result.tasks)
    syncUpsertMany(result.updatedTasks)
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
    const normalized = validateTaskCollection(newTasks).map(normalizeTask)
    if (isAuthenticated && userId) {
      if (!queueAccountChange('replace', { tasks: normalized })) {
        throw new Error('Could not save the imported tasks in this browser. The existing tasks were kept.')
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      tasksRef.current = normalized
      setTasks(normalized)
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
    if (isAuthenticated && userId) {
      if (!queueAccountChange('replace', { tasks: snapshot })) return
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      } catch {
        setDbError('Could not save the undo in this browser. Check available storage and try again.')
        return
      }
      tasksRef.current = snapshot
      setTasks(snapshot)
    }
    setUndoState(null)
  }

  /**
   * One-time migration: add localStorage tasks to the account without changing
   * existing account tasks. Source data is removed only after the cloud write.
   */
  async function migrateLocalTasks() {
    if (!isAuthenticated || !userId || migrationActiveRef.current) return
    migrationActiveRef.current = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { setHasPendingMigration(false); return }

      const parsed = validateTaskCollection(JSON.parse(raw))
      if (parsed.length === 0) { setHasPendingMigration(false); return }

      if (readAccountSyncState(localStorage, userId).operations.length > 0) {
        throw new Error('Wait for pending account changes to sync before merging local tasks.')
      }
      const account = (await fetchTasks(userId)).map(normalizeTask)
      if (readAccountSyncState(localStorage, userId).operations.length > 0) {
        throw new Error('Wait for pending account changes to sync before merging local tasks.')
      }
      const normalized = parsed.map(normalizeTask)
      const plan = await planLocalTaskMigration(userId, account, normalized)
      await insertManyTasks(userId, plan.additions)
      if (!cacheCleanAccountSnapshot(localStorage, userId, plan.merged)) {
        throw new Error('Account changes arrived during the merge. Wait for them to sync, then retry.')
      }
      tasksRef.current = plan.merged
      setTasks(plan.merged)
      localStorage.removeItem(STORAGE_KEY)
      setHasPendingMigration(false)
    } catch (err) {
      console.error('[useTasks] migrateLocalTasks failed:', err)
      setDbError(err instanceof Error ? err.message : 'Failed to merge local tasks. Please try again.')
    } finally {
      migrationActiveRef.current = false
    }
  }

  function dismissMigration() {
    if (userId) sessionStorage.setItem(`tidyline:tasks-migration-dismissed:${userId}`, 'true')
    setHasPendingMigration(false)
  }

  function discardBrokenLocalTasks() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setTasks([])
      setLocalDataError(null)
    } catch {
      setDbError('Could not remove the unreadable data from this browser. Check browser storage permissions.')
    }
  }

  return {
    tasks,
    accountLoadError,
    retryAccountLoad,
    pendingSyncCount,
    syncing,
    syncError,
    retrySync: flushSyncQueue,
    localDataError,
    discardBrokenLocalTasks,
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
