# Browser and device acceptance matrix

Use this matrix for WEB-01 through WEB-04 and the cross-device REL items. Record browser and OS versions, date, test account, and pass/fail evidence for each run. An emulator is useful for layout checks; notification and background behavior require real devices.

| Environment | Core planning | Sync and recovery | Reminder behavior |
| --- | --- | --- | --- |
| Android phone: current Chrome | Create, edit, schedule, reschedule, complete, import/export by touch | Airplane mode, reconnect, refresh with pending edit, second device | Permission, foreground, background, closed page, snooze, complete action |
| iPhone: current Safari browser tab | Same core actions without Home Screen addition | Same sync and recovery checks | In-page reminder behavior; clearly explain the background-push limitation |
| iPhone: Home Screen web app | Same core actions | Same sync and recovery checks | Opt-in Web Push, locked phone, closed app, notification tap |
| iPad: Safari browser tab and Home Screen web app | Touch and keyboard, portrait and landscape | Same sync and recovery checks | Test each context separately |
| Windows laptop: Chrome and Edge | Mouse and keyboard, 200% zoom | Two tabs, offline edits, failed write, reconnect | Permission, background, closed page, multiple tabs |
| macOS laptop: Safari | Mouse and keyboard, 200% zoom | Two tabs, offline edits, reconnect | Permission, background, closed page |

## Core journey checks

1. A guest creates tasks and returns after closing and reopening the browser. Existing data remains present.
2. A signed-in user edits the same task on two devices. The UI exposes any unresolved conflict and does not silently overwrite a newer edit.
3. A signed-in user edits while offline, refreshes, reconnects, and sees the edit reach the second device.
4. A malformed import shows rejected records and preserves the current task list. A valid import shows a preview before replacement.
5. A reminder due while the app is closed is delivered on supported platforms, opens the relevant task, and does not complete or snooze twice when multiple tabs are open.
6. A user schedules and moves a task and changes block duration using touch and keyboard without dragging.
7. Dialog focus starts inside, remains inside while open, and returns to the invoking control when closed.
8. At 320px width and 200% zoom, navigation, task editing, calendar, planner, and settings remain operable without clipped controls.

## Release evidence

For each work item, note the implementation reference, automated check results, device/browser results, and any remaining limitation in the improvement plan or its linked change notes. Do not infer notification support solely from API feature detection; run an actual delivery test.

## Results so far

2026-09-18, Codex in-app browser on Windows, local guest mode: import review displayed the selected task and replacement count; Cancel left the workspace unchanged. A guest task remained after reloading the Board route, and a returning guest reopened directly into the workspace. These checks do not cover mobile browsers, signed-in sync, or closed-page reminders.

2026-09-18, Codex in-app browser on Windows, production preview: the service worker reported its core files cached, but reloading `/settings` after stopping the server rendered a blank page. The worker simulation passed route and asset cache checks, and every precache URL returned HTTP 200. WEB-02 is still open; test an ordinary browser's offline developer setting and real device airplane mode to distinguish this browser environment from an app failure. Settings displayed the existing browser notification permission as blocked and accurately described the open-page reminder limit; no delivery was tested.

2026-09-18, Codex in-app browser on Windows, local guest mode: a task was scheduled for 09:00 through the Day planner's time control, changed to 45 minutes through its duration control, and moved one day through the Calendar's date control. The planner's controls were visible in a 320px viewport. This is an interaction and layout spot check; a real touch device and keyboard-only run remain open.
