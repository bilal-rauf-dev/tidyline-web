import assert from 'node:assert/strict'
import { parseImportedTasks, validateTaskCollection } from '../src/utils/tasksIO.js'
import { planLocalTaskMigration } from '../src/utils/taskMigration.js'
import { assertSafeSupabaseBrowserKey, isUnsafeSupabaseBrowserKey } from '../src/utils/supabaseKey.js'
import { classifyBackendErrors } from '../src/utils/supabaseHealth.js'
import {
  acknowledgeAccountOperation,
  applyAccountOperations,
  cacheCleanAccountSnapshot,
  enqueueAccountOperation,
  enqueueAccountOperations,
  readAccountSyncState,
  resolveAccountTaskConflict,
} from '../src/utils/taskSyncStore.js'

const example = {
  id: 'task-1',
  title: 'Pay rent',
  deadline: '2026-10-01',
  deadlineTime: '17:30',
  priority: 'high',
  reminders: [{ id: 'rel:60', kind: 'relative', minutesBefore: 60 }],
  tags: ['home'],
  checklist: [{ id: 'item-1', text: 'Check amount', done: false }],
  links: [],
  attachments: [],
  duration: { value: 30, unit: 'min' },
}

assert.deepEqual(parseImportedTasks(JSON.stringify([example])), [example])
assert.equal(validateTaskCollection([]).length, 0)

assert.throws(
  () => parseImportedTasks(JSON.stringify([example, { ...example, id: 'task-2', reminders: [null] }])),
  /Task 2 has an invalid reminder/,
)
assert.throws(
  () => parseImportedTasks(JSON.stringify([example, { ...example, id: 'task-2', deadline: '2026-02-30' }])),
  /Task 2 has an invalid deadline/,
)
assert.throws(
  () => parseImportedTasks(JSON.stringify([{ ...example, deadlineTime: '25:00' }])),
  /invalid deadline time/,
)
assert.throws(
  () => parseImportedTasks(JSON.stringify([{ ...example, priority: 'urgent' }])),
  /invalid priority/,
)
assert.throws(
  () => parseImportedTasks(JSON.stringify([example, { ...example, title: 'Duplicate' }])),
  /duplicate task IDs/,
)
assert.throws(
  () => parseImportedTasks(JSON.stringify([example, { id: 'broken', title: 'Broken', deadline: null, links: [null] }])),
  /Task 2 has invalid links/,
)
assert.throws(() => parseImportedTasks('{bad json'), SyntaxError)
assert.throws(
  () => parseImportedTasks(JSON.stringify([{ ...example, title: '   ' }])),
  /needs an ID and title/,
)

console.log('ok    Task import validation preserves whole-file integrity')

const values = new Map()
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}
const edited = { ...example, title: 'Pay rent today' }
const queued = enqueueAccountOperation(storage, 'account-a', [edited], {
  id: 'change-1', kind: 'upsert', tasks: [edited],
})
assert.equal(queued.operations.length, 1)
assert.deepEqual(readAccountSyncState(storage, 'account-a').snapshot, [edited])
assert.deepEqual(applyAccountOperations([example], queued.operations), [edited])
assert.equal(acknowledgeAccountOperation(storage, 'account-a', 'change-1').operations.length, 0)
assert.throws(
  () => acknowledgeAccountOperation(storage, 'account-a', 'change-1'),
  /changed while an operation was in flight/,
)

enqueueAccountOperation(storage, 'account-a', [], {
  id: 'change-2', kind: 'delete', ids: [example.id],
})
assert.deepEqual(applyAccountOperations([example], readAccountSyncState(storage, 'account-a').operations), [])
assert.equal(readAccountSyncState(storage, 'account-b').operations.length, 0)

const fullStorage = { ...storage, setItem: () => { throw new Error('quota exceeded') } }
assert.throws(
  () => enqueueAccountOperation(fullStorage, 'account-a', [example], {
    id: 'change-3', kind: 'upsert', tasks: [example],
  }),
  /quota exceeded/,
)
assert.equal(readAccountSyncState(storage, 'account-a').operations.length, 1)
assert.equal(cacheCleanAccountSnapshot(storage, 'account-a', [example]), null)
assert.deepEqual(readAccountSyncState(storage, 'account-a').snapshot, [])
console.log('ok    Account changes persist before submission and replay after refresh')

