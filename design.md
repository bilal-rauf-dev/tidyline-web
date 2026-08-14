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
- Home soft blue surface: `#CFE5F2`
- Home soft pink surface: `#EADCF0`
- Raised neutral surface: `#FAF9F7`
- Editorial blue surface: `#D8EBF5`
- Editorial pink surface: `#F0E2F1`
- Editorial lavender surface: `#DED8F7`
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

**Override (data-dense pages):** Analytics may mix white (`--surface`), dark
(`--surface-dark`), coral (`--accent`) and lavender chart geometry. Home has a
broader, intentional editorial palette: white and dark anchors, coral for the
progress card, lavender as a full activity-card surface, plus muted blue and
soft pink surfaces. These extra surfaces are Home-only layout tools, not new
semantic status colors and not available to task badges, forms, or Board cards.
In dark mode they become opaque deep blue `#24353F` and plum `#382D3D`; they
never use transparency or glass effects. Task-surface pages (Board, Calendar,
Settings) keep the original one-dark-card discipline.
Lavender remains a light surface in both themes and therefore always uses the
light-theme dark ink `#14141A` for accessible contrast.

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
  shape except a genuine toggle switch and the explicitly documented distance
  rail track. The rail is positional chart geometry, never a badge or button.
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
- The sticky due-today summary uses two fixed, out-of-flow
  `IntersectionObserver` markers before the bucket grid: one collapse marker
  and one earlier expand marker. Keep scroll anchoring disabled on the dynamic
  bucket region so the summary's own height transition cannot feed back into
  its compact state. Do not derive this state from the summary card's geometry
  or a raw `window.scrollY` threshold.
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

### Application-wide editorial composition

- Every route uses the same dark navigation rail, large sentence-case page
  heading, flat bordered surfaces, and compact controls. The rail includes an
  inline task search with task-only results; Command Palette remains a separate
  command and navigation interface.
- The editorial blue, pink and lavender surfaces are hierarchy tools, not
  categories. A page may use at most two of them alongside white and one dark
  anchor. They never replace semantic overdue, risk, completion, or waiting
  treatments.
- Board columns may use tinted surfaces to make deadline distance scannable,
  but task data and drag destinations continue to come from the configured
  canonical bucket list. Calendar tasks use compact, fully bordered blocks; Planner
  blocks rotate through the same three quiet surfaces while position and height
  remain the actual time and duration encodings.
- Desktop Settings is a two-column collection of real setting groups rather
  than a long undifferentiated stack. Someday / Maybe pairs a sticky capture
  card with a three-column idea grid. Both collapse to one column based on the
  route container, not the physical display resolution.
- Dialogs use a shared maximum width, bordered surface, sticky heading and
  grouped field regions. Quick Add and Command Palette share the same compact
  command-surface proportions and selection language.
- **Local profile setup** (`WelcomeDialog.jsx`, `useProfile.js`) is the first
  screen on a fresh browser profile. It collects an optional workspace name,
  lets the person pick the existing single accent token, and may import an
  existing JSON task export before entering the app. “Start as guest” stores
  the same local-only record with the name `Guest`. This is explicitly not
  authentication: no network request, account, credential, or backend is
  introduced. The stored name replaces the navigation wordmark and remains
  editable from Settings.
- Responsive order is semantic source order. At narrow widths, navigation
  becomes the existing drawer, mosaics stack, Planner returns unscheduled work
  before the timeline, Settings becomes one column, and dialogs become nearly
  full-viewport without horizontal overflow.

## Data visualization

## Complete-state styling

TidyLine does not use one-sided accent borders or coloured edge strips as a
general card treatment. Borders are normally complete and structural. The one
deliberate exception is the persistent dark sidebar: its active route uses the
original slim coral navigation rail, full-white text, and the existing line
icon, with no filled active tile. Accent colour otherwise belongs in fills,
controls, indicators, charts, or complete visual treatments.

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

- **Distance rail** (`DistanceRail.jsx`) — the one intentional pill-shaped
  chart container in the system. A muted rounded track holds one evenly spaced
  circular node per currently enabled bucket, joined by a thin **dashed** line.
  The current bucket node is solid `--accent`; every other node stays outlined
  and muted. The dashed connector never fills, so the rail reads as ordered
  timeline position rather than completion percentage. Dark cards keep the
  same geometry and switch only to the existing on-dark line tokens.

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
- **Custom checkbox** (`Checkbox.jsx`, `.custom-checkbox`) — a small square
  control using the shared line-icon language. Its unchecked state is a
  `--line` border; its checked state uses `--accent` with a white check glyph.
  Use it for task completion, selection, checklist items and confirmation
  preferences instead of the browser-default checkbox.
