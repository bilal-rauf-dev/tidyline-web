# Phase 4 — Time-blindness model

Status: Planned

Use canonical calibrated duration to derive `startBy = deadline - duration - simple buffer`, replace manual start-date maintenance, make fit language actionable, update workload/planner sizing, distinguish start timing from deadline countdowns, and add a lightweight `resurfaceDate` so Later does not become invisible. Keep the implementation deterministic and avoid exposing the calculation as a configuration system.

Suggested commit message: `feat: make start-by timing drive task planning`
