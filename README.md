<div align="center">
  <img src="public/logo.svg" alt="TidyLine logo" width="96" height="96" />

# TidyLine

A local-first task manager that makes deadlines easier to see and act on.
</div>

## Product shape

TidyLine has three primary views:

- **Now** chooses one open task internally from start urgency, deadline proximity, calibrated fit, and reasonable size. It offers only `5 more minutes`, `Done`, and `Not this` as primary choices.
- **Board** automatically groups tasks into Today, This Week, This Month, and Later based on when work needs to begin—not only when it is due.
- **Calendar** combines a month view with a continuous three-week workload ribbon, supports drag-to-reschedule, and exports open deadlines and reminders as `.ics`.

**Routines** is a secondary utility for short sequences such as leaving home or closing down work. A routine is entered as ordered actions and, when run, shows only the next action. It does not create tasks, schedules, streaks, or completion history.

Tasks can include a deadline, reminders, tags, notes, location, an estimate, a checklist, links, and recurrence. They can also be pinned, duplicated, archived, completed, or edited in bulk. Tasks without a deadline remain visible in Later.

Press **Start** when beginning work. TidyLine preserves active timing across reloads, accumulates paused intervals, and records actual minutes on completion. After three valid estimated-and-timed tasks, it uses the median of your personal estimate ratios to show a calm calibrated expectation such as `45m · usually ~1h 20m`. Missing estimates use completed-task history or a conservative fallback rather than counting as zero.

TidyLine derives when each task needs to begin from its calibrated duration and a small fixed buffer. Cards use direct language such as “Start now,” “Getting tight,” or “Fits comfortably.” A single optional “Bring back on” date keeps distant work from disappearing without creating another scheduling workflow.

Quick Add understands ordinary dates plus a deliberately small inline syntax:

```text
Finish report next Friday for 2h remind 30m before #work
```

It extracts the deadline, duration, reminder, tag, and supported recurrence phrases. Everything else remains part of the title.

## Data and reminders

There is no account or backend. Tasks, routine definitions, and preferences are stored in browser `localStorage`; the workspace can be exported or imported as JSON. The versioned task boundary safely reads the earlier array format and preserves legacy attachment URLs as links and blocked-task details as notes and tags. Routines use a separate versioned store, are included as an optional backup section, and never alter task records.

Browser alerts are checked only while TidyLine is open in a browser tab or installed window. Closing it stops reminder delivery; there is no push or background-sync service.

The Calendar export uses UTC event timestamps with the device timezone recorded, and includes supported task recurrence and reminder alarms. TidyLine also includes standalone installation metadata for browsers that offer app installation. Installation does not imply offline reminder delivery.

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

`npm run check` runs linting, the production build, render smoke tests, migration and date-boundary checks, retained recurrence/reminder checks, ICS/PWA validation, ordered-routine checks, and parser tests.

## Refactor status

The automated gate for Phase 8 of the ADHD-first time-awareness refactor is complete. The low-decision core, honest active-page reminders, install metadata, calendar export, isolated one-action routine flow, routine-inclusive workspace backup, and final migration scenario checks are in place. Live visual review is still pending because the in-app browser runtime cannot initialize. See `docs/refactor/PLAN.md` for the delivery state.

## Contributors

- [bilal-rauf-dev](https://github.com/bilal-rauf-dev) — Lead
- [talha-rauf-dev](https://github.com/talha-rauf-dev)
