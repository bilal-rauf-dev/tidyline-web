# TidyLine design and behavior contract

Updated for Phase 6 of the ADHD-first time-awareness refactor.

## Product principle

TidyLine reduces deadline blindness without asking the user to maintain a productivity system. The interface should answer what matters now, show time distance clearly, and avoid optional classification work.

The active information architecture is:

1. **Now** — one task to begin with minimal choice.
2. **Board** — the complete deadline horizon.
3. **Calendar** — month-level deadline placement.

Settings is a utility destination, not a fourth work view.

## Visual language

- Keep the editorial, high-contrast composition: warm neutral background, white and dark surfaces, coral accent, lavender/blue supporting surfaces, strong headings, and generous negative space.
- Use shape, spacing, text, and icons together. Color must not carry state by itself.
- Keep motion short and purposeful. Respect reduced-motion preferences.
- Prefer one dominant action per surface. Secondary actions should stay visually quiet until needed.
- Maintain comfortable touch targets, visible focus states, semantic controls, and readable contrast in both themes.
- Compact density may reduce spacing but must not reduce type size or hit areas below usable dimensions.

## Active surfaces

### Now

Now presents one open, unarchived task at a time. Its internal deterministic order favors active work, missed and current start attention, deadline proximity, calibrated fit, and reasonable remaining size; no rank or score is shown. The primary choices are `5 more minutes`, `Done`, and `Not this`, with details and the complete Board kept visually quiet. Rotation exclusions live only for the current page session.

`5 more minutes` starts or continues ordinary task timing and gives calm status feedback without creating a countdown dashboard, notification promise, or new persisted timer field. `Not this` pauses active work before rotating. Focus follows the selected task, actions remain at least 48px high, and the action group stacks on narrow screens.

### Board

The Board has exactly four automatic horizons:

| Key | Label | Deadline distance |
| --- | --- | --- |
| `today` | Today | overdue through today |
| `week` | This Week | 1–7 days |
| `month` | This Month | 8–30 days |
| `later` | Later | 31+ days or no deadline |

Open tasks are classified by the earliest of derived `startBy` and `resurfaceDate`; an active task belongs in Today. Completed tasks stay deadline-based. Pinned tasks lead within a horizon, open tasks precede completed tasks, and attention/deadline order breaks remaining ties. Dragging to a horizon assigns its deterministic first day: 0, 1, 8, or 31 days from today. The user does not configure these boundaries.

Board search matches title, notes, location, and tags. Active and archived records share the Board rather than becoming separate product areas.

### Calendar

Calendar renders tasks that have deadlines and are not archived. A continuous 21-day ribbon shows calibrated work at attention dates and deadline concentration, making empty and crowded periods visually distinct. Month cells mark start counts alongside deadlines. Dragging changes only the deadline; selecting a date allows creation. A quiet export action downloads open deadlines and supported reminders as `.ics`. The Calendar does not restore manual focus-block scheduling.

## Task model

The normalized task record contains only:

`id`, `title`, `deadline`, `resurfaceDate`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `startedAt`, `actualMinutes`, `checklist`, `links`, and `createdAt`.

Contracts:

- `deadline` is a local `YYYY-MM-DD` string or `null`; null tasks remain visible in Later.
- Completion writes `completedAt`; reopening clears it.
- `startedAt` is the current active interval or `null`. Starting twice is idempotent.
- Pause adds the rounded positive elapsed interval to `actualMinutes` and clears `startedAt`; Resume starts a new interval. Completion performs the same finalization before marking the task done.
- A task completed without being started remains valid and has no invented actual duration.
- `resurfaceDate` is nullable and cannot be later than a task deadline. It is an attention hint, not another deadline.
- Relative reminders resolve from the current deadline when checked, so moving a deadline also moves its reminder.
- Completing a recurring task creates its next occurrence while resetting instance progress.
- Links are URL references; TidyLine does not upload files.
- Import normalization filters malformed nested records rather than dropping the complete task collection.

Storage uses a versioned envelope: `{ schemaVersion: 4, tasks: [...] }`. The loader also accepts the original top-level array and earlier envelopes. During migration, prior attachment references become links; prior blocked-state metadata is retained as a `waiting` tag and explanatory notes. Timing and resurfacing fields initialize safely. Deprecated preference records are removed.

## Time and calibration

Timing is task work capture, not a stopwatch product. The UI exposes Start, Pause/Resume, and Done without timer dashboards, productivity scores, or Pomodoro controls. Active state is textual as well as visual.

Calibration uses completed tasks with positive estimates and actual durations no greater than seven days. After three valid samples, TidyLine takes the median `actualMinutes / estimatedMinutes` ratio and bounds it to 0.5×–4×. Invalid, unfinished, zero, and runaway samples do not influence it.

The canonical duration estimator follows this order:

1. explicit estimate multiplied by calibrated ratio when available;
2. explicit estimate unchanged while calibration is still learning;
3. median valid completed-task duration for an unestimated task;
4. a conservative 45-minute fallback.

Expected durations round to five-minute increments. Calibrated values appear only where they support a decision. Completion feedback is neutral and temporary: `Estimated 30m · took 1h 10m.` Settings exposes the learned multiplier read-only; users never configure it.

## Derived attention and fit

`startBy` is derived rather than stored: planning deadline minus canonical expected duration minus a fixed 30-minute transition buffer. Active tasks use today as their attention date. Open-task horizons use the earlier of `startBy` and `resurfaceDate`, so missed starts and resurfaced work move into Today without manual planning.

Fit language compares the task's remaining expected minutes plus buffer with deterministic available capacity after other open work due no later than that task. Capacity is six hours per day and is not user-configurable. The UI exposes only three calm outcomes: Fits comfortably, Getting tight, and Won't fit at your usual pace. There is no numerical risk score.

Near future timing uses days. Medium distances use workdays, and longer distances use weekends. The primary label describes when to start; the deadline remains visible separately rather than competing as another countdown.

## Quick Add

Supported extraction is intentionally narrow:

- natural-language deadline via chrono-node;
- `#tag`;
- `for 30m` or `for 2h`;
- `remind 30m before` or `remind 2h before`;
- supported daily, weekday, weekly, monthly, yearly, and every-N-days recurrence phrases.

Unrecognized syntax stays ordinary title text. New parser tokens should not be added without a clear end-to-end task-model need.

## Reminders, installation, and calendar export

The browser reminder checker runs only while the application is open. This limitation appears where reminders are created and in Settings. Notification permission, service-worker registration, and app installation do not imply push, background sync, offline caching, or closed-app delivery.

The service worker remains minimal and local: it hosts notification actions and satisfies the installed-app worker boundary, but it does not cache task data or communicate with a backend. The manifest uses existing brand assets and standalone display metadata.

Calendar export is a one-way snapshot, not synchronization. Open deadline events use UTC timestamps derived from the device’s local deadline time and record the device timezone as calendar metadata. Task recurrence maps to `RRULE`; relative/absolute reminders map to `VALARM`; independently recurring reminders use transparent recurring events. Export does not change task storage or schema version.

## Engineering boundaries

- Keep date arithmetic in utilities rather than components.
- Normalize all loaded, imported, and newly created tasks through one migration boundary.
- Avoid hidden data loss: migration must map meaningful legacy information into retained fields before dropping old keys.
- Keep routes, navigation, command actions, tests, and documentation aligned.
- Do not reintroduce dashboards or configuration merely to expose derived data. Future calibrated timing should remain deterministic and low-maintenance.
