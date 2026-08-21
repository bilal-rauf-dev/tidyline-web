export const TASK_SCHEMA_VERSION = 3

const REMOVED_PREFERENCE_KEYS = [
  'tidyline:bucket-order',
  'tidyline:task-templates',
  'tidyline:saved-filters',
  'tidyline:overload-hours',
]

export function taskEnvelope(tasks) {
  return { schemaVersion: TASK_SCHEMA_VERSION, tasks }
}

export function migrateTaskData(value) {
  if (Array.isArray(value)) {
    return { schemaVersion: TASK_SCHEMA_VERSION, tasks: value, migratedFrom: 1 }
  }

  if (value && typeof value === 'object' && Array.isArray(value.tasks)) {
    if (Number.isInteger(value.schemaVersion) && value.schemaVersion > TASK_SCHEMA_VERSION) {
      throw new TypeError(`Unsupported future task schema: ${value.schemaVersion}`)
    }
    return {
      schemaVersion: TASK_SCHEMA_VERSION,
      tasks: value.tasks,
      migratedFrom: Number.isInteger(value.schemaVersion) ? value.schemaVersion : null,
    }
  }

  throw new TypeError('Expected a TidyLine task array or task envelope')
}

export function cleanupLegacyPreferences(storage) {
  REMOVED_PREFERENCE_KEYS.forEach((key) => storage.removeItem(key))
}

export function serializeTasks(tasks) {
  return JSON.stringify(taskEnvelope(tasks), null, 2)
}

export function parseImportedTasks(json) {
  const migrated = migrateTaskData(JSON.parse(json))

  return migrated.tasks.filter(
    (item) => item && typeof item === 'object' && typeof item.title === 'string',
  )
}
