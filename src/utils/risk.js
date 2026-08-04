import { daysUntil } from './dates'

export function durationToMinutes(duration, fallback = 0) {
  if (!duration || !Number.isFinite(Number(duration.value))) return fallback
  return duration.unit === 'hr' ? Number(duration.value) * 60 : Number(duration.value)
}

/**
 * Directional deadline-risk heuristic, deliberately capped at 100.
 *
 * Weighting:
 * - Time pressure is dominant (0–55): overdue/today 55, 1 day 40, 2 days 30,
 *   3–7 days 18, 8–14 days 8.
 * - Estimated effort adds 0–20: 1h 6, 2h 12, 4h+ 20.
 * - Incomplete checklist work adds 4 each, capped at 20.
 * - Each recorded postponement adds 5, capped at 15.
 * - Same-day workload adds 0–20: 3h 6, 5h 12, 8h+ 20. Unestimated
 *   same-day tasks conservatively count as 30 minutes.
 * - Energy adds 0/3/8 for low/normal/deep-focus because focus-heavy work is
 *   harder to fit into a shrinking window.
 *
 * Thresholds: under 25 = low risk, 25–49 = getting tight, 50+ = at risk.
 * This is not a prediction and is never stored on the task; it recomputes from
 * current time and board context on every render/tick.
 */
export function getDeadlineRisk(task, tasks, referenceDate = new Date()) {
  if (!task.deadline || task.done || task.archived || task.status === 'waiting') return null

  const days = daysUntil(task.deadline, referenceDate)
  let score = days <= 0 ? 55 : days === 1 ? 40 : days === 2 ? 30 : days <= 7 ? 18 : days <= 14 ? 8 : 0

  const effort = durationToMinutes(task.duration)
  score += effort >= 240 ? 20 : effort >= 120 ? 12 : effort >= 60 ? 6 : 0

  const incomplete = (task.checklist ?? []).filter((item) => !item.done).length
  score += Math.min(20, incomplete * 4)
  score += Math.min(15, (task.postponeHistory?.length ?? 0) * 5)

  const sameDayMinutes = tasks
    .filter(
      (entry) =>
        entry.deadline === task.deadline &&
        !entry.done &&
        !entry.archived &&
        entry.status !== 'waiting',
    )
    .reduce((total, entry) => total + durationToMinutes(entry.duration, 30), 0)
  score += sameDayMinutes >= 480 ? 20 : sameDayMinutes >= 300 ? 12 : sameDayMinutes >= 180 ? 6 : 0

  score += task.energyLevel === 'deep-focus' ? 8 : task.energyLevel === 'normal' ? 3 : 0
  score = Math.min(100, score)

  if (score >= 50) return { level: 'at-risk', label: 'At risk', score }
  if (score >= 25) return { level: 'tight', label: 'Getting tight', score }
  return { level: 'low', label: 'Low risk', score }
}
