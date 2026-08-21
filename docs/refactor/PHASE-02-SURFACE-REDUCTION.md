# Phase 2 — Remove unnecessary surface area

Status: Complete

Remove or merge Analytics, Energy, Saved Views, Templates, configurable buckets, Attachments, Waiting/follow-up, Priority, the multi-factor risk score, Someday, and unnecessary dashboard/planner concepts according to the Phase 1 dependency map.

Target primary navigation: Now, Board, Calendar. Keep only concepts that directly support deadline awareness, calibrated start timing, or immediate action. Add migration before changing the persisted shape, then update parser tests, smoke tests, README, and design documentation. Exit only when there are no dead routes, imports, UI labels, or persistence keys for removed concepts.

Suggested commit message: `refactor: reduce TidyLine to deadline-first surfaces`

## Implementation record

- Primary navigation and routes are Now, Board, and Calendar; Settings remains a utility route.
- Board horizons are fixed at Today, This Week, This Month, and Later. Undated tasks migrate into Later rather than disappearing.
- The normalized task record was reduced to the 16 retained fields documented in `design.md`.
- Storage now uses schema envelope version 2 while still accepting legacy arrays.
- Legacy attachment references migrate to links. Legacy blocked owner/follow-up information migrates to notes and a tag before old keys are removed.
- Old configuration preference keys are removed during task-state initialization.
- Quick Add now extracts only deadlines, tags, duration, reminders, and recurrence.
- Removed pages, components, hooks, utilities, routes, commands, styling, tests, and documentation were cleaned up together.

## Verification gate

- `npm run lint`
- `npm run build`
- active-surface SSR smoke checks
- fixed horizon boundary checks
- malformed and legacy migration checks
- retained recurrence/reminder/task-update checks
- reduced parser checks

The complete gate is `npm run check`.
