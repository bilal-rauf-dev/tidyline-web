function formatDelta(delta) {
  if (delta === 0) return '–'
  return delta > 0 ? `+${delta}` : `${delta}`
}

/**
 * One column per series entry: delta, label, height-by-count bar, count.
 * A single column carries the accent; the rest stay neutral.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function TrendBars({ entries, accentKey }) {
  const max = Math.max(1, ...entries.map((entry) => entry.count))

  return (
    <div className="trend-bars">
      {entries.map((entry) => (
        <div className="trend-col" key={entry.bucket}>
          <span className="trend-delta">{formatDelta(entry.delta)}</span>
          <span className="trend-label">{entry.label}</span>

          <div className="trend-track">
            <div
              className={
                entry.bucket === accentKey ? 'trend-fill accent' : 'trend-fill'
              }
              style={{ height: `${(entry.count / max) * 100}%` }}
            />
          </div>

          <span className="trend-count">{entry.count}</span>
        </div>
      ))}
    </div>
  )
}
