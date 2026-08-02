# TidyLine Design System

This document is the single source of truth for visual design. Before writing or
editing any component, read this file. If a change is not traceable to a rule
below, don't make it.

## Reference

Two dashboard screenshots define the visual language (dark/warm bento-grid style,
sidebar productivity app). Extracted tokens below. Do not invent new colors,
radii, or shadow styles outside this list.

## Color palette

- Background (page): warm off-white `#F2F0EC`
- Surface (cards, default): pure white `#FFFFFF`
- Surface (dark accent card): near-black `#141416`
- Accent primary (warm): coral/orange `#FF5A36`
- Accent secondary (cool): lavender `#C9C3F2`
- Text primary: `#14141A`
- Text secondary: `#6B6B72`
- Border/divider: `#E7E4DD` (barely-there, used sparingly, never a full outline around every card)

Every screen uses at most one dark card and one accent color pulled hard —
not a rainbow of pastel tags. Color is used to mark exactly one important
thing per view (today, the primary CTA, the one stat that matters).

**The accent is a user-selectable token.** `--accent` defaults to coral but
Settings lets the user swap which single hue plays the accent role (coral,
violet, teal, amber, indigo — all dark enough to carry white text). This
relaxes "one accent pulled hard" in one direction only: it changes *which*
hue is the accent, never how many accents are active at once. Everything
accent-coloured reads from `--accent`, so nothing needs per-hue special
casing. `--accent-soft` (lavender) is unchanged by this and remains the
secondary chart-geometry colour.

**Override (data-dense pages):** the one-dark-card rule is relaxed on
Analytics and Home, which are dashboards rather than task surfaces and need
card-type variety to stay readable. Those pages may mix three surface types:
white (`--surface`), dark (`--surface-dark`), and a solid **accent surface**
(`--accent` as a card background, white text on it). The lavender secondary
(`--accent-soft`) is admitted as a genuine second accent on these pages, used
only for chart geometry — ring fills, milestone fill, sparkline peak, timeline
points — never for text, borders, or a fourth card colour. Task-surface pages
(Board, Calendar, Settings) keep the original one-dark-card discipline.

## Dark mode

The reference screenshots only depict one (light) theme, so these tokens are
a new addition, not something extracted from the references — added because
a light/dark toggle was explicitly requested. Derived systematically from the
existing palette rather than introducing a new hue:

- Background (page): `#101012`
- Surface (cards, default): `#1C1C1F`
- Surface (dark accent card): pure black `#000000` — stays the anchor, now
  darker than both the page and default card surface instead of sitting
  between them.
- Text primary / secondary / border: reuse the existing `--text-on-dark` /
  `--text-on-dark-soft` / `--line-on-dark` values as-is (no new hex values
  needed — those tokens already existed for the Today/sidebar dark cards).
- Accent color does not change between themes; it's the one constant.
- Toggle lives in Settings; preference persists in `localStorage`, defaulting
  to the OS `prefers-color-scheme` on first visit.

## Typography

- One typeface family, sans-serif, used at extreme weight contrast: 700–800 for
  numbers/headlines, 400–500 for body/labels. No mixing in a second display font.
- Numbers are the hero element. A stat like a count or date should be rendered
  at 32–48px bold, not inside a small badge.
- Headlines are set large and left-aligned, sentence case, not centered,
  not all-caps.
- Body copy: 14–15px, `#6B6B72`, generous line-height (1.5+).

## Shape and elevation

- Card corner radius: 16–20px. Buttons: 10–12px. Nothing is a full pill/capsule
  shape except a genuine toggle switch.
- No drop shadows for depth. Cards are separated by background color contrast
  (white card on `#F2F0EC` page, or a solid dark card) — not `box-shadow` blur.
- If a shadow is used at all, it's a 1px hard-edge or none. Never a soft
  `0 10px 30px rgba(0,0,0,0.1)` glow.

## Density