- **Confirmation dialog** (`DeleteConfirmDialog.jsx`) — a token-derived
  `--surface` card on the same dark scrim as the command palette, with a 1px
  `--line` border and no shadow. It enters with the standard short fade and
  restrained scale/translate motion; actions use existing button primitives.
- **Select menu** (`SelectMenu.jsx`, `.select-*`) — the shared replacement for
  native `<select>` chrome. The trigger is a bordered `--surface` button with
  `--radius-btn`; the menu is another bordered surface with no shadow, small
  gaps between options, and a quiet filled selected surface. Its
  short translate/fade entrance and item presses use the standard motion
  tokens. Board filters, reminder presets, recurrence and duration all use it.
- **Creation detail panel** (`TaskDraftDetails.jsx`, `.task-draft-details`) —
  the optional inline extension of Add Task. It reuses the same Notes,
  Checklist, Links, Attachments, Location, Estimate, Energy, Waiting and Repeat
  controls as an expanded task, starts collapsed, and stays inside the utility
  form rather than becoming a modal or separate workflow. Its template picker
  prefills reusable details only; title and deadline always stay task-specific.
- **Tag mark** (`TagList.jsx`) — flat, lightly bordered rectangle with a
  restrained tinted surface, **never a rounded pill**. Tone is assigned deterministically by
  hashing the tag name across three palette values only (neutral, lavender,
  coral), so a given tag is always the same colour and no new hues enter.
- **Energy selector/mark** (`EnergyLevelControl.jsx`, `.energy-*`) — a compact
  segmented control for the optional `low`, `normal`, and `deep-focus` values,
  including an explicit Unset state. Task cards render the value as a small
  dot plus plain label, never as a filled pill badge.
- **Day-context panel** (`DayContext.jsx`) — fully bordered lavender panel that
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
- **Task-added toast** (`TaskAddedToast.jsx`) — the same dark, bottom-centred
  toast surface and six-second timing as Undo. It shows the real created task
  title and an underlined Edit action that navigates to and expands that task;
  it introduces no new notification surface or colour.
- **Distance rail** is documented under chart primitives above.
- **Countdown label** (`.countdown`) — plain bold micro-text on the card
  ("3 days left", "today", "2 days overdue"), turning accent-coloured once
  negative. Text only; never a coloured pill.
- **Deadline risk mark** (`risk.js`, `.risk-mark`) — a derived plain-text mark
  whose text and nearby dot provide its tone. Neutral = low risk, lavender = getting tight, accent =
  at risk. It is never stored or backfilled and never becomes a filled badge;
  the score recomputes from time, estimate, open checklist work, postponements,
  same-day load and optional energy on each Board time tick. The exact weights
  and thresholds live beside the heuristic in `risk.js`.
- **Task flag row** (`.task-meta`) — the collapsed card's summary line: the
  countdown plus small glyphs for repeat/notes/links and text counts for
  checklist progress (`1/3`) and duration. Glyphs only appear when the field
  has content, so a bare task stays bare. This is what keeps rich detail from
  making every card noisy.
- **Task detail dialog** (`TaskDetailDialog.jsx`, `.task-detail-*`) — the task
  card's maximize-style open-details icon launches the complete Notes/
  Checklist/Links/Attachments/Location/
  Estimate/Repeat/Reminders editor in a centred overlay card. It uses the same
  token-derived scrim, border, radius and restrained fade/scale/translate
  motion as confirmation dialogs, closes on outside click or Escape, and
  never expands the bucket column inline.
- **Bucket configuration menu** (`BucketConfigMenu.jsx`, `.bucket-config-*`) —
  a multi-select Settings dropdown built from the shared custom checkbox and
  select-surface language. Options retain canonical chronological order;
  Today and Later are disabled/required anchors. The panel uses the standard
  short translate/fade transition and no shadow.
- **Saved filter bar** (`SavedFilterBar.jsx`, `.saved-filter-*`) — a flat,
  fully bordered surface above Board filters. A standard select menu applies named
  filter snapshots; adjacent plain inputs save/delete them. Saved views compose
  existing search, tag, status, energy, duration, pin, date and sort fields and
  never create a second project/category taxonomy.
