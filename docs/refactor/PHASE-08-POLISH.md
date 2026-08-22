# Phase 8 — Polish and delivery

Status: Automated gate complete; live browser review pending

Automated review completed:

- Added `scripts/phase8-smoke.js` and wired it into `npm run check`. It verifies calibrated start timing, derived attention dates, Now eligibility, and malformed legacy nested data without allowing deprecated fields to leak through the normalized task boundary.
- Extended workspace JSON export/import with an optional `routines` section. Existing task-only backups remain valid, routine definitions remain isolated, and the task schema remains version 4.
- Audited focus-visible styles, reduced-motion behavior, touch-target sizing, mobile layout rules, and routine stacking. Added mobile tap-highlight cleanup.
- Audited stale product references and unused legacy surface names. Historical migration fixtures and storage cleanup keys remain intentionally retained because they protect existing local data.
- Updated the working memory, README, design contract, and phase plan to describe the shipped routine backup behavior and current delivery state.
- `npm run check` passes lint, production build, all render and phase smoke tests, and parser tests.

Remaining delivery check:

- The live browser review at 375px, 390px, 414px, 1280px, and 1920px is not yet complete. The in-app browser runtime fails during trusted dependency initialization with `Trusted RPC dependency must resolve within a configured trusted code path` before it can discover or inspect `http://localhost:5173/`. This is an environment/runtime blocker, not an application-page error.

Suggested commit message: `polish: finish ADHD-first time-awareness refactor`
