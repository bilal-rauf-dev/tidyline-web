import {
  ROUTINE_SCHEMA_VERSION,
  advanceRoutine,
  getRoutineStep,
  migrateRoutineData,
  normalizeRoutine,
  serializeRoutines,
} from '../src/utils/routineIO'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const routine = normalizeRoutine({
  id: 'leave',
  title: '  Leaving the house  ',
  steps: [
    { id: 'keys', text: '  Pick up keys  ', done: true, deadline: '2026-08-22' },
    'Put on shoes',
    null,
    { nope: true },
  ],
  recurrence: { freq: 'daily' },
  templateId: 'old-template',
  createdAt: '2026-08-20T09:00:00.000Z',
})

assert(routine.title === 'Leaving the house', 'Routine title was not normalized')
assert(routine.steps.length === 2 && routine.steps[0].text === 'Pick up keys', 'Routine steps were not normalized')
assert(Object.keys(routine).join(',') === 'id,title,steps,createdAt', 'Task/template concepts leaked into routines')
assert(Object.keys(routine.steps[0]).join(',') === 'id,text', 'Routine progress was persisted on a step')

const legacy = migrateRoutineData([routine])
assert(legacy.schemaVersion === ROUTINE_SCHEMA_VERSION && legacy.migratedFrom === 0, 'Routine array migration failed')
const envelope = JSON.parse(serializeRoutines([routine]))
assert(envelope.schemaVersion === ROUTINE_SCHEMA_VERSION && envelope.routines.length === 1, 'Routine envelope failed')

assert(getRoutineStep(routine, 0)?.id === 'keys', 'Routine did not begin with its first action')
assert(getRoutineStep(routine, 1)?.text === 'Put on shoes', 'Routine order changed')
assert(getRoutineStep(routine, 2) === null, 'Routine invented an action')
assert(advanceRoutine(routine, 0).stepIndex === 1, 'Routine did not advance once')
assert(advanceRoutine(routine, 1).complete, 'Routine did not finish after its final action')
assert(advanceRoutine(normalizeRoutine({ title: 'Empty' }), 0).complete, 'Empty routine did not finish safely')

let rejectedInvalid = false
try {
  migrateRoutineData({ items: [routine] })
} catch {
  rejectedInvalid = true
}
assert(rejectedInvalid, 'Unknown routine storage would be silently replaced')

let rejectedFuture = false
try {
  migrateRoutineData({ schemaVersion: ROUTINE_SCHEMA_VERSION + 1, routines: [routine] })
} catch {
  rejectedFuture = true
}
assert(rejectedFuture, 'Future routine schema would be destructively downgraded')

console.log('ok    isolated routine migration, normalization, and ordered progression')
