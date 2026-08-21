# Phase 1 — Audit and architecture

Status: Complete; Phase 2 pending user approval

## Purpose

Build an evidence-backed map of the current product before removing concepts. This phase changes documentation only; it does not delete routes, fields, or features.

## Verified runtime inventory

### Routes and navigation

Current wouter routes in `src/App.jsx`:

- `/` → `HomePage`
- `/board` → `BoardPage`
- `/calendar` → `CalendarPage`
- `/planner` → `PlannerPage`
- `/someday` → `SomedayPage`
- `/analytics` → `AnalyticsPage`
- `/settings` → `SettingsPage`

Current sidebar navigation has Home, Board, Calendar, Day planner, Someday / Maybe, Analytics, and Settings. The shell also exposes command palette, task search, collapse/drawer behavior, and end-of-day review.

### State and persistence

`useTasks` is the central state boundary. It loads and normalizes `tidyline:tasks`, persists the whole task array, runs a minute maintenance pass, and owns creation, editing, completion, recurrence materialization, drag rescheduling, reminders, checklists, links, attachments, bulk actions, import, and undo.

Other persistence owners are `useProfile`, `useTheme`, `useBucketConfig`, `useTemplates`, `useSavedFilters`, `App.jsx` preference keys, and notification sound utilities. There is no backend or shared data layer.

### Current task fields

`normalizeTask` currently emits:

`id`, `title`, `deadline`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `checklist`, `links`, `attachments`, `startDate`, `energyLevel`, `plannedDate`, `originalDeadline`, `postponeHistory`, `scheduledStart`, `status`, `waitingFor`, `followUpDate`, `createdAt`.

Notable current semantics:

- `startDate` gates Board visibility and is manually maintained.
- `plannedDate` promotes a task into Today without changing its deadline.
- `status: waiting` and `followUpDate` are a separate blocked workflow.
- `postponeHistory` feeds analytics and the multi-factor risk score.
- `scheduledStart` feeds the Day planner and Home timeline.
- `duration` is an estimate, but there is no `startedAt`, `actualMinutes`, or session history.
- `priority` is parsed and previewed but is not normalized or persisted; this is a partial/dead feature.

### Creation and editing flows

- Board `TaskForm`: full task creation, templates, reminders, tags, notes, checklist, links, attachments, location, duration, recurrence, start date, energy, waiting, and archive-on-create.
- Quick Add modal: natural-language title/deadline plus parser tokens for tags, duration, reminders, recurrence, start date, plan-for-today, energy, and priority; direct create or shift+Enter full-form handoff.
- Task card/detail dialog: completion, pin, edit, duplicate, archive, delete, recurrence, reminders, checklist, links, attachments, and field editing.
- Calendar: drag-to-reschedule and add-on-date flow.
- Planner: drag/resize/remove scheduled blocks.
- Someday: undated task creation and later promotion.
- Settings: profile, appearance, sound, bucket configuration, workload threshold, delete confirmation, templates, import/export, and clear completed.

### Business utilities

- Date/bucket classification: `dates.js`, `calendar.js`, `buckets.js`, `overdue.js`.
- Parsing: `parseNaturalTask.js` using chrono-node.
- Reminder/recurrence: `reminders.js`, `recurrence.js`, `notifications.js`.
- Workload/risk: `workload.js`, `risk.js`.
- Product metrics: `analytics.js`, `timeline.js`.
- Filtering/tagging: `filters.js`, `fuzzy.js`, `tags.js`.
- Data normalization/import: `taskFields.js`, `tasksIO.js`.

### Browser/system integrations

- Page-level reminder polling every 15 seconds; optional service worker hosts notification actions.
- Browser notification permission is requested when reminders are added.
- Browser audio chime is synthesized locally.
- JSON import/export uses FileReader, Blob, and a download link.
- `public/sw.js` does not cache or push-sync; it only forwards notification actions to an open page.

### Test and documentation baseline

- `npm run build`: passes.
- `npx eslint src scripts`: passes.
- Phase 1/2/3 custom smoke scripts: pass.
- Parser tests: 44/44 pass, but they currently cover syntax that this refactor will remove.
- General SSR smoke: two stale marker failures caused by the profile/welcome shell and Home/sidebar ownership.
- `npm run check`: not green because root lint scans the pre-existing untracked `.logic-tests/logic-tests.js`, and the generated smoke assertions are stale.
- `README.md` describes the current feature-heavy product; `design.md` contains both visual rules and behavioral data contracts and must be updated only after the target behavior is implemented.

## Removal dependency map for Phase 2

| Concept | Primary owners | Downstream references to remove or migrate |
| --- | --- | --- |
| Analytics | `AnalyticsPage`, `analytics.js`, sidebar/App route | Home metrics, smoke markers, docs, completion/streak language |
| Energy | parser, Quick Add, TaskDraftDetails, TaskDetails, filters, risk, task normalization | `energyLevel` persistence and migration handling |
| Saved views | `useSavedFilters`, `SavedFilterBar`, BoardPage, App wiring | persistence key, settings/docs if any |
| Templates | `useTemplates`, `TemplateSettings`, TaskForm | `task-templates` key and template imports |
| Configurable buckets | `useBucketConfig`, `BucketConfigMenu`, Settings, bucket helpers | bucket order persistence and route props |
| Attachments | `TaskDetails`, `TaskDraftDetails`, useTasks, tasksIO shape | attachment links must not be confused with ordinary links |
| Waiting/follow-up | task normalization, Board filters, risk/workload, TaskDetails/forms | old status/date mapping must remain non-destructive |
| Priority | parser, Quick Add, URL handoff only | remove parser tests/tokens and stale documentation |
| Risk score | `risk.js`, TaskCard, phase3 tests, docs | replace only after canonical fit logic exists |
| Someday/planner/dashboard | routes, sidebar, Home, Calendar, Planner, timeline utilities | preserve compatible task data while reducing navigation |

## Migration constraints

The old flat task array is unversioned. Migration must preserve, where compatible, title, deadline, tags, notes, checklist, ordinary links, location, recurrence, reminders, completion state, and duration. Deprecated fields should be ignored or mapped neutrally, never cause the entire storage payload to be discarded. Malformed nested values currently can make loading fall back to an empty list or throw on import; this must be fixed before the removal pass.

## Phase 1 exit criteria

- [x] Repository, scripts, source structure, design system, task model, routes, persistence, parser, reminders, and test baseline inspected.
- [x] Target phase sequence documented.
- [x] Removal dependency map documented.
- [x] Migration risks documented.
- [ ] User confirms Phase 2 may begin.

Suggested commit message for this phase (do not create the commit):

`docs: map architecture for ADHD-first time-awareness refactor`
