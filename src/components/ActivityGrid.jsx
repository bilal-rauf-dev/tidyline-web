/**
 * Day-of-week dot grid. Solid = completed activity, hatched = overdue,
 * outlined = nothing. Reusable primitive — see design.md "Chart primitives".
 */
export function ActivityGrid({ cells, label }) {
  return (
    <div className="activity-grid" aria-label={label}>
      {cells.map((cell, index) =>
        cell === null ? (
          <span key={`blank-${index}`} className="activity-dot blank" />
        ) : (
          <span
            key={cell.dateStr}
            className={`activity-dot ${cell.state}`}
            title={cell.dateStr}
          />
        ),
      )}
    </div>
  )
}
