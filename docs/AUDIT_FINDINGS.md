# TidyLine audit findings

Updated: 2026-09-20. The audit covered the tracked project files, including source, scripts, configuration, assets, and generated output. This file keeps the main findings available for later implementation decisions; the work order and acceptance criteria live in `IMPROVEMENT_PLAN.md`.

## Browser access and reminders

- Guest mode runs in a browser, but task data is local to that browser. Cross-device planning requires a configured Supabase backend and sign-in (`src/hooks/useAuth.js`, `src/hooks/useTasks.js`).
- Public browser configuration now rejects Supabase secret and service-role keys. A startup schema check prevents sign-in when the connection exists but the required task tables are missing. The configured backend exposes both tables and the guarded atomic replacement function. A user-authenticated browser test confirmed sign-in, the migration prompt, reload persistence, logout isolation, and data restoration after signing back in.
- Open-page reminder scheduling remains in `src/hooks/useReminderNotifications.js`. WEB-01 now adds the closed-page Web Push path, including subscriptions, server scheduling, deduplication, retries, delivery state, and service-worker handling. Deployment configuration and real-device delivery tests remain.
- iOS and iPadOS Web Push requires a Home Screen web app. A regular Safari tab must still offer useful planning and truthful reminder guidance.
- The original audit found no offline asset cache. WEB-02 now precaches the production shell and assets and falls back to it for network exceptions and HTTP errors. A real in-app browser reload previously failed while the preview server was stopped, so ordinary browser retesting remains.

## Data safety and sync

- Invalid local task data and malformed imports previously risked silently presenting an empty workspace or dropping records (`src/hooks/useTasks.js`, `src/utils/tasksIO.js`). REL-01 added recovery and review.
- Signed-in writes previously ran in the background with no durable retry queue. REL-02 now has a browser-stored operation queue, but needs a live interruption and multi-device test.
- Cloud replacement previously deleted every account task before inserting the replacement (`src/utils/supabaseStorage.js`). REL-03 adds a transactional database function; the backend migration must be applied and tested.
- Clean account views refetch on focus and every minute. Task edits and deletes now carry the database revision last seen by that browser, so a stale device cannot silently overwrite a newer row. Conflicting local edits are preserved as labelled copies while stale deletes retain the newer account version. The revision migration and a live two-device test remain.
- Local-to-account migration now offers an additive merge when the remote account already has tasks. Same-ID divergent local tasks become separate copies; device and backend tests remain.

## Interaction and planner quality

- Several task moves and duration changes originally relied on drag interactions. WEB-03 added explicit Day planner and Calendar controls; touch and keyboard equivalents still need a full device pass.
- Dialogs now share focus containment, focus return, Escape handling, and background-scroll locking; browser-level accessibility checks remain.
- Explicit Quick Add due times now survive creation and sync, appear in the preview and task surfaces, and drive relative reminders. The database migration, Edge Function redeployment, and a live timed reminder still need verification.
- Calendar workload redistribution now applies confirmed moves through the durable task update and sync path. A browser confirmation check remains.
- Quick Add priority now has an end-to-end task field, including forms, display, filters, sorting, templates, local persistence, and cloud mapping. The full-form handoff now preserves `plan today`, exposes it for review, and prevents plans that are waiting or start in the future. The priority database migration and live browser checks remain.
- Completion analytics now convert timestamps to the user's local calendar day and use the actual completion date in the activity heatmap. Recurring tasks now skip missed overdue instances without drifting after short months or leap years; the rules and automated edge-case evidence are recorded in `RECURRENCE_RULES.md`.

## Repository health

- Tracked generated test output was removed, and test-output folders are ignored so repository-wide lint and reviews stay focused on source files.
- The README and page title now describe the current product. The stale interface screenshot and unused starter assets were removed instead of continuing to publish misleading product imagery.
- Unit and smoke scripts cover recovery, durable sync behavior, offline fallback, reminder rules, and planner logic. An isolated browser pass also covers guest persistence and Command Palette keyboard containment. Physical-device tests for offline recovery, two-device sync, notification delivery, touch, zoom, and screen readers are still needed.
