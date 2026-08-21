import { migrateTaskData, taskEnvelope } from './migrations'

const DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function serializeTasks(tasks) { return JSON.stringify(taskEnvelope(tasks), null, 2) }

export function validateImport(raw) {
  let parsed
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { throw new Error('The selected file is not valid JSON.') }
  const migrated = migrateTaskData(parsed)
  if (migrated.status === 'future') throw new Error(`This export uses schema version ${migrated.schemaVersion}, which is newer than this app supports.`)
  if (migrated.status !== 'ok') throw new Error('Expected a TidyLine task array or versioned export.')

  const tasks = []
  const ids = new Set()
  let skipped = 0
  let repaired = 0
  migrated.tasks.forEach((entry) => {
    if (!entry || typeof entry.title !== 'string' || !entry.title.trim()) { skipped += 1; return }
    if (entry.deadline !== null && entry.deadline !== undefined && (!DATE_VALUE.test(entry.deadline) || Number.isNaN(new Date(`${entry.deadline}T00:00:00`).getTime()))) { skipped += 1; return }
    let id = entry.id
    if (typeof id !== 'string' || !UUID_VALUE.test(id) || ids.has(id)) { id = crypto.randomUUID(); repaired += 1 }
    ids.add(id)
    tasks.push({ ...entry, id, title: entry.title.trim(), deadline: entry.deadline ?? null })
  })
  return { tasks, skipped, repaired }
}

export function parseImportedTasks(json) { return validateImport(json) }
