const DEFAULT_MILESTONES = [25, 50, 75]

function labelShift(point) {
  if (point === 0) return 'translateX(0)'
  if (point === 100) return 'translateX(-100%)'
  return 'translateX(-50%)'
}

/**
 * Horizontal completion bar with milestone tick marks.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function MilestoneBar({ percent, milestones = DEFAULT_MILESTONES, label }) {
  const points = [0, ...milestones, 100]

  return (
    <div className="milestone">
      {label && <span className="milestone-label">{label}</span>}

      <div className="milestone-track">
        <div className="milestone-fill" style={{ width: `${percent}%` }} />
        {milestones.map((milestone) => (
          <span key={milestone} className="milestone-tick" style={{ left: `${milestone}%` }} />
        ))}
      </div>

      <div className="milestone-scale" aria-hidden="true">
        {points.map((point) => (
          <span
            key={point}
            style={{ left: `${point}%`, transform: labelShift(point) }}
          >
            {point}%
          </span>
        ))}
      </div>
    </div>
  )
}