- **Planner block** (`PlannerPage.jsx`, `.planner-block`) — a rectangular dark
  time block on an hourly ruled surface. Vertical position encodes
  `scheduledStart`; height encodes the existing duration. The coral resize edge
  is functional chart geometry, not decoration. No shadows, rounded pills or
  calendar-event gradients.
- **Workload redistribution dialog** (`WorkloadRedistributeDialog.jsx`) — the
  standard confirmation-dialog surface showing a proposed list of deadline
  moves before any mutation. Flexible means active, unpinned, non-waiting,
  non-recurring and not already time-blocked. Candidate dates are the next
  three days and respect start dates; confirmation uses normal Calendar
  rescheduling so later moves enter postpone history.
- **Daily shutdown dialog** (`ShutdownDialog.jsx`) — a manually opened standard
  dialog from Home. It summarizes actionable due/planned work for the local
  day and gives each unfinished task Tomorrow, another date, keep, and archive
  actions. It never auto-opens and adds no prompt preference or stored status.
- **Overdue tier card** (`.overdue-group`) — severity is expressed by complete
  border and palette intensity: neutral (yesterday) → lavender (a few days) →
  accent (a week or more). No new hues, no red,
  no alarm iconography.
- **Bucket progress bar** (`.bucket-progress`) — 3px flat lavender fill on a
  `--line` track at the head of each bucket. Square ends, same language as the
  milestone bar, just smaller.
- **Command palette** (`CommandPalette.jsx`) — centred card on a token-derived
  scrim, reusing `--surface`, `--radius-card` and a 1px `--line` border. The
  search row is an underline field, not a rounded pill, and the active row is
  marked with a filled selected surface. No shadow.
- **Accent swatch** (`.accent-swatch`) — small rounded-rect colour buttons in
  Settings; the selected one is ringed with a `--text` border rather than a
  checkmark.
- **Drag affordance** (`.task-grip`) — a six-dot grip glyph at the start of a
  task row. Cards are `draggable` only when selection mode is off; in selection
  mode the grip is replaced by a checkbox and dragging is disabled so the two
  interactions cannot conflict.
- **Quick Add Modal** (`QuickAddModal.jsx`, `.quick-add-palette`) — centred card on a
  token-derived scrim, reusing `--surface`, `--radius-card` and a 1px `--line`
  border (visually identical to the Command Palette). Features a top input field and
  a live chip container showing matched fields as removable/editable flat bordered
  tags (`.tag-list`, `.tag`), plus an unambiguous resolved date preview.
  Triggered via the `N` or `Q` keyboard shortcuts or the command palette.
  Closes via `Esc` or background click. `Shift+Enter` opens the full inline form
  with all parsed fields pre-filled.

  **Supported natural-language syntax (stripping order preserves indices):**

  | Token | Example | Field |
  |-------|---------|-------|
  | `#tag` | `#university` | `tags[]` |
  | `!high` / `p1` | `!high`, `p2` | `priority` (preview chip only) |
  | `@deep` / `@low` | `@deep-focus`, `@normal` | `energyLevel` |
  | `for Nh` / `for Nm` | `for 2h`, `for 45m` | `duration` |
  | `remind Nh before` | `remind 30m before` | `reminders[]` relative |
  | `every …` | `every weekday`, `every Monday`, `every 2 weeks` | `recurrence` |
  | `start <day>` | `start Monday`, `start next week` | `startDate` |
  | `plan today` | *(two-word form)* | `plannedDate` = today |
  | deadline phrase | `tomorrow 8pm`, `next Friday`, `due Monday` | `deadline` |

  Prepositions `due on / due / by` immediately preceding a deadline phrase are
  absorbed so they don't leak into the cleaned title.

  **Autocomplete:** typing `#` followed by partial text shows a keyboard-navigable
  dropdown of matching tags from existing tasks. Tab or Enter applies the top suggestion.
  Example hint pills below the chip row append syntax tokens to the current input on click.

  **Validation (live, never silent):** reminder-without-deadline and invalid duration
  surface as amber bordered warning chips and block submission with an inline message.
  Zero-value durations are preserved in the preview but flagged.



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
- Active nav item indicator: the original slim coral rail at the left edge of
  the active row, paired with full-white text and the existing line icon. The
  row itself stays unfilled.
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
- Route grids also respond to the **available content width**: at 680px or
  less beside the sidebar, Board buckets and Home/Analytics cards become one
  full-width column. This covers small tablets where the outer viewport is
  wide but the permanent sidebar leaves phone-sized route space.
