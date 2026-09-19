import { validateTaskCollection } from './tasksIO.js'

const VERSION = 1

export function accountSyncKey(userId) {
  return `tidyline:account:${userId}:sync-v1`
}

function emptyState() {
  return { version: VERSION, snapshot: [], operations: [], hasSnapshot: false }
}

function validateOperation(operation) {
  if (!operation || typeof operation !== 'object' ||
      typeof operation.id !== 'string' || !operation.id.trim()) {
    throw new Error('The saved sync queue contains an invalid operation')
  }
  if (operation.kind === 'upsert' || operation.kind === 'replace') {
    validateTaskCollection(operation.tasks)
  } else if (operation.kind === 'delete') {
    if (!Array.isArray(operation.ids) ||
        !operation.ids.every((id) => typeof id === 'string' && id.length > 0)) {
      throw new Error('The saved sync queue contains invalid task IDs')
    }
  } else {
    throw new Error('The saved sync queue contains an unknown operation')
  }
  return operation
}

export function readAccountSyncState(storage, userId) {
  const raw = storage.getItem(accountSyncKey(userId))
  if (raw === null) return emptyState()
  const parsed = JSON.parse(raw)
  if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.operations)) {
    throw new Error('The saved account task cache has an unsupported format')
  }
  validateTaskCollection(parsed.snapshot)
  parsed.operations.forEach(validateOperation)
  return { ...parsed, hasSnapshot: true }
}

function writeAccountSyncState(storage, userId, state) {
  storage.setItem(accountSyncKey(userId), JSON.stringify({
    version: VERSION,
    snapshot: state.snapshot,
    operations: state.operations,
  }))
}

export function enqueueAccountOperation(storage, userId, snapshot, operation) {
  validateTaskCollection(snapshot)
  validateOperation(operation)
  const current = readAccountSyncState(storage, userId)
  const next = {
    version: VERSION,
    snapshot,
    operations: [...current.operations, operation],
    hasSnapshot: true,
  }
  writeAccountSyncState(storage, userId, next)
  return next
}

export function acknowledgeAccountOperation(storage, userId, operationId) {
  const current = readAccountSyncState(storage, userId)
  if (current.operations[0]?.id !== operationId) {
    throw new Error('The saved sync queue changed while an operation was in flight')
  }
  const next = { ...current, operations: current.operations.slice(1) }
  writeAccountSyncState(storage, userId, next)
  return next
}

export function cacheAccountSnapshot(storage, userId, snapshot) {
  validateTaskCollection(snapshot)
  const current = readAccountSyncState(storage, userId)
  const next = { ...current, snapshot, hasSnapshot: true }
  writeAccountSyncState(storage, userId, next)
  return next
}

export function cacheCleanAccountSnapshot(storage, userId, snapshot) {
  validateTaskCollection(snapshot)
  const current = readAccountSyncState(storage, userId)
  if (current.operations.length > 0) return null
  const next = { ...current, snapshot, hasSnapshot: true }
  writeAccountSyncState(storage, userId, next)
  return next
}

export function applyAccountOperations(tasks, operations) {
  return operations.reduce((current, operation) => {
    if (operation.kind === 'replace') return operation.tasks
    if (operation.kind === 'delete') {
      const ids = new Set(operation.ids)
      return current.filter((task) => !ids.has(task.id))
    }
    const incoming = new Map(operation.tasks.map((task) => [task.id, task]))
    const existingIds = new Set(current.map((task) => task.id))
    const added = operation.tasks.filter((task) => !existingIds.has(task.id))
    return [...added, ...current.map((task) => incoming.get(task.id) ?? task)]
  }, tasks)
}
