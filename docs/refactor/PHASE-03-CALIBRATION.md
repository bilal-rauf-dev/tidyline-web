# Phase 3 — Calibration foundation

Status: Complete

Add safe task timing state (`startedAt`, `actualMinutes`, and sessions only if needed), a simple Start action, elapsed-time completion capture, reload/closure-safe active sessions, flat completion comparison, and a robust median estimate multiplier. Add canonical duration-estimation utilities and tests for explicit, missing, invalid, fallback, and calibrated estimates.

Suggested commit message: `feat: add actual-time calibration foundation`

## Implementation record

- Added `startedAt` and `actualMinutes` to normalized tasks and schema version 3.
- Start persists an active interval. Pause adds its elapsed minutes to the accumulated total and clears the active interval. Resume starts another interval without losing earlier time.
- Completion closes an active interval, stores the final elapsed total, and clears `startedAt`. Active intervals survive reload through normal task persistence.
- Recurring instances and duplicates reset timing state; bulk completion safely closes active intervals.
- Added neutral completion feedback in the form `Estimated 30m · took 1h 10m.`
- Added a robust global calibration multiplier using the median of valid actual/estimate ratios after three samples, bounded to 0.5×–4×.
- Added one canonical duration estimator: explicit estimates are calibrated when enough data exists; missing estimates use median completed duration and then a 45-minute fallback. No missing estimate becomes zero.
- Added concise calibrated-duration labels and read-only calibration visibility in Settings.

Session history was deliberately not added. The smaller accumulated-interval model handles pauses and reloads without creating a timer product or retaining unnecessary event history. Tag-specific calibration remains optional and deferred.

## Verification gate

`npm run check` covers start, pause, resume, completion, elapsed calculation, reload normalization, invalid timing data, explicit/missing/zero duration, multiplier bounds and sample thresholds, median history, conservative fallback, UI rendering, migration, build, and lint.
