# Phase 4 — Time-blindness model

Status: Complete

Use canonical calibrated duration to derive `startBy = deadline - duration - simple buffer`, replace manual start-date maintenance, make fit language actionable, update workload/planner sizing, distinguish start timing from deadline countdowns, and add a lightweight `resurfaceDate` so Later does not become invisible. Keep the implementation deterministic and avoid exposing the calculation as a configuration system.

Suggested commit message: `feat: make start-by timing drive task planning`

## Implementation record

- Added deterministic derived `startBy` using canonical expected duration plus a fixed 30-minute transition buffer. It is not persisted or configurable.
- Board attention is now based on the earliest relevant start/resurface date. Due-today, start-today, missed-start, active, and resurfaced tasks enter Today automatically.
- Replaced raw deadline countdowns on primary task surfaces with Start now/today/future language. Longer distances use workdays or weekends to make future time more concrete.
- Added calm fit outcomes: Fits comfortably, Getting tight, and Won't fit at your usual pace. Fit uses remaining calibrated task duration, earlier committed work, and a deterministic six-hour daily capacity; no score or settings were introduced.
- Added nullable `resurfaceDate` with one “Bring back on” date field. Invalid dates after the deadline normalize to null. Recurring instances and duplicates reset it.
- Added a 21-day continuous Calendar ribbon. Bar height uses canonical expected workload at each attention date; dots show deadline concentration. Month cells also mark start counts.
- Updated Now ordering and sidebar language to use attention/start timing; Phase 5 subsequently delivered the final one-task selection and the `5 more minutes`/`Not this` interactions.

The removed manual Planner was not restored. Its sizing requirement is satisfied by the shared canonical-duration workload utilities and Calendar ribbon rather than a blank scheduling grid.

## Verification gate

`npm run check` now includes `phase4-smoke`, covering calibrated and multi-day start-by, Today promotion, active and resurfaced tasks, fit boundaries, concrete future language, canonical workload, migration validation, active-surface rendering, build, and lint.
