export const CALIBRATION_MIN_SAMPLES = 3
export const FALLBACK_MINUTES = 45
export const MIN_MULTIPLIER = 0.5
export const MAX_MULTIPLIER = 4
export const MAX_VALID_ACTUAL_MINUTES = 7 * 24 * 60

export function durationToMinutes(duration) {
  const value = Number(duration?.value)
  if (!Number.isFinite(value) || value <= 0) return null
  return value * (duration?.unit === 'hr' ? 60 : 1)
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function validActual(task) {
  const value = Number(task.actualMinutes)
  return task.done && Number.isFinite(value) && value > 0 && value <= MAX_VALID_ACTUAL_MINUTES
    ? value
    : null
}

export function getCalibration(tasks, minimumSamples = CALIBRATION_MIN_SAMPLES) {
  const ratios = tasks.flatMap((task) => {
    const estimate = durationToMinutes(task.duration)
    const actual = validActual(task)
    return estimate && actual ? [actual / estimate] : []
  })
  const rawMultiplier = median(ratios)
  const calibrated = ratios.length >= minimumSamples && rawMultiplier !== null
  return {
    multiplier: calibrated
      ? Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, rawMultiplier))
      : 1,
    sampleCount: ratios.length,
    calibrated,
  }
}

function roundedMinutes(value) {
  return Math.max(5, Math.round(value / 5) * 5)
}

export function estimateTaskDuration(task, tasks) {
  const explicit = durationToMinutes(task.duration)
  const calibration = getCalibration(tasks)

  if (explicit) {
    return {
      minutes: roundedMinutes(explicit * calibration.multiplier),
      source: calibration.calibrated ? 'calibrated' : 'estimate',
      estimateMinutes: explicit,
      ...calibration,
    }
  }

  const historical = median(tasks.map(validActual).filter((value) => value !== null))
  if (historical !== null) {
    return {
      minutes: roundedMinutes(historical),
      source: 'history',
      estimateMinutes: null,
      ...calibration,
    }
  }

  return {
    minutes: FALLBACK_MINUTES,
    source: 'fallback',
    estimateMinutes: null,
    ...calibration,
  }
}

export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const remainder = total % 60
  if (!hours) return `${remainder}m`
  if (!remainder) return `${hours}h`
  return `${hours}h ${remainder}m`
}
