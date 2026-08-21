# TidyLine project working memory

Updated: 2026-08-21
Repository: `C:\Users\Bilal\Desktop\Developer Files\tidyline-web`
Branch: `refactor/adhd-first-time-awareness`
Audited commit: `0407ea0` (`Merge pull request #10 from bilal-rauf-dev/feat/editorial-dashboard-redesign`)

## Product purpose

TidyLine is a local-first, deadline-driven task manager. A task is organized by how soon its deadline is, with Today through Later buckets, plus separate Upcoming, Overdue, Someday / Maybe, Calendar, Day Planner, Analytics, Settings, reminders, recurrence, templates, saved filters, workload awareness, and an end-of-day review.

There is no backend or account system. Task and preference data live in browser `localStorage`; attachments are URL references rather than uploaded files.

## Active refactor direction

The current work is a staged product and architecture refactor, not a visual-only redesign. The target is a smaller local-first tool for time blindness: TidyLine should learn how long tasks actually take, derive when they need to start, and present one useful next action with minimal decision-making. The requested sequence is Phase 1 audit, Phase 2 surface reduction, Phase 3 calibration foundation, Phase 4 time-blindness model, Phase 5 Now view, Phase 6 reminders/PWA/ICS, Phase 7 routines, and Phase 8 polish. Phase 1 is complete; Phase 2 awaits user approval. Only one phase should be active at a time; no commits or PRs are made by the agent.

## Runtime and structure

- React 19 + Vite 8, JavaScript/JSX, ES modules, wouter routing, chrono-node natural-language date parsing.
- Entry point: `src/main.jsx`; application shell and route wiring: `src/App.jsx`.
- Routes: `/`, `/board`, `/calendar`, `/planner`, `/someday`, `/analytics`, `/settings`.
- Central task state: `src/hooks/useTasks.js` (484 lines; persistence, normalization, CRUD, recurrence materialization, reminders, bulk actions, undo, maintenance tick).
- UI is split across `src/pages`, `src/components`, and `src/hooks`; derived business rules are mostly in `src/utils`.
- Styling is concentrated in `src/App.css` (about 5.5k lines) with global tokens and theme/density rules in `src/index.css`.
- Browser integrations: notifications and service worker (`src/utils/notifications.js`, `src/hooks/useReminderNotifications.js`, `public/sw.js`), browser audio, file import/export, local keyboard shortcuts, drag/drop and pointer interactions.

## Persistence keys

- `tidyline:tasks`
- `tidyline:profile`
- `tidyline:theme`, `tidyline:accent`, `tidyline:density`
- `tidyline:bucket-order`
- `tidyline:task-templates`
- `tidyline:saved-filters`
- `tidyline:notificationSound`
- `tidyline:confirm-delete`, `tidyline:overload-hours`

## Current task model

`normalizeTask` currently emits: `id`, `title`, `deadline`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `checklist`, `links`, `attachments`, `startDate`, `energyLevel`, `plannedDate`, `originalDeadline`, `postponeHistory`, `scheduledStart`, `status`, `waitingFor`, `followUpDate`, and `createdAt`.

Important behavioral contracts from `design.md`:

- Overdue is a separate rendered section, not a bucket.
- A future `startDate` keeps a task out of normal buckets until its start date.
- `plannedDate` promotes a task into Today without rewriting its real deadline.
- Recurring tasks materialize one next instance when completed; progress state resets.
- Relative reminders resolve against the deadline at check time.
- Date arithmetic is centralized in `src/utils/dates.js`.
- Waiting tasks are blocked rather than completed and automatically release at follow-up date.
- Postponement history is append-only and records only later deadline moves.
- Time blocking is additive through `scheduledStart`; it does not change deadline bucketing.

## Verified audit findings

### P1 — priority is currently parser-only

`src/utils/parseNaturalTask.js` recognizes `!high`, `!medium`, `!low`, and `p1`/`p2`/`p3`. Quick Add previews the detected priority and `App.jsx` forwards it into the full-form URL. However:

- `normalizeTask` does not store a `priority` field.
- Quick Add's direct `onAddTask` payload omits `priority`.
- `TaskForm` does not consume or submit the `priority` URL/detail value.
- The task model, filters, sorting, and cards have no priority support.

This is a real end-to-end data-loss path, not just a missing visual. Decide whether priority should be restored as a first-class feature or removed consistently from parser/UI/docs; the README currently promises priority parsing.

### P1 — full-form Quick Add handoff loses `plan today`

The Quick Add shift+Enter path forwards `planForToday`. `BoardPage` converts it into `prefilledDetails.plannedDate`, but `TaskForm` neither initializes `plannedDate` in `createEmptyDetails()` nor includes it in the `onAddTask` payload. The flag is therefore lost when the user chooses the full form.

### P1 — repository check is not green

Baseline results from this audit:

- `npm run build`: passes.
- `npx eslint src scripts`: passes.
- `npm run phase1-smoke`: passes.
- `npm run phase2-smoke`: passes.
- `npm run phase3-smoke`: passes.
- `npm run parser-tests`: passes, 44/44.
- `npm run smoke`: fails two stale assertions: App shell expects markers that are behind the new profile/welcome flow, and HomePage expects `Review the day`, which belongs to the sidebar shell rather than HomePage.
- `npm run check`: fails at the top-level lint because the pre-existing untracked `.logic-tests/logic-tests.js` contains `process` without a Node global declaration. The source/scripts-only lint passes.

The `.logic-tests/` directory is untracked and appears to be a generated bundle with copied assets and a large test harness. Preserve it as user-owned until its purpose is confirmed. Running the generated parser smoke build also leaves `.parser-tests/parser-tests.js` marked modified in Git status even though its lines match `HEAD`; do not discard that status blindly.

### P2 — import/load normalization is fragile for malformed data

`normalizeReminder` assumes any non-string reminder is a non-null object. `loadTasks()` catches the whole parse/normalization operation and returns an empty list on any exception, so one malformed stored task can make all locally stored tasks disappear from the in-memory view. `parseImportedTasks()` validates only the outer task shape, and `importTasks()` maps directly through `normalizeTask`, so malformed nested values can throw during import. Harden normalization and add regression coverage before expanding the import format.

### P2 — current test coverage is render-oriented, not interaction-oriented

The smoke suite renders pages under Node and the phase/parser scripts exercise utilities. It does not test browser interactions, keyboard/focus behavior, drag/drop, notification permission/service-worker flows, localStorage quota/error behavior, import/export UX, or responsive layout. A real-browser pass is still required before calling the product stable.

## Recommended work sequence

1. Confirm the product decision on priority; if retained, add it to normalization, creation/editing, import/export compatibility, filters/sort, cards, and tests as one vertical slice.
2. Fix the Quick Add full-form handoff for `plannedDate` and any other parsed fields, with a round-trip test for direct and full-form creation.
3. Repair the smoke harness to seed a completed local profile and assert shell/page ownership correctly; exclude or properly configure generated `.logic-tests` output so `npm run check` is meaningful.
4. Harden task/import normalization with a versioned or explicitly validated boundary and tests for malformed nested records.
5. Add browser-level interaction coverage, then perform visual/accessibility/responsive review across the seven routes and both themes.

## Working conventions

- Preserve existing user changes, especially the untracked `.logic-tests/` directory, until explicitly understood.
- Keep date logic in the existing utility layer; do not duplicate timezone/day arithmetic in components.
- Treat `design.md` as a behavioral contract, not merely a visual reference.
- Prefer small vertical slices with utility tests plus a browser-facing check when behavior crosses state, URL, and UI boundaries.
