# TidyLine audit findings

Updated: 2026-09-18. The audit covered the tracked project files, including source, scripts, configuration, assets, and generated output. This file keeps the main findings available for later implementation decisions; the work order and acceptance criteria live in `IMPROVEMENT_PLAN.md`.

## Browser access and reminders

- Guest mode runs in a browser, but task data is local to that browser. Cross-device planning requires a configured Supabase backend and sign-in (`src/hooks/useAuth.js`, `src/hooks/useTasks.js`).
- Current reminder scheduling runs in page JavaScript (`src/hooks/useReminderNotifications.js`). A closed page cannot deliver the promised reminder. Background push needs a service worker, server-side scheduling, subscriptions, retry handling, and device testing.
- iOS and iPadOS Web Push requires a Home Screen web app. A regular Safari tab must still offer useful planning and truthful reminder guidance.
- There is no service worker or offline asset cache. A previously visited route may fail to reload without a connection, despite the former README wording.

## Data safety and sync

- Invalid local task data and malformed imports previously risked silently presenting an empty workspace or dropping records (`src/hooks/useTasks.js`, `src/utils/tasksIO.js`). REL-01 added recovery and review.
- Signed-in writes previously ran in the background with no durable retry queue. REL-02 now has a browser-stored operation queue, but needs a live interruption and multi-device test.
- Cloud replacement previously deleted every account task before inserting the replacement (`src/utils/supabaseStorage.js`). REL-03 adds a transactional database function; the backend migration must be applied and tested.
- Separate devices do not yet receive live changes or resolve conflicts. A second device can overwrite an edit made on the first; REL-04 needs a clear version and merge policy.
- Local-to-account migration is offered only when the remote account is empty. Users with tasks in both places need a reviewed merge path.

## Interaction and planner quality

- Several task moves and duration changes rely on drag interactions. Touch and keyboard equivalents need a full pass across Board, Calendar, and Day planner.
- Dialog focus containment and focus return need browser-level checks.
- Quick Add parses due times, but downstream task creation can reduce them to dates. Relative reminders then use a default deadline hour instead of the user's intended time.
- Calendar workload redistribution describes proposed moves that do not yet change the tasks.
- Quick Add priority and the full-form plan-today path need end-to-end verification. Analytics and recurrence calculations need local-date and month-end checks.

## Repository health

- The repository includes tracked generated test output. It caused repository-wide lint to inspect bundles until ESLint exclusions were added; removing tracked output remains useful cleanup.
- The README and page title were stale. They were corrected in this pass; the preview image still needs review.
- Unit and smoke scripts cover several planner rules, but browser tests for offline, sync, notification delivery, touch, and accessibility are still needed.
