export function BrandMonogram({ size = 22 }) {
  const width = Math.round(size * (600 / 490))

  return (
    <svg
      width={width}
      height={size}
      viewBox="210 120 600 490"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M260 170 H560 M410 170 V560" stroke="currentColor" strokeWidth="56" />
      <path d="M560 250 V560 H760" stroke="currentColor" strokeWidth="56" />
      <path d="M640 280 H760" stroke="currentColor" strokeWidth="24" opacity="0.5" />
      <path d="M640 360 H760" stroke="currentColor" strokeWidth="24" opacity="0.5" />
      <path d="M640 440 H760" stroke="currentColor" strokeWidth="24" opacity="0.5" />
    </svg>
  )
}
