const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HomeIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M2.8 8.6 10 3l7.2 5.6" />
      <path d="M4.7 8.3v8.2h10.6V8.3" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 5.5 7.5 10l4.5 4.5" />
    </svg>
  )
}

export function BoardIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="2.5" y="3" width="4.5" height="14" rx="1" />
      <rect x="8.75" y="3" width="4.5" height="9" rx="1" />
      <rect x="15" y="3" width="2.5" height="6" rx="1" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13" rx="1.5" />
      <path d="M2.5 8h15" />
      <path d="M6 2.5v3" />
      <path d="M14 2.5v3" />
    </svg>
  )
}

export function AnalyticsIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="3" y="10" width="3.5" height="7" rx="0.8" />
      <rect x="8.25" y="6" width="3.5" height="11" rx="0.8" />
      <rect x="13.5" y="2.5" width="3.5" height="14.5" rx="0.8" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2.1M10 15.4v2.1M17.5 10h-2.1M4.6 10H2.5M15.1 4.9l-1.5 1.5M6.4 13.6l-1.5 1.5M15.1 15.1l-1.5-1.5M6.4 6.4L4.9 4.9" />
    </svg>
  )
}
