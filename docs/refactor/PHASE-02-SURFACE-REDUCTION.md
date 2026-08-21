# Phase 2 — Remove unnecessary surface area

Status: Planned

Remove or merge Analytics, Energy, Saved Views, Templates, configurable buckets, Attachments, Waiting/follow-up, Priority, the multi-factor risk score, Someday, and unnecessary dashboard/planner concepts according to the Phase 1 dependency map.

Target primary navigation: Now, Board, Calendar. Keep only concepts that directly support deadline awareness, calibrated start timing, or immediate action. Add migration before changing the persisted shape, then update parser tests, smoke tests, README, and design documentation. Exit only when there are no dead routes, imports, UI labels, or persistence keys for removed concepts.

Suggested commit message: `refactor: reduce TidyLine to deadline-first surfaces`