const conflictValues = new Map()
const conflictStorage = {
  getItem: (key) => conflictValues.get(key) ?? null,
  setItem: (key, value) => conflictValues.set(key, value),
}
const staleLocal = { ...example, title: 'Local edit', _syncRevision: 2 }
const latestLocal = { ...staleLocal, notes: 'A later offline change', _syncRevision: 3 }
enqueueAccountOperations(conflictStorage, 'account-a', [latestLocal], [
  {
    id: 'stale-edit',
    kind: 'upsert',
    tasks: [staleLocal],
    expectedRevisions: { [example.id]: 1 },
  },
  {
    id: 'later-edit',
    kind: 'upsert',
    tasks: [latestLocal],
    expectedRevisions: { [example.id]: 2 },
  },
])
const remoteEdit = { ...example, title: 'Remote edit', _syncRevision: 2 }
const conflictCopy = {
  ...latestLocal,
  id: 'task-conflict-copy',
  title: 'Local edit (conflict copy)',
  _syncRevision: 1,
}
const resolvedConflict = resolveAccountTaskConflict(conflictStorage, 'account-a', {
  operationId: 'stale-edit',
  taskId: example.id,
  remoteTask: remoteEdit,
  conflictCopy,
})
assert.deepEqual(resolvedConflict.snapshot, [conflictCopy, remoteEdit])
assert.equal(resolvedConflict.operations.length, 1)
assert.equal(resolvedConflict.operations[0].tasks[0].id, conflictCopy.id)
assert.equal(resolvedConflict.operations[0].expectedRevisions[conflictCopy.id], 0)
assert.equal(resolvedConflict.operations.some((operation) =>
  operation.tasks?.some((task) => task.id === example.id)), false)
console.log('ok    Concurrent task edits preserve both versions for review')

const accountTask = { ...example, createdAt: '2026-09-01T00:00:00+00:00' }
const sameLocalTask = { ...example, createdAt: '2026-09-01T00:00:00.000Z' }
const noChange = await planLocalTaskMigration('account-a', [accountTask], [sameLocalTask])
assert.equal(noChange.additions.length, 0)

const changedLocalTask = { ...sameLocalTask, title: 'Pay rent locally' }
const conflicted = await planLocalTaskMigration('account-a', [accountTask], [changedLocalTask])
assert.equal(conflicted.additions.length, 1)
assert.equal(conflicted.merged.length, 2)
assert.equal(conflicted.merged[1].title, accountTask.title)
assert.match(conflicted.additions[0].title, /local copy/)
const repeated = await planLocalTaskMigration('account-a', conflicted.merged, [changedLocalTask])
assert.equal(repeated.additions.length, 0)

const newLocalTask = { ...example, id: 'task-2' }
const additive = await planLocalTaskMigration('account-a', [accountTask], [newLocalTask])
assert.deepEqual(additive.additions, [newLocalTask])
assert.deepEqual(additive.merged, [newLocalTask, accountTask])
console.log('ok    Local task migration preserves account tasks and retries safely')

assert.equal(isUnsafeSupabaseBrowserKey('sb_publishable_example'), false)
assert.equal(isUnsafeSupabaseBrowserKey('sb_secret_example'), true)
const serviceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')
assert.equal(isUnsafeSupabaseBrowserKey(`eyJ.${serviceRolePayload}.signature`), true)
assert.throws(() => assertSafeSupabaseBrowserKey('sb_secret_example'), /server key/)
assert.equal(classifyBackendErrors([]), 'ready')
assert.equal(classifyBackendErrors([{ code: 'PGRST205' }]), 'incomplete')
assert.equal(classifyBackendErrors([{ code: 'NETWORK_ERROR' }]), 'unavailable')
console.log('ok    Browser configuration rejects server keys and identifies missing schema')
