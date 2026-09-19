# TidyLine audit findings

Updated: 2026-09-19. The audit covered the tracked project files, including source, scripts, configuration, assets, and generated output. This file keeps the main findings available for later implementation decisions; the work order and acceptance criteria live in `IMPROVEMENT_PLAN.md`.

## Browser access and reminders

- Guest mode runs in a browser, but task data is local to that browser. Cross-device planning requires a configured Supabase backend and sign-in (`src/hooks/useAuth.js`, `src/hooks/useTasks.js`).
- Public browser configuration now rejects Supabase secret and service-role keys. A startup schema check prevents sign-in when the connection exists but the required task tables are missing. The configured backend now exposes both tables and the guarded atomic replacement function; signed-in persistence still needs a user-authenticated device test.
- Current reminder scheduling runs in page JavaScript (`src/hooks/useReminderNotifications.js`). A closed page cannot deliver the promised reminder. Background push needs a service worker, server-side scheduling, subscriptions, retry handling, and device testing.
- iOS and iPadOS Web Push requires a Home Screen web app. A regular Safari tab must still offer useful planning and truthful reminder guidance.
- The original audit found no offline asset cache. WEB-02 now precaches the production shell and assets, but a real in-app browser reload still failed while the preview server was stopped. Do not claim offline reload works until ordinary browser tests pass.

## Data safety and sync

- Invalid local task data and malformed imports previously risked silently presenting an empty workspace or dropping records (`src/hooks/useTasks.js`, `src/utils/tasksIO.js`). REL-01 added recovery and review.
- Signed-in writes previously ran in the background with no durable retry queue. REL-02 now has a browser-stored operation queue, but needs a live interruption and multi-device test.
- Cloud replacement previously deleted every account task before inserting the replacement (`src/utils/supabaseStorage.js`). REL-03 adds a transactional database function; the backend migration must be applied and tested.
- Clean account views now refetch on focus and every minute, but simultaneous edits to the same task still have no version check. REL-04 needs a server conflict policy and a live two-device test.
- Local-to-account migration now offers an additive merge when the remote account already has tasks. Same-ID divergent local tasks become separate copies; device and backend tests remain.

## Interaction and planner quality

- Several task moves and duration changes originally relied on drag interactions. WEB-03 added explicit Day planner and Calendar controls; touch and keyboard equivalents still need a full device pass.
- Dialog focus containment and focus return need browser-level checks.
- Quick Add parses due times, but downstream task creation can reduce them to dates. Relative reminders then use a default deadline hour instead of the user's intended time.
- Calendar workload redistribution describes proposed moves that do not yet change the tasks.
- Quick Add priority and the full-form plan-today path need end-to-end verification. Analytics and recurrence calculations need local-date and month-end checks.

## Repository health

- The repository includes tracked generated test output. It caused repository-wide lint to inspect bundles until ESLint exclusions were added; removing tracked output remains useful cleanup.
- The README and page title were stale. They were corrected in this pass; the preview image still needs review.
- Unit and smoke scripts cover several planner rules, but browser tests for offline, sync, notification delivery, touch, and accessibility are still needed.