Two spacing modes, chosen in Settings and applied via `data-density` on the
root. Compact tightens only the containers that actually carry list density —
card padding, task row padding, grid gaps, settings rows — and deliberately
leaves type sizes and the type scale alone, so nothing becomes harder to read.
It is a spacing toggle, not a global rem rescale.

## Motion

Not present in the reference screenshots (they're static) — these values are a
new addition, chosen to stay subtle and utility-grade. This is a productivity
tool, not a marketing page: no bounce, no spring, no overshoot, nothing that
draws attention to itself.

- Duration tokens: `--dur-fast: 160ms` (fades, color changes),
  `--dur-move: 220ms` (anything that travels a distance — the nav indicator,
  sidebar width, drawer slide).
- Easing token: `--ease: cubic-bezier(0.2, 0, 0, 1)` — a decelerating ease-out
  that arrives and stops. Never an `ease-in-out` bounce or a spring curve.
- Route transitions: content fades in from `blur(4px)` to `blur(0)` over
  `--dur-fast`. No slide, no scale, no stagger.
- Active nav indicator travels between items rather than snapping — one shared
  element that moves, not a border toggling on and off per item.
- Everything above collapses to ~0ms under `prefers-reduced-motion: reduce`,
  set globally in `index.css`.
- **Living timeline (FLIP).** When wall-clock time moves a task into a
  different bucket, the card animates from its old column position to its new
  one instead of teleporting. Implemented as measure → apply → invert → play
  via the Web Animations API over 420ms on the standard ease-out. It is armed
  *only* by the time tick, so manual drags, filtering and sorting re-render
  without animating. The tick runs on a 60s interval and re-fires on tab
  visibility/focus, so a laptop reopened the next morning re-shelves its tasks
  rather than showing yesterday's layout.

## Layout

- Bento-grid: unequal card sizes in an asymmetric grid, not a uniform 3-column
  repeat of identical cards.
- One card per screen can be dark (`#141416`) to anchor the grid visually —
  pick the most important metric/action for it.
- Dense information inside cards is fine; whitespace exists between cards,
  not padding everything into oblivion inside them.

## Data visualization

- Bars/charts are solid flat color rectangles, not gradient-filled, not rounded
  into pill shapes at the top.
- Calendar/date data (like task deadlines) renders as a small dot grid
  (day-of-week columns), filled solid for "has activity," hatched/outlined for
  a different state. This replaces a generic progress bar for anything
  date-shaped.
- Donut/pie charts use flat segment colors from the palette above, labeled
  outside the ring with plain numbers, not inside floating pill callouts.

## Chart primitives

These exist as components in `src/components/`. Reuse them; do not invent a
new chart type for a new page without adding it here first.

- **Milestone bar** (`MilestoneBar.jsx`) — horizontal completion bar with
  1px tick marks at 25/50/75 and a 0–100 scale beneath. Flat fill in
  `--accent-soft` on a `--line` track. Square ends, never a rounded capsule.
  Use for a single "share of total" metric.
- **Ring stat** (`RingStat.jsx`) — circular progress tile: ring, plain-text
  label, and a fraction whose numerator is the bold hero number
  (`16/30` sets the `16` large). Butt stroke caps, not round, so the ring
  never reads as a pill. Use for per-segment progress; pairs two-up under a
  milestone bar.
- **Trend column** (`TrendBars.jsx`) — one column per series entry: signed
  delta on top, label, height-by-count flat bar, count beneath. Exactly one
  column carries `--accent`; the rest are neutral. Bars are square-topped
  rectangles. Use for comparing counts across a fixed set of categories.
- **Sparkline** (`Sparkline.jsx`) — 2px flat polyline with a single
  highlighted peak point. No fill under the curve, no gradient, no axis.
  Use for a short time series where only the shape and its peak matter.
- **Activity grid** (`ActivityGrid.jsx`) — day-of-week dot grid, seven rows,
  one column per week. Three states: **solid** = completed activity,
  **hatched** = overdue (a deadline that passed while still undone),
  **outlined** = nothing. Hatching is a 45° repeating hard-stop stripe, not a
  blended gradient. This is the standard renderer for any date-shaped data.

- **Distance rail** (`DistanceRail.jsx`) — seven ticks, one per bucket, sitting
  at the top of every bucket card. The tick for the current bucket is a
  full-height accent bar; ticks nearer than it stay solid, ticks beyond it
  fade to the border colour. This is what makes the seven bucket cards read as
  one Today → Later sequence rather than seven interchangeable boxes. It is a
  positional glyph, not a progress bar — nothing "fills up".

Deltas render as plain signed text (`+2`, `-1`, `–` for zero) — never a
coloured pill, and never a green/red semantic pair.

## Form and control primitives

- **Underline field** (`.input-underline`) — the single most important input on
  a form gets no box: just a 1px bottom rule that thickens to 2px accent on
  focus. Exactly one per form; every other field stays a normal bordered input.
  Used for the task title on both the add and edit forms.
- **Icon field** (`.field-icon`) — a small outline line-icon plus a short text
  label above a compact input. The icon uses the same 20×20 stroked language as
  the sidebar nav icons and never appears inside a circle. Icons are decorative
  (`aria-hidden`); the text label carries the accessible name.
- **Icon action button** (`.icon-action`, `.icon-mini`) — square-ish bordered
  button (`.icon-action`, for a primary inline action like "add reminder") or
  bare glyph (`.icon-mini`, for row-level actions like pin/edit/duplicate/
  archive/delete). Both always carry an `aria-label` and a `title`. Never a
  circular floating action button.
- **Tag mark** (`TagList.jsx`) — flat rectangle with a 2px left border and no
  background, **never a rounded pill**. Tone is assigned deterministically by
  hashing the tag name across three palette values only (neutral, lavender,
  coral), so a given tag is always the same colour and no new hues enter.
- **Day-context panel** (`DayContext.jsx`) — left-bordered lavender panel that
  appears under a date or time field once a value is picked, listing what is
  already scheduled that day (or within 2h, for reminders). Renders nothing
  when the slot is clear, so it is a signal rather than constant chrome. It
  always excludes the task currently being edited.
- **Segmented control** (`.segmented`) — flat row of buttons in a shared
  bordered container; the active segment is marked by an inset bottom accent
  rule, not a filled pill.
- **Undo toast** (`UndoToast.jsx`) — dark card pinned bottom-centre, holding a
  message, an underlined "Undo" action, and a dismiss glyph. Same
  `--surface-dark` and `--radius-card` as any other dark card; no shadow, no
  pill. Auto-dismisses after 6s (verified in-browser: present at 4.2s, gone by
  6.6s). Undo restores a full snapshot of the task list taken before the
  destructive action, so it works identically for single and bulk operations.
- **Distance rail** is documented under chart primitives above.
- **Countdown label** (`.countdown`) — plain bold micro-text on the card
  ("3 days left", "today", "2 days overdue"), turning accent-coloured once
  negative. Text only; never a coloured pill.
- **Task flag row** (`.task-meta`) — the collapsed card's summary line: the
  countdown plus small glyphs for repeat/notes/links and text counts for
  checklist progress (`1/3`) and duration. Glyphs only appear when the field
  has content, so a bare task stays bare. This is what keeps rich detail from
  making every card noisy.
- **Expandable detail panel** (`.task-details-panel`) — opens inside the card
  under a top rule, never as a modal or drawer. Holds notes, checklist, links,
  attachments, location, estimate, recurrence and reminders.
- **Overdue tier card** (`.overdue-group`) — severity is expressed only by
  left-border weight and palette intensity: 3px `--line` (yesterday) → 3px
  lavender (a few days) → 5px accent (a week or more). No new hues, no red,
  no alarm iconography.
- **Bucket progress bar** (`.bucket-progress`) — 3px flat lavender fill on a
  `--line` track at the head of each bucket. Square ends, same language as the
  milestone bar, just smaller.
- **Command palette** (`CommandPalette.jsx`) — centred card on a token-derived
  scrim, reusing `--surface`, `--radius-card` and a 1px `--line` border. The
  search row is an underline field, not a rounded pill, and the active row is
  marked with an accent left border like a nav item. No shadow.
- **Accent swatch** (`.accent-swatch`) — small rounded-rect colour buttons in
  Settings; the selected one is ringed with a `--text` border rather than a
  checkmark.
- **Drag affordance** (`.task-grip`) — a six-dot grip glyph at the start of a
  task row. Cards are `draggable` only when selection mode is off; in selection
  mode the grip is replaced by a checkbox and dragging is disabled so the two
  interactions cannot conflict.

## Never do this (explicit anti-patterns)

The following are the default outputs of AI-generated UI and are banned outright:

- Rounded pill-shaped badges/tags (e.g. a colored capsule with a status word inside)
- "Eyebrow" labels: small all-caps kicker text with a colored dot before a headline
- Icon-in-a-circle as a decorative bullet in front of every list item
- Centered hero section with a gradient background (blue-to-purple or
  orange-to-pink) and a giant centered headline
- Emoji used as functional icons
- Soft glassmorphism / frosted blur panels
- A card for every single stat, all identical size, in a uniform grid
- Generic checkmark-in-a-green-circle for "done" states — use the dark/light
  contrast + strikethrough text instead

## Navigation shell

- Persistent left sidebar, fixed width (~260–280px), background `#141416`
  (the same dark tone as the Today card — the sidebar is the app's other
  anchor point, so it should feel like the same material).
- Sidebar text: muted gray (`#9C9CA3`) for inactive items, full white for
  the active item.
- Active nav item indicator: a solid coral (`#FF5A36`) left-border accent
  (2–3px), not a filled pill background behind the label.
- Nav items: plain text label plus one small outline-style line-icon per
  item (not emoji, not icon-in-a-circle), icon inherits the text color.
- App name/wordmark at the top of the sidebar: bold, white, plain text,
  preceded by the brand monogram (the T-shape, L-shape, and three accent
  lines only — no background square, no repeated wordmark).
- **Override (supersedes the original brand-color decision):** the inline
  sidebar monogram is monochrome — a single `currentColor` fill/stroke, at
  reduced opacity for the three accent lines — so it behaves like the other
  nav icons and inherits the muted/white text-color states instead of
  carrying its own fixed brand palette. Full-color brand artwork is used
  only for the favicon and any app-icon export, never inline in the UI.
  Source of truth is now **`public/logo.svg` in this repo** — it has been
  edited since import (the "TidyLine" wordmark `<text>` elements were removed,
  leaving the rounded square plus monogram) and has therefore diverged from the
  original export in `~/Downloads/TidyLine_logo.svg`. Treat the repo copy as
  authoritative. `public/logo.png` is a stale PNG fallback that still contains
  the removed wordmark and needs re-exporting. The sidebar mark
  (`src/components/BrandMonogram.jsx`) carries the same five monogram paths,
  recolored to `currentColor`.
- **Brand row is also a control row.** The wordmark takes the horizontal
  slack (`flex: 1`) so any trailing controls sit flush to the sidebar's right
  edge. Controls here are bare `.icon-mini` glyphs inheriting the sidebar's
  muted-to-white text states — no pill, no circle background, no filled
  button. Currently one such control: the command-palette trigger, which
  duplicates the Ctrl+K shortcut rather than replacing it (the shortcut stays
  the primary path; the button makes it discoverable). Its `aria-label` and
  tooltip both name the shortcut. Trailing controls are hidden on the
  collapsed 76px rail — there is no room beside the monogram — and restored
  in the mobile drawer, which is always full width.
- Sections: Home, Board, Calendar, Analytics, Settings — all built out now.
  Home is the default route (`/`); Board lives at `/board`. Any future new
  section should default to a plain "coming soon" card treatment until built
  — not a placeholder illustration or empty-state graphic.

### Responsive behavior and collapse

- Above 720px the sidebar is permanent chrome, fixed to the viewport, and the
  main content is offset by its width.
- **Collapse (desktop, by choice):** a toggle at the bottom of the sidebar
  shrinks it from 264px to 76px — icons only, labels hidden, chevron rotates
  180°. Sidebar width and content offset are driven by one `--sidebar-w`
  custom property so they animate in lockstep over `--dur-move`. This is a
  user preference, not a viewport response. It is session-only state; it
  deliberately does not persist.
- **Drawer (≤720px, by viewport):** the sidebar becomes an off-canvas slide-in
  drawer at full 264px width with labels visible — never an icon-only rail,
  which is unusable as a primary nav on a phone. A slim dark top bar appears
  with a hamburger trigger and the wordmark. The drawer is dismissed by the
  backdrop, by Escape, or by selecting a nav item (auto-close). When closed it
  is `visibility: hidden` so off-screen nav items are not focusable.
- The desktop collapse preference is explicitly ignored below 720px — the
  drawer always shows full labels regardless of collapse state.
- Backdrop is the dark surface token at 45% alpha (`color-mix`), not a new
  color and not a frosted/blurred panel.
- Main content area keeps the `#F2F0EC` background and existing card
  tokens exactly as defined above; only the sidebar introduces the dark
  surface as permanent chrome.

## Data model decisions

These are behavioural contracts, not styling. Change them deliberately.

- **`completedAt`** — set when a task is completed, cleared when un-completed.
  Added because "completed today" cannot be derived from `done` alone. The
  activity grid still keys off `deadline`; migrating it to `completedAt` would
  only describe tasks completed from this version onward, so it is deferred
  rather than silently half-applied.
- **Recurrence materialises on completion, not virtually.** Completing a
  recurring task writes exactly one new instance with the next deadline.
  Rejected the virtual alternative because occurrences carry mutable
  per-instance state — checklist ticks, notes edits, pins, tags — which a
  computed occurrence cannot hold without a parallel override store. One flat
  task list keeps storage bounded, keeps every visible task a real editable
  record, and avoids rendering 52 phantom copies of a weekly task. The cost is
  explicit: **if you never complete it, no future occurrence exists.** For a
  deadline tool that is the correct bias — the board shows what is actually
  owed, not a projection.
  Carried to the next instance: title, tags, notes, links, attachments,
  location, duration, reminders, recurrence rule. Reset: `done`,
  `completedAt`, `pinned`, and every checklist tick.
- **Relative reminders resolve at check time, not save time.** A "1 hour
  before" reminder stores `minutesBefore`, never a frozen timestamp, so
  editing the deadline moves the reminder with it. Freezing at save time would
  silently detach the reminder from a rescheduled task and fire at a moment
  that no longer means anything. Absolute and "tomorrow morning" reminders do
  resolve once, at save time, because neither is deadline-linked.
- **`DEADLINE_HOUR = 9`** — a date-only deadline has no clock time, so 09:00
  local is the pinned "due moment" used by relative reminders and by the
  "tomorrow morning" preset.
- **Recurring reminders reuse the recurrence model** in `recurrence.js`
  ("every Monday" is `{ freq: 'weekly', weekday: 1 }`). There is one
  recurrence implementation, not two.
- **One date-diff implementation.** `daysUntil()` in `dates.js` is the only
  place day arithmetic happens; bucketing, countdown labels and overdue
  tiering all call it.
- **Attachments are references, not files.** An attachment is a name plus a
  URL pointing at something already hosted elsewhere. There is no backend and
  localStorage has a hard size ceiling, so real uploads are not possible here.
- **Overdue is not a bucket.** Overdue tasks are removed from the bucket grid
  entirely and rendered in their own section. Any that do surface elsewhere
  still carry the overdue treatment, so they never read as on-time.

## Component-specific direction (TidyLine)

- Home page (default route): a landing/summary view, not a data source of its
  own — every number on it is derived from the same task list and the same
  utils the other pages use. Structure, top to bottom:
  1. Left-aligned time-of-day greeting as the `h1` (sentence case, not
     centered, no gradient behind it, no eyebrow label above it), one line of
     body-copy subtext, and one primary CTA that jumps straight to the Board's
     add-task form with the title field focused (`/board?add=1`).
  2. A "Daily activity" timeline card sitting *beside* the greeting, not
     below it — today's reminders plotted on a 24-hour axis with a coral
     current-time marker, lavender points for pending reminders and outlined
     points for completed ones, followed by a compact time+title list. Reuses
     existing reminder datetimes; adds no fields.
  3. An asymmetric bento grid below, using all three surface types so Home
     reads as the same system as Analytics: a dark "due today" card pairing
     the hero count with a ring stat for today's cleared tasks, an accent
     (coral) activity card with a big day-count and the shared activity grid,
     and a white "coming up" card listing the next few tasks using the same
     bold-day-number/small-month deadline treatment as task cards.
  - Reuse the chart primitives above. Do not invent a new stat card type here.
- Analytics page: four cards of four different shapes, never a uniform grid.
  1. **Progress** (white, wide) — milestone bar for overall done/total, with
     two ring-stat tiles beneath for the two buckets holding the most tasks.
  2. **Bucket trend** (dark, tall) — one trend column per bucket showing count
     and week-over-week delta. "Last week" is *reconstructed*, not recorded:
     tasks that already existed a week ago (by `createdAt`) are re-bucketed
     against a reference date of today−7d. The tallest column takes the accent.
  3. **Busiest day** (dark, small) — sparkline of deadline load over the next
     14 days with the peak marked, and a bold `peak/total` fraction beneath.
  4. **Activity** (accent surface, small) — big count of days with completed
     tasks, the shared activity grid including the hatched overdue state, and
     an overdue-day count as a footnote.
  - Deliberately *not* built: mood tracking, a projects list, and a team
    section from the reference. This app has no data for any of them, and
    inventing placeholder data for a dashboard would make it lie.
- Bucket columns (Today/Week/2 Weeks/etc.): render as the bento grid above, not
  seven identical white boxes. Give "Today" the dark card treatment since it's
  the highest-priority bucket, and give every bucket a distance rail so the set
  reads as an ordered sequence.
- Dropping a task into another bucket rewrites its **actual deadline** to the
  earliest date that still falls in that bucket (`BUCKET_START_DAYS`: 0/1/8/15/
  31/91/366 days out). Earliest-in-range is chosen over a midpoint because it
  preserves urgency, is deterministic, and is reversible — dragging back and
  forth lands on predictable dates rather than drifting. Drag-and-drop is
  mouse-only; the edit form is the keyboard-accessible equivalent.
- Archiving sets an `archived` flag and hides the task from the board, Home and
  Analytics; it never deletes. Hard delete stays available as a separate,
  clearly destructive action. Both are undoable.
- Pinning is orthogonal to done/undone: a pinned task sorts to the top of its
  bucket *even when completed*, and is marked with a lavender left border —
  deliberately a different visual channel from the strikethrough used for done.
- Task cards: no colored pill for the deadline. Show the date as a bold number
  + short label (e.g. large "12" over small "Aug"), similar to how the
  reference renders stat numbers.
- Reminders: represent as a small dot-grid/timeline strip per task rather than
  a list of chip badges.
- Add Task form: keep it plain and functional — this is a utility form, not a
  place to add decorative flourishes. Visual personality lives in the board,
  not the input fields.
