const PAD = 5

/**
 * Small flat line chart with an optional highlighted peak point.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function Sparkline({ series, peakIndex, width = 240, height = 62 }) {
  if (series.length === 0) {
    return null
  }

  const max = Math.max(1, ...series.map((point) => point.count))
  const innerHeight = height - PAD * 2
  const stepX = series.length > 1 ? width / (series.length - 1) : 0

  const coords = series.map((point, index) => [
    index * stepX,
    PAD + innerHeight - (point.count / max) * innerHeight,
  ])

  const peak = coords[peakIndex]

  return (
    <svg
      className="sparkline"
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        className="sparkline-line"
        fill="none"
        points={coords.map(([x, y]) => `${x},${y}`).join(' ')}
        vectorEffect="non-scaling-stroke"
      />
      {peak && <circle className="sparkline-peak" cx={peak[0]} cy={peak[1]} r="3.5" />}
    </svg>
  )
}
