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

## Component-specific direction (TidyLine)

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
