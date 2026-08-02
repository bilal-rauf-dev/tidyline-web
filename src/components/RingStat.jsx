const STROKE = 6

/**
 * Circular progress tile: ring + label + bold-numerator fraction.
 * Reusable primitive — see design.md "Chart primitives".
 */
export function RingStat({ value, total, label, size = 64 }) {
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const filled = total > 0 ? (value / total) * circumference : 0
  const center = size / 2

  return (
    <div className="ring-tile">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="ring-fill"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>

      <span className="ring-tile-label">{label}</span>
      <span className="ring-tile-fraction">
        <strong>{value}</strong>/{total}
      </span>
    </div>
  )
}
