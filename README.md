# TidyLine

TidyLine is a local-first, deadline-focused task manager for power users.

> Help power users quickly plan tasks with deadlines and get an actionable bird's-eye view of them.

Tasks live in the browser under `tidyline:tasks`; there is no account, backend, or network sync. The Board automatically places dated work into four disjoint horizons—Today, Week, Month, and Later—while undated work remains visible in the Board’s collapsed No date section.

## What it includes

- An actionable Home overview for overdue work, Today, and the next seven days
- A four-horizon planning Board with drag-to-reschedule and an undated holding area
- A dense sortable All tasks list, including undated tasks
- Calendar and Day planner views for date and time planning
- Quick Add with controlled natural-language task parsing
- Priority, tags, saved filters, templates, recurrence, reminders, estimates, waiting state, and rich task details
- Shared multi-select actions, bulk rescheduling, undo, and delete confirmation
- A task-aware command palette and keyboard-first task navigation
- Versioned local persistence, validated JSON import/export, light/dark themes, accent choice, and density choice

## Quick Add syntax

Quick Add uses `chrono-node` only for dates and times. The remaining syntax is deliberately controlled and predictable.

| Intent | Syntax | Example |
|---|---|---|
| Deadline | Natural date/time | `Submit report next Friday at 5pm` |
| Start date | `start <date>` | `Start project start Monday due next Friday` |
| Reminder | `remind <duration> before` | `Call Talha Friday remind 2h before` |
| Duration | `for <duration>` | `Study OS for 90m` |
| Recurrence | `every day`, `every weekday`, `every Monday`, `every 2 weeks`, `every month` | `Pay bill every month on the 5th` |
| Tag | `#tag` (repeatable) | `Draft outline #university #writing` |
| Priority | `!high`, `!medium`, `!low`; aliases `p1`, `p2`, `p3` | `Fix login bug !high` |
| Plan today | `plan today` | `Read article plan today` |
| Undated task | Omit a parseable date | `Research standing desks #home` |

## Keyboard shortcuts

The in-app `?` overlay is generated from the same `SHORTCUTS` definition used by the key handler.

| Keys | Action |
|---|---|
| `Ctrl/⌘ K` | Open command palette |
| `N` / `Q` | Open Quick Add |
| `/` | Focus task search |
| `J` / `↓`, `K` / `↑` | Move focus within a task column or list |
| `H` / `←`, `L` / `→` | Move focus between Board buckets |
| `Home`, `End` | Focus first or last visible task |
| `E` | Open focused task details |
| `X` | Toggle focused task selection |
| `Space` / `C` | Complete or reopen focused task |
| `T` | Plan focused task for today |
| `P` | Pin or unpin focused task |
| `A` | Archive focused task |
| `1`–`4` | Move focused task to Today, Week, Month, or Later |
| `Delete` | Delete focused task through confirmation settings |
| `U` | Undo last action |
| `?` | Show shortcut overlay |
| `Esc` | Close the active surface |

## Local development

```bash
npm install
npm run dev
```

Production and quality checks:

```bash
npm run build
npm run lint
npm run check
```

`npm run check` runs ESLint, the production build, route smoke mounts, phase smoke checks, parser tests, and pure-logic tests.

## Data portability

Exports use a versioned envelope:

```json
{ "schemaVersion": 2, "tasks": [] }
```

Older bare-array exports migrate on load. Imports validate titles and deadlines, repair missing or duplicate IDs, and report imported, repaired, and skipped counts. A build that encounters data from a newer schema refuses to overwrite it.

## Deliberately not included

- **Retrospective analytics** — TidyLine prioritizes forward planning and direct action over productivity scoring.
- **Energy levels** — tags already express personal contexts without adding a parallel field, parser token, and filter dimension.
- **Risk scoring** — an uncalibrated heuristic should not be presented as an authoritative prediction; TidyLine states verifiable daily capacity instead.
- **Workload redistribution** — automatic greedy rescheduling obscures user intent; bulk date and bucket actions keep the user in control.

## Stack

- React 19 and Vite 8
- Wouter routing
- `chrono-node` date/time extraction
- Plain JavaScript and CSS
- Browser `localStorage`
