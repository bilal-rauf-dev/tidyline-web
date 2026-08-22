# TidyLine ADHD-first time-awareness refactor

Status: Phase 8 automated gate complete; live browser review pending
Branch: `refactor/adhd-first-time-awareness`

## North star

TidyLine should answer, with as few decisions as possible:

1. What do I need to do?
2. When do I actually need to start it?
3. What should I do right now?

The differentiator is calibrated time awareness: TidyLine learns the gap between estimates and actual duration, derives a useful `startBy`, and surfaces a small next action. It should not become a general-purpose productivity suite.

## Delivery rules

- Work only on the named refactor branch.
- Complete one phase and its verification gate before starting the next.
- Do not commit or create a PR; provide a suggested commit message at each phase boundary.
- Preserve existing local data through a defensive migration layer.
- Prefer deterministic, low-configuration behavior over new abstractions, settings, parser tokens, or dashboards.
- Keep the established visual language from `design.md` while reducing cognitive noise.

## Phase sequence

| Phase | Status | Boundary |
| --- | --- | --- |
| 1. Audit and architecture | Complete | Inventory verified; phase docs and dependency map complete; no product behavior changed |
| 2. Remove unnecessary surface area | Complete | Fixed three-route information architecture and reduced task model compile/build cleanly |
| 3. Calibration foundation | Complete | Start/actual duration persists safely; completion feedback and multiplier utilities tested |
| 4. Time-blindness model | Complete | Canonical calibrated duration, derived `startBy`, fit language, resurface behavior |
| 5. Now view | Complete | Low-decision one-task surface is the primary entry experience |
| 6. Reminders, PWA, and ICS | Complete | Honest reminder copy, install manifest, valid calendar export |
| 7. Routines | Complete | Small ordered-trigger routine flow, isolated from tasks and templates |
| 8. Polish and delivery | Automated gate complete; browser review pending | Responsive, accessible, migrated, documented, and fully green checks |

Phase 8 automated checks pass, including the final time-blindness scenario and workspace backup compatibility. Delivery remains pending the live visual and interaction review because the in-app browser runtime fails trusted-component initialization before it can reach localhost.
