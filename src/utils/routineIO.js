export const ROUTINE_SCHEMA_VERSION = 1
export const ROUTINE_STORAGE_KEY = 'tidyline:routines'

const BOOT_TIME = new Date().toISOString()
const MAX_STEPS = 50

function normalizeStep(value) {
  const text = typeof value === 'string' ? value : value?.text
  if (typeof text !== 'string' || !text.trim()) return null
  return {
    id: typeof value?.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    text: text.trim(),
  }
}

export function normalizeRoutine(value) {
  const routine = value && typeof value === 'object' ? value : {}
  return {
    id: typeof routine.id === 'string' && routine.id ? routine.id : crypto.randomUUID(),
    title:
      typeof routine.title === 'string' && routine.title.trim()
        ? routine.title.trim()
        : 'Untitled routine',
    steps: (Array.isArray(routine.steps) ? routine.steps : [])
      .map(normalizeStep)
      .filter(Boolean)
      .slice(0, MAX_STEPS),
    createdAt: typeof routine.createdAt === 'string' ? routine.createdAt : BOOT_TIME,
  }
}

export function routineEnvelope(routines) {
  return { schemaVersion: ROUTINE_SCHEMA_VERSION, routines }
}

export function migrateRoutineData(value) {
  if (Array.isArray(value)) {
    return { schemaVersion: ROUTINE_SCHEMA_VERSION, routines: value, migratedFrom: 0 }
  }
  if (value && typeof value === 'object' && Array.isArray(value.routines)) {
    if (Number.isInteger(value.schemaVersion) && value.schemaVersion > ROUTINE_SCHEMA_VERSION) {
      throw new TypeError(`Unsupported future routine schema: ${value.schemaVersion}`)
    }
    return {
      schemaVersion: ROUTINE_SCHEMA_VERSION,
      routines: value.routines,
      migratedFrom: Number.isInteger(value.schemaVersion) ? value.schemaVersion : null,
    }
  }
  throw new TypeError('Expected a TidyLine routine array or routine envelope')
}

export function serializeRoutines(routines) {
  return JSON.stringify(routineEnvelope(routines), null, 2)
}

export function getRoutineStep(routine, stepIndex) {
  if (!routine || !Number.isInteger(stepIndex) || stepIndex < 0) return null
  return routine.steps[stepIndex] ?? null
}

export function advanceRoutine(routine, stepIndex) {
  const nextIndex = stepIndex + 1
  return nextIndex >= (routine?.steps.length ?? 0)
    ? { complete: true, stepIndex: 0 }
    : { complete: false, stepIndex: nextIndex }
}
