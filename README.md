<div align="center">
  <img src="public/logo.svg" alt="TidyLine logo" width="96" height="96" />

# TidyLine

A local-first task manager that makes deadlines easier to see and act on.
</div>

## Product shape

TidyLine has three primary views:

- **Now** shows the open task with the earliest start/resurface attention date. Final low-decision task rotation arrives in the next refactor phase.
- **Board** automatically groups tasks into Today, This Week, This Month, and Later based on when work needs to begin—not only when it is due.
- **Calendar** combines a month view with a continuous three-week workload ribbon and supports drag-to-reschedule.

Tasks can include a deadline, reminders, tags, notes, location, an estimate, a checklist, links, and recurrence. They can also be pinned, duplicated, archived, completed, or edited in bulk. Tasks without a deadline remain visible in Later.

Press **Start** when beginning work. TidyLine preserves active timing across reloads, accumulates paused intervals, and records actual minutes on completion. After three valid estimated-and-timed tasks, it uses the median of your personal estimate ratios to show a calm calibrated expectation such as `45m · usually ~1h 20m`. Missing estimates use completed-task history or a conservative fallback rather than counting as zero.

TidyLine derives when each task needs to begin from its calibrated duration and a small fixed buffer. Cards use direct language such as “Start now,” “Getting tight,” or “Fits comfortably.” A single optional “Bring back on” date keeps distant work from disappearing without creating another scheduling workflow.

Quick Add understands ordinary dates plus a deliberately small inline syntax:

```text
Finish report next Friday for 2h remind 30m before #work
```

It extracts the deadline, duration, reminder, tag, and supported recurrence phrases. Everything else remains part of the title.

## Data and reminders

There is no account or backend. Tasks and preferences are stored in browser `localStorage`, and task data can be imported or exported as JSON. The versioned task boundary safely reads the earlier array format and preserves legacy attachment URLs as links and blocked-task details as notes and tags.

Browser reminders currently run while TidyLine is active. Background delivery is not promised yet.

## Development

TidyLine uses React 19, Vite 8, wouter, and chrono-node.

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run lint
npm run build
npm run check
```

`npm run check` runs linting, the production build, render smoke tests, migration and date-boundary checks, retained recurrence/reminder checks, and parser tests.

## Refactor status

Phase 4 of the ADHD-first time-awareness refactor is complete. Surface reduction, actual-time calibration, derived start timing, fit language, and resurfacing are in place; the final Now interaction remains Phase 5. See `docs/refactor/PLAN.md` for the sequence.

## Contributors

- [bilal-rauf-dev](https://github.com/bilal-rauf-dev) — Lead
- [talha-rauf-dev](https://github.com/talha-rauf-dev)
