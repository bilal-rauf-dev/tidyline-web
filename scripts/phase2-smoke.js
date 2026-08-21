import { normalizeTask } from '../src/utils/taskMigration'
import { TASK_FIELDS } from '../src/utils/taskFields'
import { cleanupLegacyPreferences, migrateTaskData, parseImportedTasks, serializeTasks, TASK_SCHEMA_VERSION } from '../src/utils/tasksIO'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const legacy = {
  id: 'legacy', title: '  Await contract  ', deadline: '2026-09-01', status: 'waiting',
  waitingFor: 'legal', followUpDate: '2026-08-25', priority: 'high', energyLevel: 'deep-focus',
  plannedDate: '2026-08-21', scheduledStart: '2026-08-21T09:00',
  attachments: [{ id: 'a', label: 'Draft', url: 'https://example.com/draft' }, null],
  links: [{ id: 'l', label: 'Brief', url: 'https://example.com/brief' }],
  checklist: [{ text: 'Review', done: false }, null, { nope: true }],
  reminders: ['2026-08-25T09:00', null, { kind: 'relative', minutesBefore: 30 }],
}

const normalized = normalizeTask(legacy)
assert(normalized.title === 'Await contract', 'Title was not normalized')
assert(normalized.tags.includes('waiting'), 'Waiting state was not preserved as a tag')
assert(normalized.notes.includes('Waiting for legal.'), 'Waiting owner was lost')
assert(normalized.notes.includes('Follow up 2026-08-25.'), 'Follow-up date was lost')
assert(normalized.links.length === 2, 'Attachments were not preserved as links')
assert(normalized.checklist.length === 1, 'Malformed checklist entries survived')
assert(normalized.reminders.length === 2, 'Malformed reminders survived')
assert(normalized.startedAt === null && normalized.actualMinutes === null, 'Calibration fields did not initialize safely')
assert(normalized.resurfaceDate === null, 'Resurfacing did not initialize safely')
assert(Object.keys(normalized).every((key) => TASK_FIELDS.includes(key)), 'Removed task fields survived')
assert(!('priority' in normalized) && !('status' in normalized), 'Deprecated fields survived')

const oldArray = migrateTaskData([legacy])
assert(oldArray.schemaVersion === TASK_SCHEMA_VERSION && oldArray.migratedFrom === 1, 'Legacy array migration failed')
const oldEnvelope = migrateTaskData({ schemaVersion: 1, tasks: [legacy] })
assert(oldEnvelope.migratedFrom === 1 && oldEnvelope.tasks.length === 1, 'Envelope migration failed')
const exported = JSON.parse(serializeTasks([normalized]))
assert(exported.schemaVersion === TASK_SCHEMA_VERSION, 'Export schema version missing')
assert(parseImportedTasks(JSON.stringify([legacy])).length === 1, 'Legacy import stopped working')
assert(parseImportedTasks(JSON.stringify({ tasks: [legacy, null, { title: 3 }] })).length === 1, 'Import validation failed')
let rejectedInvalidEnvelope = false
try {
  migrateTaskData({ records: [legacy] })
} catch {
  rejectedInvalidEnvelope = true
}
assert(rejectedInvalidEnvelope, 'Unknown storage shape would be silently replaced')
let rejectedFutureSchema = false
try {
  migrateTaskData({ schemaVersion: TASK_SCHEMA_VERSION + 1, tasks: [legacy] })
} catch {
  rejectedFutureSchema = true
}
assert(rejectedFutureSchema, 'Future schema would be destructively downgraded')

const removed = []
cleanupLegacyPreferences({ removeItem: (key) => removed.push(key) })
assert(removed.length === 4, 'Legacy preferences were not cleaned up')

console.log('ok    loss-aware Phase 2 migration and schema cleanup')
