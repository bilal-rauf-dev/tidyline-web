# TidyLine browser-first improvement plan

Updated: 2026-09-18. This plan records the findings from the read-only audit and is the reference for implementation work. Complete items in order; update status and verification evidence when each item is done.

## Product target

TidyLine must work as a useful planner in an ordinary mobile, tablet, or desktop browser without installation. Task data must survive connection failures and move reliably between a user's signed-in devices. Reminders must describe their actual delivery capability in each browser.

Web Push on iPhone and iPad currently requires the user to add the web app to the Home Screen. Browser-tab planning must remain functional without that step. Do not promise background push in an ordinary iOS browser tab. See [WebKit's platform guidance](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Work items

| ID | Priority | Status | Outcome and acceptance criteria |
| --- | --- | --- | --- |
| REL-01 | Critical | Complete | Import and local loading never silently erase existing tasks. Invalid records are reported, original data remains recoverable, and replacement requires a review step. |
| REL-02 | Critical | In progress | Signed-in edits persist locally before network submission, retry after failure, and show durable sync status. Refresh during an outage retains pending edits. |
| REL-03 | Critical | In progress | Cloud import and undo replacement are atomic or otherwise recoverable. An insert failure cannot follow a successful delete of all account tasks. |
| REL-04 | High | Planned | Account data converges on two open devices, with defined merge/conflict behavior and a migration path for local tasks even when the account already has tasks. |
| WEB-01 | Critical | Planned | Scheduled reminders reach supported devices while the page is closed via Web Push. Permission, subscription, delivery, and failures are visible. |
| WEB-02 | High | In progress | Previously visited routes and core assets reload offline; the app shows offline and pending-sync state. |
| WEB-03 | High | Planned | Every core task and planner action has visible touch and keyboard controls. Drag is optional. |
| WEB-04 | High | Planned | Dialog focus is contained and restored; mobile controls, zoom, and screen-reader behavior pass the device matrix. |
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
- REL-02: The per-account task snapshot and pending operations are stored together before network submission. Unit checks cover replay, acknowledgement, account separation, and storage failure. A live Supabase account and two-device outage test are still needed before completion.
- REL-03: The client now calls the transactional `replace_user_tasks` function in `supabase_migrations/20260918_atomic_task_replace.sql`. Apply that migration to each backend before using cloud import or undo. A live rollback test with a forced insert error remains.
- WEB-02: Returning guests now reopen their saved workspace directly, and the signed-in queue reports pending changes. Asset and route caching is still absent.
- QUAL-02: The README now describes actual sync/offline/reminder behavior and the page title is TidyLine. Tracked generated output and the preview image still need review.

This checkout has no configured Supabase backend, so cloud delivery, conflicts, and two-device convergence have not been exercised here. Real mobile notification behavior also remains unverified.
