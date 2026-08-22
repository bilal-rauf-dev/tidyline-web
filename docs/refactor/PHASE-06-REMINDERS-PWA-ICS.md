# Phase 6 — Reminders, PWA, and ICS

Status: Complete

Make reminder limitations explicit because current polling depends on an active page. Add a minimal valid web manifest using existing assets, then add lightweight timezone-aware `.ics` export for deadlines and supported reminders. Test ICS structure and recurrence handling; do not add a sync backend or elaborate notification infrastructure.

## Implementation record

- Reminder creation and Settings now state that alerts are checked only while TidyLine is open. Quick Add requests notification permission from its reminder-bearing submit gesture.
- Kept the worker deliberately minimal: it supports installation metadata and notification actions but adds no push, background sync, backend, or offline-delivery claim.
- Added a standalone web manifest, theme/description metadata, and the existing 1254×1254 logo as the install icon.
- Added Calendar export for open deadlines and reminders. Events use unambiguous UTC timestamps plus device-timezone metadata, RFC-style CRLF output, text escaping, and 75-byte line folding.
- Task recurrence maps to standard `RRULE` values. Relative and absolute reminders become alarms; independently recurring reminders become transparent recurring events; absolute reminders without deadlines remain exportable.
- Fixed snooze state to retain complete structured reminder IDs rather than splitting IDs on `:`.
- Added Phase 6 smoke coverage for the ICS envelope, alarms, all supported recurrence families, exclusion of completed tasks, reminder-only events, line folding, manifest fields, icon presence, and document linkage.

## Verification

`npm run check` passes lint, production build, active-surface rendering, Phases 1–6 smoke coverage, and parser tests. The built output contains both `manifest.webmanifest` and `sw.js`. Live browser inspection was blocked by the desktop browser runtime’s trusted-component initialization error, so install-prompt and responsive visual checks remain in Phase 8.

Suggested commit message: `feat: add honest reminders, install metadata, and ICS export`
