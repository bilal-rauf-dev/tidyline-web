# TidyLine design and behavior contract

Updated for Phase 2 of the ADHD-first time-awareness refactor.

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

Now currently chooses the earliest open, unarchived task. It displays the deadline distance, estimate, and tags, with Done and Open details actions. This is a transitional rule; Phase 5 will replace it only after calibrated duration and derived start timing exist.

### Board

The Board has exactly four automatic horizons:

| Key | Label | Deadline distance |
| --- | --- | --- |
| `today` | Today | overdue through today |
| `week` | This Week | 1–7 days |
| `month` | This Month | 8–30 days |
| `later` | Later | 31+ days or no deadline |

Pinned tasks lead within a horizon, open tasks precede completed tasks, and deadline order breaks remaining ties. Dragging to a horizon assigns its deterministic first day: 0, 1, 8, or 31 days from today. The user does not configure these boundaries.

Board search matches title, notes, location, and tags. Active and archived records share the Board rather than becoming separate product areas.

### Calendar

Calendar renders tasks that have deadlines and are not archived. Dragging a task to a date changes only its deadline. Selecting a date allows creation for that date. It does not infer workload or schedule focus blocks.

## Task model

The normalized Phase 2 record contains only:

`id`, `title`, `deadline`, `reminders`, `tags`, `done`, `completedAt`, `pinned`, `archived`, `recurrence`, `notes`, `location`, `duration`, `checklist`, `links`, and `createdAt`.

Contracts:

- `deadline` is a local `YYYY-MM-DD` string or `null`; null tasks remain visible in Later.
- Completion writes `completedAt`; reopening clears it.
- Relative reminders resolve from the current deadline when checked, so moving a deadline also moves its reminder.
- Completing a recurring task creates its next occurrence while resetting instance progress.
- Links are URL references; TidyLine does not upload files.
- Import normalization filters malformed nested records rather than dropping the complete task collection.

Storage uses a versioned envelope: `{ schemaVersion: 2, tasks: [...] }`. The loader also accepts the original top-level array. During migration, prior attachment references become links; prior blocked-state metadata is retained as a `waiting` tag and explanatory notes. Deprecated preference records are removed.

## Quick Add

Supported extraction is intentionally narrow:

- natural-language deadline via chrono-node;
- `#tag`;
- `for 30m` or `for 2h`;
- `remind 30m before` or `remind 2h before`;
- supported daily, weekday, weekly, monthly, yearly, and every-N-days recurrence phrases.

Unrecognized syntax stays ordinary title text. New parser tokens should not be added without a clear end-to-end task-model need.

## Reminder truthfulness

The current browser reminder checker runs while the application is active. Product copy must say this plainly. Offline/background guarantees require later service-worker verification and must not be implied by notification permission alone.

## Engineering boundaries

- Keep date arithmetic in utilities rather than components.
- Normalize all loaded, imported, and newly created tasks through one migration boundary.
- Avoid hidden data loss: migration must map meaningful legacy information into retained fields before dropping old keys.
- Keep routes, navigation, command actions, tests, and documentation aligned.
- Do not reintroduce dashboards or configuration merely to expose derived data. Future calibrated timing should remain deterministic and low-maintenance.
