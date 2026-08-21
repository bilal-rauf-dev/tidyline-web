export const CURRENT_SCHEMA_VERSION = 2
export const LEGACY_BUCKET_CONFIG_KEYS = ['tidyline:bucket-config', 'tidyline:bucket-order']

export function migrateV1ToV2(tasks) {
  return tasks.map((entry) => {
    const task = { ...entry }
    delete task.energyLevel
    return task
  })
}

export function migrateTaskData(raw) {
  if (Array.isArray(raw)) return { status: 'ok', schemaVersion: 2, tasks: migrateV1ToV2(raw), migrated: true }
  if (!raw || typeof raw !== 'object' || !Number.isInteger(raw.schemaVersion) || !Array.isArray(raw.tasks)) {
    return { status: 'invalid', schemaVersion: null, tasks: [], migrated: false }
  }
  if (raw.schemaVersion > CURRENT_SCHEMA_VERSION) return { status: 'future', schemaVersion: raw.schemaVersion, tasks: [], migrated: false }
  if (raw.schemaVersion === 1) return { status: 'ok', schemaVersion: 2, tasks: migrateV1ToV2(raw.tasks), migrated: true }
  return { status: 'ok', schemaVersion: 2, tasks: raw.tasks, migrated: false }
}

export function taskEnvelope(tasks) { return { schemaVersion: CURRENT_SCHEMA_VERSION, tasks } }

export function cleanupLegacyPreferences(storage) {
  LEGACY_BUCKET_CONFIG_KEYS.forEach((key) => storage.removeItem(key))
}
