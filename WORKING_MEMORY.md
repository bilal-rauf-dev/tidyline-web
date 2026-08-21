# TidyLine project working memory

Updated: 2026-08-21
Repository: `C:\Users\Bilal\Desktop\Developer Files\tidyline-web`
Branch: `refactor/adhd-first-time-awareness`
Baseline commit: `0407ea0`

## Current objective

Refactor TidyLine into a small, local-first tool for ADHD-oriented time awareness. The north star is: what needs doing, when must it start, and what should happen now. Work one phase at a time; do not commit or open a PR. Phase 4 is complete pending user review. Phase 5 must not begin without approval.

## Current architecture

- React 19 + Vite 8, JavaScript/JSX, wouter, chrono-node.
- Entry: `src/main.jsx`; shell/routes: `src/App.jsx`.
- Primary routes: `/` (Now), `/board`, `/calendar`. Utility route: `/settings`. Unknown routes redirect to Now.
- Central state: `src/hooks/useTasks.js`; normalization/migration: `src/utils/taskMigration.js`; storage envelope/import/export: `src/utils/tasksIO.js`.
- Primary work views are Now, Board, and Calendar. Now is intentionally provisional until Phases 3–5 establish calibrated timing.

## Persisted state

Active keys:

- `tidyline:tasks` — schema envelope version 4
- `tidyline:profile`
- `tidyline:theme`, `tidyline:accent`, `tidyline:density`
- `tidyline:notificationSound`
- `tidyline:confirm-delete`

On load, removed configuration keys are cleaned up. Old top-level task arrays remain readable.

Normalized task fields:

`id`, `title`, `deadline`, `resurfaceDate`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `startedAt`, `actualMinutes`, `checklist`, `links`, `createdAt`.

Migration preserves meaningful legacy data before dropping deprecated keys: attachment URL records become links, and blocked-state owner/follow-up details become notes plus a `waiting` tag. Malformed nested records are filtered independently so one bad item does not hide all local tasks.

## Active behavior contracts

- Board horizons are fixed: Today (through day 0), This Week (1–7), This Month (8–30), Later (31+ or no attention date), classified from derived attention timing for open tasks.
- Drag targets use offsets 0, 1, 8, and 31 days.
- Pinned tasks sort first, then open before completed, then by attention date and deadline.
- Relative reminders resolve against the current deadline.
- Recurrence creates the next instance after completion.
- Browser reminders are only promised while TidyLine is active.
- Quick Add parses deadlines, tags, duration, reminders, and recurrence. Unrecognized tokens remain title text.

## Phase 2 changes

- Removed obsolete routes, pages, components, hooks, utilities, parser outputs, command actions, and preference UI.
- Reduced navigation to Now, Board, and Calendar; retained Settings as a utility route.
- Replaced configurable buckets with deterministic horizons.
- Added defensive schema migration and import validation.
- Replaced stale tests with boundary, migration, retained-core, parser, and active-surface smoke coverage.
- Updated README and design contract to match shipped behavior.

## Phase 3 changes

- Added reload-safe Start/Pause/Resume timing using `startedAt` plus accumulated `actualMinutes`; no session-history or timer subsystem was added.
- Completion finalizes active elapsed time and can show neutral estimate-versus-actual feedback.
- Recurring instances and duplicates reset timing; bulk completion closes active intervals.
- Added `src/utils/calibration.js` as the canonical duration boundary.
- Global calibration requires three valid completed samples, uses a bounded median ratio (0.5×–4×), and ignores invalid/runaway data.
- Unestimated work uses median valid completed duration, then a 45-minute fallback; it never counts as zero.
- Settings shows learned calibration read-only. Tag-specific calibration is deliberately deferred.

## Verification and known gaps

`npm run check` is the phase gate. It covers lint, production build, SSR surface rendering, horizon boundaries, migration, recurrence/reminders, task update semantics, and Quick Add parsing. A real-browser interaction and responsive/accessibility pass remains necessary in Phase 8.

The pre-existing untracked `.logic-tests/` directory is user-owned and ignored by lint/build. Do not delete or overwrite it.

## Phase 4 changes

- Added `src/utils/timeAwareness.js` for derived start timing, attention dates, fit language, concrete future distance, deterministic capacity, and per-day canonical workload.
- `startBy` is derived from planning deadline minus canonical expected duration and a fixed 30-minute buffer; it is never persisted or configured.
- Today automatically includes due/missed starts, start-today, active, and resurfaced tasks.
- `resurfaceDate` is the only new persisted Phase 4 field; schema version is 4, and dates after the deadline normalize to null.
- Cards, details, provisional Now, and sidebar search use start-oriented language. Now ordering uses attention date but final rotation/actions remain Phase 5.
- Calendar has a continuous 21-day calibrated-work ribbon plus start markers in the month grid. The manual Planner remains removed.
- Fit outcomes use six hours of deterministic daily capacity and earlier committed calibrated work; no score or setting exists.

## Next phase boundary

Phase 5 turns Now into the final low-decision surface: one selected task with Done, 5 more minutes, and Not this, using an internal deterministic selection order. Do not add timer dashboards, expose scores, or begin routines/PWA/ICS.
