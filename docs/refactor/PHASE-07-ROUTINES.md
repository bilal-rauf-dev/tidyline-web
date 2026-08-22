# Phase 7 — Routines

Status: Complete

Only after the core refactor is stable, consider the smallest ordered-trigger routine flow: press Run routine and receive the next action. Routines must not become renamed templates, recurring tasks, a project system, or another configuration-heavy area. Defer this phase if it risks the core Now/Board/Calendar experience.

## Implementation record

- Added Routines as a secondary utility route while keeping Now, Board, and Calendar as the three primary work views.
- Added a compact editor with a name and one action per line. There are no schedules, automated triggers, parser tokens, task generation, categories, or project fields.
- Running a routine replaces management UI with exactly one current action, its position, `Done — next action`, and `Stop routine`. The final action becomes `Finish routine`.
- Run progress is session-only and creates no completion history, streak, penalty, or persisted failure state.
- Routine definitions use a separate `tidyline:routines` schema-version-1 envelope. They do not alter task schema version 4 and are not migrated from removed templates.
- Normalization preserves order, strips task/template fields, filters malformed actions independently, caps newly entered routines at 50 actions with visible validation, and refuses unknown/future storage shapes without overwriting them.
- Added automatic focus for the current action, native controls, responsive one-column layouts, and existing reduced-motion behavior.

## Verification

`npm run check` passes lint, production build, active-surface rendering, Phases 1–7 smoke coverage, and parser tests. Phase 7 coverage verifies migration, normalized routine/step fields, ordered progression, safe completion, malformed storage rejection, and future-schema rejection. Live browser interaction testing remains blocked by the desktop runtime’s trusted-component initialization error and is retained in Phase 8.

Suggested commit message: `feat: add lightweight ordered routines`
