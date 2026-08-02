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
  Source of truth: `C:\Users\Kirig\Downloads\TidyLine_logo.svg`, copied
  into the repo at `public/logo.svg` (full color, for favicon/app-icon use)
  and `public/logo.png` (PNG fallback); the sidebar mark
  (`src/components/BrandMonogram.jsx`) extracts just the monogram path data
  from that source, recolored to `currentColor`.
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

## Component-specific direction (TidyLine)

- Home page (default route): a landing/summary view, not a data source of its
  own — every number on it is derived from the same task list and the same
  utils the other pages use. Structure, top to bottom:
  1. Left-aligned time-of-day greeting as the `h1` (sentence case, not
     centered, no gradient behind it, no eyebrow label above it), one line of
     body-copy subtext, and one primary CTA that jumps straight to the Board's
     add-task form with the title field focused (`/board?add=1`).
  2. An asymmetric bento grid below: a dark "due today" hero-stat card
     (identical treatment to the Board's Today card — it is the one dark card
     on this screen), a compact 5-week version of the Analytics activity
     heatmap, and a taller "coming up" card listing the next few upcoming
     tasks across all buckets using the same bold-day-number/small-month
     deadline treatment as task cards.
  - No new stat card types, no second accent color, and no card-per-metric
    uniform grid — reuse what the Board and Analytics pages already established.
- Bucket columns (Today/Week/2 Weeks/etc.): render as the bento grid above, not
  seven identical white boxes. Give "Today" the dark card treatment since it's
  the highest-priority bucket.
- Task cards: no colored pill for the deadline. Show the date as a bold number
  + short label (e.g. large "12" over small "Aug"), similar to how the
  reference renders stat numbers.
- Reminders: represent as a small dot-grid/timeline strip per task rather than
  a list of chip badges.
- Add Task form: keep it plain and functional — this is a utility form, not a
  place to add decorative flourishes. Visual personality lives in the board,
  not the input fields.
