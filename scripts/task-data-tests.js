import assert from 'node:assert/strict'
import { parseImportedTasks, validateTaskCollection } from '../src/utils/tasksIO.js'
import {
  acknowledgeAccountOperation,
  applyAccountOperations,
  enqueueAccountOperation,
  readAccountSyncState,
} from '../src/utils/taskSyncStore.js'

const example = {
  id: 'task-1',
  title: 'Pay rent',
  deadline: '2026-10-01',
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
console.log('ok    Account changes persist before submission and replay after refresh')
