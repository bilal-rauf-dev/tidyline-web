# TidyLine browser-first improvement plan

Updated: 2026-09-20. This plan records the findings from the read-only audit and is the reference for implementation work. Complete items in order; update status and verification evidence when each item is done.

## Product target

TidyLine must work as a useful planner in an ordinary mobile, tablet, or desktop browser without installation. Task data must survive connection failures and move reliably between a user's signed-in devices. Reminders must describe their actual delivery capability in each browser.

Web Push on iPhone and iPad currently requires the user to add the web app to the Home Screen. Browser-tab planning must remain functional without that step. Do not promise background push in an ordinary iOS browser tab. See [WebKit's platform guidance](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Work items

| ID | Priority | Status | Outcome and acceptance criteria |
| --- | --- | --- | --- |
| REL-01 | Critical | Complete | Import and local loading never silently erase existing tasks. Invalid records are reported, original data remains recoverable, and replacement requires a review step. |
| REL-02 | Critical | In progress | Signed-in edits persist locally before network submission, retry after failure, and show durable sync status. Refresh during an outage retains pending edits. |
| REL-03 | Critical | In progress | Cloud import and undo replacement are atomic or otherwise recoverable. An insert failure cannot follow a successful delete of all account tasks. |
| REL-04 | High | In progress | Account data converges on two open devices, with defined merge/conflict behavior and a migration path for local tasks even when the account already has tasks. |
| WEB-01 | Critical | In progress | Scheduled reminders reach supported devices while the page is closed via Web Push. Permission, subscription, delivery, and failures are visible. |
| WEB-02 | High | In progress | Previously visited routes and core assets reload offline; the app shows offline and pending-sync state. |
| WEB-03 | High | In progress | Every core task and planner action has visible touch and keyboard controls. Drag is optional. |
| WEB-04 | High | In progress | Dialog focus is contained and restored; mobile controls, zoom, and screen-reader behavior pass the device matrix. |
| PLAN-01 | High | Planned | Natural-language due times are preserved, displayed before save, and used for relative reminders. |
| PLAN-02 | Medium | Planned | Calendar workload redistribution changes the proposed deadlines after confirmation. |
| PLAN-03 | Medium | Planned | Quick Add priority and full-form `plan today` have end-to-end behavior, or their unsupported promises are removed. |
| PLAN-04 | Medium | Planned | Completion-day analytics use local dates consistently; recurrence behavior has documented catch-up and month-end rules. |
| QUAL-01 | Medium | Planned | Browser-level checks cover data recovery, sync interruption, notifications, touch, keyboard, and responsive layouts. |
| QUAL-02 | Low | In progress | Remove tracked generated output, align README and preview with the current product, and correct the page title. |

## Working order

1. Protect task data: REL-01 through REL-04.
2. Deliver dependable browser behavior: WEB-01 through WEB-04.
3. Improve planner correctness: PLAN-01 through PLAN-04.
4. Keep release evidence and repository documentation current: QUAL-01 and QUAL-02.

Do not mark a work item complete from a static code check alone when its acceptance criteria require browser, network, or device behavior. Record remaining platform limits alongside verification results.

## Evidence and next checks

- REL-01: `task-data-tests` rejects malformed or duplicate task records; smoke tests render the recovery screen; a local browser showed import review and Cancel without replacing tasks. Guest task creation survived a page reload. Completed 2026-09-18.
- REL-02: The per-account task snapshot and pending operations are stored together before network submission. Unit checks cover replay, acknowledgement, account separation, and storage failure. A live account task persisted across reload, disappeared after sign-out, and returned after signing back in on 2026-09-19. A two-device outage and replay test is still needed before completion.
- REL-03: The client now calls the transactional `replace_user_tasks` function in `supabase_migrations/20260918_atomic_task_replace.sql`. Apply that migration to each backend before using cloud import or undo. A live rollback test with a forced insert error remains.
- REL-04: Clean account views now refetch on focus and every minute; a per-account browser cache updates other open tabs. Local task migration offers an additive merge even when the account has tasks. Same-ID, different-content local tasks become deterministic separate copies. The migration prompt appeared correctly during a live Google sign-in on 2026-09-19. This is not a server conflict protocol: concurrent edits to the same task can still overwrite each other, and multi-device convergence needs a live test.
- Backend setup, 2026-09-19: the configured browser-safe Supabase publishable key passed the Auth endpoint check, Google OAuth is enabled, both required tables answer through the public API, and the `replace_user_tasks` RPC is present with its anonymous access guard. The app detects missing tables, hides sign-in, and shows a setup-required message until the schema is ready. Development and production builds reject `sb_secret_` and legacy service-role keys in public `VITE_` variables. Google sign-in and signed-in task persistence passed a live account test; multi-device convergence remains open.
- WEB-01: The repository now includes per-device subscription storage with row-level security, explicit opt-in and disable controls, iPhone/iPad Home Screen guidance, a time-zone-aware scheduled Edge Function, deduplicated delivery records, retry handling, expired-endpoint cleanup, service-worker push display, and notification deep links. Open-page reminders remain the fallback and are suppressed while a background subscription is active. Apply `20260920_web_push.sql`, configure matching VAPID credentials, deploy `send-reminders`, and schedule it using `WEB_PUSH_SETUP.md`. Live closed-page delivery and device verification remain before completion.
- WEB-02: The production build injects a versioned app-shell cache into the service worker. Automated simulation restored a route and built asset offline and verified its cache-status message. The app shell now includes the web manifest in its eight core precache URLs. Navigation now falls back to the cached shell when the network throws or returns an HTTP error; the latter addresses the likely cause of the blank `/settings` reload seen when the preview server stopped on 2026-09-18. Ordinary browser and device tests are still required before completion.
- WEB-03: Board task edit already exposes due-date changes. Day planner now has start-time, duration, and remove controls outside the drag timeline. Calendar shows a move-date control for tasks on a selected day. In the in-app browser, scheduling, changing duration, and moving a due date succeeded; the controls remained reachable at 320px width. Touch, keyboard-only, screen-reader, and broader responsive tests are still needed.
- WEB-04: All six modal surfaces now share focus entry, Tab and Shift+Tab containment, Escape handling, background-scroll locking, and focus restoration. The dialog role now sits on the actual modal panel, and Quick Add scrolls within the viewport at high zoom or on short screens. Keyboard-only, screen-reader, zoom, and mobile device-matrix checks remain before completion.
- QUAL-02: The README now describes actual sync/offline/reminder behavior and the page title is TidyLine. Tracked generated output and the preview image still need review.

The configured Supabase backend has passed sign-in and single-browser persistence checks. Background push deployment, cloud conflict handling, two-device convergence, and real mobile notification behavior remain unverified.