- Backdrop is the dark surface token at 45% alpha (`color-mix`), not a new
  color and not a frosted/blurred panel. A preceding
  `rgba(20, 20, 22, 0.45)` declaration is the compatibility fallback for
  browsers without `color-mix()`; supporting browsers override it with the
  token-derived value.
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
  location, duration, energy, reminders, recurrence rule, and the number of
  lead days between start and deadline (shifted onto the new occurrence, not
  copied as an old absolute date). Reset: `done`, `completedAt`, `pinned`,
  `plannedDate`, `scheduledStart`, waiting state, `postponeHistory`, and every
  checklist tick; the new deadline becomes that instance's `originalDeadline`.
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
- **Start date gates Board availability.** `startDate` is nullable and remains
  separate from `deadline`. While `startDate` is after the local current date,
  the task appears only in the Board's Upcoming section and is omitted from
  deadline buckets and overdue calculations. At or after the start date it
  enters normal bucketing automatically. Creation and editing block
  `startDate > deadline`; imported invalid start dates normalize to null.
- **Energy is opt-in.** `energyLevel` is nullable and accepts only `low`,
  `normal`, or `deep-focus`. Existing tasks stay unset; no default is
  backfilled. Board filtering is exact-match, including an Unset option.
- **Planning does not rewrite the deadline.** `plannedDate` stores a local
  `YYYY-MM-DD`, not a boolean. A task planned for the current date appears in
  Today while continuing to display its real deadline. Stale dates are ignored
  immediately and cleared from storage on the minute maintenance tick. A
  future start date still gates the task; bucket drag clears `plannedDate` so
  the drop remains authoritative.
- **Postponements are append-only task history.** `postponeHistory` contains
  `{ from, to, at, source }` records. A record is appended only when a real
  deadline moves later, whether through manual edit, Board drag, or Calendar
  drag; earlier moves never count. `originalDeadline` is captured when the
  task instance is created, so an earlier edit before the first postponement
  cannot erase the true original date. Recurring next instances and duplicates
  capture their own new original deadline and begin with empty history.
- **Time blocking is additive.** `scheduledStart` is a nullable local datetime.
  The Day planner positions the task from that value and sizes it from the
  existing duration (30 minutes when unset). Moving a block rewrites only
  `scheduledStart`; resizing rewrites duration; removing it clears only
  `scheduledStart`. Deadline bucketing is unaffected.
- **Templates contain reusable configuration only.** Stored separately in
  `localStorage` as `tidyline:task-templates`. A template may contain notes,
  tags, checklist text, duration, reminder settings and recurrence. It never
  stores title, deadline, start date, energy, planning, waiting, completion or
  scheduling state. Applied checklist items receive fresh IDs.
- **Saved views are filter snapshots.** Stored in `localStorage` as
  `tidyline:saved-filters`; applying one replaces the complete Board filter and
  sort state. Duration values are normalized to minutes for comparison, and
  tasks without an estimate count as zero minutes.
- **Waiting is blocked, not completed.** `status: 'waiting'` carries
  `waitingFor` and `followUpDate`. Waiting cards stay in their deadline bucket
  with a muted complete border and reduced emphasis but are excluded from actionable Today and
  overdue metrics. At the local follow-up date the minute maintenance pass
  restores `status: 'active'` and clears both waiting fields. No implicit
  browser notification is fired: notification permission remains tied to an
  explicit reminder choice, while release back to the Board is automatic.
- **Someday/Maybe has a genuinely null deadline.** `deadline: null` records live
  only on the Someday page and are excluded from Board buckets, Calendar, Home
  and Analytics deadline metrics. Promotion assigns the first real deadline
  and captures it as `originalDeadline`; it does not recreate or duplicate the
  task.
- **Calendar overload is estimate-only and user-configurable.** The persisted
  `tidyline:overload-hours` threshold defaults to 6 hours. Calendar cells sum
  real task estimates and separately disclose unestimated tasks; missing
  estimates add zero rather than fabricated time. Overloaded days use a flat
  accent outline. Redistribution is always previewed and confirmed, never
  automatic.
- **Postpone Analytics reads append-only history.** Average postponements uses
  every deadline-bearing task, including zero-history tasks. The top-task list
  sorts by history length; tag columns add each task's full postpone count to
  every existing tag on that task. Untagged tasks affect the average but do not
  invent an “untagged” category.
