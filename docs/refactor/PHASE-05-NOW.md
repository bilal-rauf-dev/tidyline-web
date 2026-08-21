# Phase 5 — Now view

Status: Complete

Make Now the primary, decision-free entry surface. Present approximately one selected task at a time, chosen by start urgency, deadline urgency, calibrated fit, and reasonable task size without exposing a score. Support Done, 5 more minutes, and Not this. Ensure keyboard access, visible focus, touch-friendly controls, reduced motion, and strong mobile behavior.

## Implementation record

- Replaced the provisional list-like Now view with one internally ranked open task and a calm empty state.
- Added deterministic selection based on active work, missed/today start attention, deadline proximity, calibrated fit, and remaining expected size. No score or preference is exposed.
- Added `5 more minutes`, `Done`, and `Not this`. Continuation starts or keeps ordinary task timing active; rotation is session-only and does not mutate or persist a priority.
- Focus follows a newly selected task. Actions use native controls, an accessible group label, visible focus, reduced-motion behavior, 48px minimum hit areas, and a stacked narrow-screen layout.
- Added selection, exclusion, wraparound, urgency, and empty-state smoke coverage to `npm run check`.

## Verification

`npm run check` passes lint, production build, active-surface rendering, Phases 1–5 smoke coverage, and parser tests. Automated browser rendering was unavailable in the current desktop runtime, so a live responsive/assistive-technology pass remains part of Phase 8.

Suggested commit message: `feat: add decision-free Now task flow`
