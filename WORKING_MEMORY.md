# TidyLine project working memory

Updated: 2026-08-21
Repository: `C:\Users\Bilal\Desktop\Developer Files\tidyline-web`
Branch: `refactor/adhd-first-time-awareness`
Baseline commit: `0407ea0`

## Current objective

Refactor TidyLine into a small, local-first tool for ADHD-oriented time awareness. The north star is: what needs doing, when must it start, and what should happen now. Work one phase at a time; do not commit or open a PR. Phase 2 is complete pending user review. Phase 3 must not begin without approval.

## Current architecture

- React 19 + Vite 8, JavaScript/JSX, wouter, chrono-node.
- Entry: `src/main.jsx`; shell/routes: `src/App.jsx`.
- Primary routes: `/` (Now), `/board`, `/calendar`. Utility route: `/settings`. Unknown routes redirect to Now.
- Central state: `src/hooks/useTasks.js`; normalization/migration: `src/utils/taskMigration.js`; storage envelope/import/export: `src/utils/tasksIO.js`.
- Primary work views are Now, Board, and Calendar. Now is intentionally provisional until Phases 3–5 establish calibrated timing.

## Persisted state

Active keys:

- `tidyline:tasks` — schema envelope version 2
- `tidyline:profile`
- `tidyline:theme`, `tidyline:accent`, `tidyline:density`
- `tidyline:notificationSound`
- `tidyline:confirm-delete`

On load, removed configuration keys are cleaned up. Old top-level task arrays remain readable.

Normalized task fields:

`id`, `title`, `deadline`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `checklist`, `links`, `createdAt`.

Migration preserves meaningful legacy data before dropping deprecated keys: attachment URL records become links, and blocked-state owner/follow-up details become notes plus a `waiting` tag. Malformed nested records are filtered independently so one bad item does not hide all local tasks.

## Active behavior contracts

- Board horizons are fixed: Today (through day 0), This Week (1–7), This Month (8–30), Later (31+ or no deadline).
- Drag targets use offsets 0, 1, 8, and 31 days.
- Pinned tasks sort first, then open before completed, then by deadline.
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

## Verification and known gaps

`npm run check` is the phase gate. It covers lint, production build, SSR surface rendering, horizon boundaries, migration, recurrence/reminders, task update semantics, and Quick Add parsing. A real-browser interaction and responsive/accessibility pass remains necessary in Phase 8.

The pre-existing untracked `.logic-tests/` directory is user-owned and ignored by lint/build. Do not delete or overwrite it.

## Next phase boundary

Phase 3 adds only the calibration foundation: `startedAt`, `actualMinutes`, completion feedback, and a bounded calibration multiplier with tested fallback behavior. Do not add derived `startBy`, Now scoring, workload UI, routines, PWA work, or ICS in Phase 3.
