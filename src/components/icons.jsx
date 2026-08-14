const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function CommandIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="1.8" y="2.5" width="16.4" height="15" rx="2" />
      <path d="m6.4 8 2.2 2.2-2.2 2.2" />
      <path d="M10.4 12.4h3.4" />
    </svg>
  );
}

export function NotesIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4.5 4.5h11M4.5 8h11M4.5 11.5h7.5M4.5 15h5" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M8.4 11.6a3 3 0 0 0 4.2 0l2.4-2.4a3 3 0 1 0-4.2-4.2l-1 1" />
      <path d="M11.6 8.4a3 3 0 0 0-4.2 0L5 10.8a3 3 0 1 0 4.2 4.2l1-1" />
    </svg>
  );
}

export function MapPinIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M10 17s5-4.4 5-8.2A5 5 0 0 0 5 8.8C5 12.6 10 17 10 17z" />
      <circle cx="10" cy="8.6" r="1.9" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="6.8" />
      <path d="M10 6v4.2l2.6 1.6" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 9V7.8A2.8 2.8 0 0 1 6.8 5h8" />
      <path d="m12.6 2.8 2.4 2.2-2.4 2.2" />
      <path d="M16 11v1.2a2.8 2.8 0 0 1-2.8 2.8h-8" />
      <path d="m7.4 17.2-2.4-2.2 2.4-2.2" />
    </svg>
  );
}

export function PaperclipIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M15.5 9.2 9.9 14.8a3.3 3.3 0 0 1-4.7-4.7l6-6a2.2 2.2 0 0 1 3.1 3.1l-5.9 6a1.1 1.1 0 0 1-1.6-1.6l5.3-5.3" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="m5.5 8 4.5 4.5L14.5 8" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M10 15.5v-11M5.5 9 10 4.5 14.5 9" />
    </svg>
  );
}

export function ArrowDownIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M10 4.5v11M5.5 11l4.5 4.5L14.5 11" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M6 8.5a4 4 0 0 1 8 0c0 2.8 1 4.2 1.5 4.7h-11C5 12.7 6 11.3 6 8.5z" />
      <path d="M8.6 15.4a1.6 1.6 0 0 0 2.8 0" />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M3.5 3.5h6l7 7-6 6-7-7z" />
      <circle cx="7" cy="7" r="1.1" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="9" cy="9" r="5.2" />
      <path d="m12.9 12.9 3.6 3.6" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M7.5 3h5l-1 5 3 2.5v1.5H5.5v-1.5l3-2.5z" />
      <path d="M10 12v5" />
    </svg>
  );
}

export function ArchiveIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="2.8" y="4" width="14.4" height="3.4" rx="0.8" />
      <path d="M4.3 7.4v8a1 1 0 0 0 1 1h9.4a1 1 0 0 0 1-1v-8" />
      <path d="M8.2 10.6h3.6" />
    </svg>
  );
}

export function SaveIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 3.5h10.2l2 2v11H4z" />
      <path d="M6.7 3.5v4.2h6V3.5M6.8 16.5v-5h6.4v5" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M3.5 5.5h13" />
      <path d="M8 5.5V4.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.3" />
      <path d="m5.7 5.5.6 10.3a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9l.6-10.3" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="6.8" y="6.8" width="9.7" height="9.7" rx="1.4" />
      <path d="M13.4 6.8V5.2a1.7 1.7 0 0 0-1.7-1.7H5.2a1.7 1.7 0 0 0-1.7 1.7v6.5a1.7 1.7 0 0 0 1.7 1.7h1.6" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="m13.4 3.6 3 3L7 16H4v-3z" />
    </svg>
  );
}

export function OpenDetailsIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M7.5 3.5h-4v4M12.5 3.5h4v4M3.5 12.5v4h4M16.5 12.5v4h-4" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="m4.5 10 3.4 3.4 7.6-7.6" />
    </svg>
  );
}

export function GripIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M7.5 5.5h.01M12.5 5.5h.01M7.5 10h.01M12.5 10h.01M7.5 14.5h.01M12.5 14.5h.01" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M2.8 8.6 10 3l7.2 5.6" />
      <path d="M4.7 8.3v8.2h10.6V8.3" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 5.5 7.5 10l4.5 4.5" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="m8 5.5 4.5 4.5L8 14.5" />
    </svg>
  );
}

export function BoardIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="2.5" y="3" width="4.5" height="14" rx="1" />
      <rect x="8.75" y="3" width="4.5" height="9" rx="1" />
      <rect x="15" y="3" width="2.5" height="6" rx="1" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13" rx="1.5" />
      <path d="M2.5 8h15" />
      <path d="M6 2.5v3" />
      <path d="M14 2.5v3" />
    </svg>
  );
}

export function AnalyticsIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="3" y="10" width="3.5" height="7" rx="0.8" />
      <rect x="8.25" y="6" width="3.5" height="11" rx="0.8" />
      <rect x="13.5" y="2.5" width="3.5" height="14.5" rx="0.8" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2.1M10 15.4v2.1M17.5 10h-2.1M4.6 10H2.5M15.1 4.9l-1.5 1.5M6.4 13.6l-1.5 1.5M15.1 15.1l-1.5-1.5M6.4 6.4L4.9 4.9" />
    </svg>
  );
}
