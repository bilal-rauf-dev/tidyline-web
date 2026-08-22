import { useEffect, useState } from 'react'
import {
  ROUTINE_STORAGE_KEY,
  migrateRoutineData,
  normalizeRoutine,
  routineEnvelope,
} from '../utils/routineIO'

function loadRoutineState() {
  const raw = localStorage.getItem(ROUTINE_STORAGE_KEY)
  if (!raw) return { routines: [], canPersist: true, dataError: '' }

  try {
    const migrated = migrateRoutineData(JSON.parse(raw))
    return {
      routines: migrated.routines.map(normalizeRoutine),
      canPersist: true,
      dataError: '',
    }
  } catch {
    return {
      routines: [],
      canPersist: false,
      dataError: 'Your saved routines could not be read. The original browser data has been left untouched.',
    }
  }
}

export function useRoutines() {
  const [initial] = useState(loadRoutineState)
  const [routines, setRoutines] = useState(initial.routines)

  useEffect(() => {
    if (!initial.canPersist) return
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(routineEnvelope(routines)))
  }, [initial.canPersist, routines])

  function addRoutine({ title, steps }) {
    const routine = normalizeRoutine({
      id: crypto.randomUUID(),
      title,
      steps,
      createdAt: new Date().toISOString(),
    })
    setRoutines((current) => [...current, routine])
    return routine
  }

  function updateRoutine(id, updates) {
    setRoutines((current) => current.map((routine) =>
      routine.id === id ? normalizeRoutine({ ...routine, ...updates, id: routine.id }) : routine,
    ))
  }

  function deleteRoutine(id) {
    setRoutines((current) => current.filter((routine) => routine.id !== id))
  }

  return {
    routines,
    dataError: initial.dataError,
    addRoutine,
    updateRoutine,
    deleteRoutine,
  }
}
