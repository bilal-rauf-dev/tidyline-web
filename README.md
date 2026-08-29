<div align="center">

  <img src="public/logo.svg" alt="TidyLine logo" width="96" height="96" />

# TidyLine

A deadline-focused task manager that organizes your work by how soon it's due — not by folder, project, or priority you have to set yourself.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0B1520)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase%20Auth-optional-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![wouter](https://img.shields.io/badge/wouter-routing-8A5CF6?style=flat-square)
![chrono--node](https://img.shields.io/badge/chrono--node-NL%20dates-FF8A3D?style=flat-square)
![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)

</div>

<br />

<img src="public/future_banner.png" alt="TidyLine brand banner" width="100%" />

<br /><br />

## What it does

Add a task with a deadline and TidyLine automatically places it into the right time bucket — Today, This Week, This Month, and beyond — and moves it forward as the deadline approaches. No manual sorting, no projects to set up first. Type a task in plain English ("renew passport next Friday !high #admin remind 1 day before") and TidyLine's quick-add parser pulls out the deadline, priority, tags, and reminder for you.

<img src="public/preview.png" alt="TidyLine Home screen" width="100%" />

## Features

**Task management**

- Rich task details — notes, checklists, links, location, and estimated duration
- Quick-add with natural-language parsing (dates, priority, energy level, duration, reminders, recurrence, and tags typed inline)
- Edit, pin, duplicate, archive, and undo destructive actions
- Drag and drop tasks between buckets, calendar dates, or the day planner timeline
- Bulk select and act on multiple tasks at once
- Tags, instant fuzzy search, filtering, sorting, and saved filters
- Task templates that reuse recurring details while leaving the title and deadline blank

**Reminders & recurrence**

- Smart reminder presets (5 min / 30 min / 1 hour before, tomorrow morning, every weekday, custom)
- Recurring tasks — daily, weekly, monthly, yearly, or every N days
- Browser notifications with sound, snooze, and mark-complete-from-notification

**Views**

- Home — a daily-at-a-glance dashboard with today's progress and activity
- Board — the core bucketed task list, grouped Today through Later, with configurable buckets
- Calendar — month view with drag-to-reschedule
- Day planner — drag actionable tasks onto an hour-by-hour timeline and resize blocks to set duration
- Someday / Maybe — a holding area for undated ideas you can promote to the board once they're ready
- Analytics — completion trends, streaks, workload, and bucket breakdowns

**Living timeline & workload awareness**

- Tasks visibly flow toward "Today" as their deadline approaches, with countdown labels and animated bucket transitions
- A deadline-risk score weighs time pressure, estimated effort, checklist progress, and postponements to flag tasks worth attention
- Same-day workload tracking warns when a day is overloaded and offers a redistribution helper
- An end-of-day shutdown review summarizes what got done and rolls unfinished tasks into tomorrow

**Everything else**

- Command palette (`Ctrl+K`) and keyboard shortcuts for common actions
- Light/dark mode, a selectable accent color, and compact/comfortable density
- Export and import your tasks as JSON
- All task data stays in your browser's local storage — no account required

<table>
<tr><td width="60"><img src="https://img.shields.io/badge/-%23FF5A36-FF5A36?style=flat-square" alt="Coral" /></td><td>Coral <sub>(default)</sub></td>
<td width="60"><img src="https://img.shields.io/badge/-%236D5AE6-6D5AE6?style=flat-square" alt="Violet" /></td><td>Violet</td>
<td width="60"><img src="https://img.shields.io/badge/-%230F7D68-0F7D68?style=flat-square" alt="Teal" /></td><td>Teal</td>
<td width="60"><img src="https://img.shields.io/badge/-%23A85F07-A85F07?style=flat-square" alt="Amber" /></td><td>Amber</td>
<td width="60"><img src="https://img.shields.io/badge/-%2337507A-37507A?style=flat-square" alt="Indigo" /></td><td>Indigo</td>
</tr>
</table>

*The five accent options available under Settings → Appearance. Pick one hue to carry every highlight, button, and today marker in the app.*

> [!NOTE]
> TidyLine is local-first by design: it works fully offline, no sign-up needed, with tasks living in this browser's local storage. An optional Google sign-in (via Supabase Auth) is available to give the workspace your name and picture — task data itself isn't synced to a server yet, so it still stays on this device.

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vite.dev/) for the app and build tooling
- [wouter](https://github.com/molefrog/wouter) for routing
- [chrono-node](https://github.com/wanasit/chrono) for natural-language date parsing in quick-add
- [Supabase Auth](https://supabase.com/auth) for optional Google sign-in — entirely opt-in; see [Local development](#local-development)
- ESLint for linting, plus a set of custom smoke-test and parser-test scripts (no traditional test framework)

## Local development

```bash
npm install
npm run dev
```

> [!TIP]
> Google sign-in is optional. To enable it, copy `.env.example` to `.env` and fill in a Supabase project's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without it, TidyLine runs entirely in local/guest mode.

Other useful scripts:

```bash
npm run lint    # ESLint
npm run build   # Production build
npm run check   # Lint + build + all smoke/parser tests
```

## Live preview

[tidyline-web.vercel.app](https://tidyline-web.vercel.app/)

## Contributors

- **[bilal-rauf-dev](https://github.com/bilal-rauf-dev)** — Lead / Frontend developer
- **[shawal-cfd](https://github.com/shawal-cfd)** — Backend developer
- **[talha-rauf-dev](https://github.com/talha-rauf-dev)** — Senior manager