- **Visible bucket configuration is a persisted ordered subset.** Stored in
  `localStorage` as `tidyline:bucket-order`, normalized against the canonical
  Today → Later order on every load. Today and Later are always restored if a
  stored value omits them. When an intermediate bucket is hidden, its deadline
  range rolls forward into the next visible stage; Analytics and every distance
  rail use that same active subset rather than the fixed seven-stage list.

## Component-specific direction (TidyLine)

- Home page (default route): a landing/summary view, not a data source of its
  own. It uses a single 12-column **editorial mosaic**, not a hero followed by
  a separate uniform card grid. Every number and task title is derived from the
  shared task list and existing utilities.
  1. The oversized time-aware greeting is an unframed editorial introduction
     with Add Task and Review the Day actions—no colored card behind it. A
     bordered white Daily Activity planner canvas sits alongside it. The canvas
     renders only tasks actually placed in Day Planner (`scheduledStart` plus
     duration), with compact colored schedule blocks, collision-aware lanes,
     and a coral current-time marker. Reminder times do not appear there.
  2. The dark Today card is the visual anchor, but it occupies one content row
     only—it never spans later dashboard rows and must not inherit their total
     height. Lavender Activity and dark Weekly Pace are an explicit equal-width
     pair, coral Overall Progress, muted-blue Completion Rhythm, a wide white
     Coming Up list, and cards of deliberately different widths/heights build
     around it.
     Color blocks create depth; no card uses a shadow or translucent surface.
  3. **Home feature slideshow** (`HomeDaybreak.jsx`, `.home-daybreak`) is the
     intentionally non-metric editorial card. It rotates through three original
     inline SVG illustrations for real TidyLine capabilities—deadline planning,
     focus planning, and end-of-day review—with text-only feature copy. Slides
     advance automatically and can be changed with previous/next controls. It
     must not acquire fabricated metrics, stock imagery, avatars, team members,
     or mood states.
  4. The mosaic responds to the content width beside the sidebar. It becomes a
     deliberate two-column composition at 1120px, gives Today a full row below
     820px, and becomes one readable column below 680px. Activity and Weekly
     Pace stay in their 50/50 pair until that one-column threshold. The dark
     **Weekly Pace** card uses five real weekly `completedAt` totals and compares
     the current week against their average; it never reconstructs missing
     completion history. Source order remains greeting, timeline, Today,
     Activity, Weekly Pace, illustration, progress, upcoming, completion so
     mobile reading order is useful.
  - Existing ring, milestone, activity-grid and sparkline primitives remain
    valid, but Home is not required to force every new visual region into a
    chart primitive. Its tinted surface cards and illustration are finalized
    Home-specific primitives.
- Analytics page: five cards of varied shapes, never a uniform grid.
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
  5. **Completion rhythm** (white, small) — a 14-day sparkline and total based
     only on recorded `completedAt` values. Missing historical timestamps are
     left missing rather than reconstructed or fabricated.
  - Deliberately *not* built: mood tracking, a projects list, and a team
    section from the reference. This app has no data for any of them, and
    inventing placeholder data for a dashboard would make it lie.
- Bucket columns (Today/Week/2 Weeks/etc.): render the currently enabled subset
  as the bento grid above, not identical white boxes. Give "Today" the dark card
  treatment since it's the highest-priority bucket, and give every visible
  bucket a distance rail so the set reads as an ordered sequence.
- Dropping a task into another bucket rewrites its **actual deadline** to the
  earliest date represented by that bucket in the current visible subset. The
  start is one day after the previous visible bucket's canonical upper bound;
  for example, if Week is hidden, 2 Weeks begins at day 1 instead of day 8.
  Earliest-in-range preserves urgency and remains deterministic/reversible.
  Drag-and-drop is mouse-only; the edit form is the keyboard-accessible
  equivalent.
- Archiving sets an `archived` flag and hides the task from the board, Home and
  Analytics; it never deletes. Hard delete stays available as a separate,
  clearly destructive action. Both are undoable.
- Pinning is orthogonal to done/undone: a pinned task sorts to the top of its
  bucket *even when completed*, and is marked with a lavender complete border —
  deliberately a different visual channel from the strikethrough used for done.
- Task cards: no colored pill for the deadline. Show the date as a bold number
  + short label (e.g. large "12" over small "Aug"), similar to how the
  reference renders stat numbers.
- Reminders: represent as a small dot-grid/timeline strip per task rather than
  a list of chip badges.
- Add Task form: keep it plain and functional — this is a utility form, not a
  place to add decorative flourishes. Visual personality lives in the board,
  not the input fields.
