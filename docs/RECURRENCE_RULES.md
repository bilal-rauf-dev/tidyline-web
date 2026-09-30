# Recurring task rules

Updated: 2026-09-20. These rules define how TidyLine creates the next task in a recurring series.

## Completion and catch-up

- Completing a recurring task creates one new incomplete task.
- The next deadline is strictly after both the completed task's deadline and the completion day in the user's local time zone.
- If the task is overdue, missed occurrences are skipped. TidyLine does not create a backlog of repeated tasks.
- Completing a future task early keeps the series on its existing cadence.
- Bulk completion follows the same rule as completing one task.

## Calendar anchors

- Daily and every-N-days schedules keep their interval from the current instance.
- Weekday schedules choose the next Monday through Friday.
- Weekly schedules retain their selected weekday.
- Monthly schedules retain the original day of the month. If that day does not exist, the occurrence lands on the month's final day. A series anchored on January 31 therefore uses February 28 or 29 and returns to March 31.
- Yearly schedules retain the original month and day. A February 29 series uses February 28 in ordinary years and returns to February 29 in leap years.
- Reusable templates keep the frequency but take their monthly or yearly anchor from the new task's deadline.

Existing series created before these rules store no separate anchor. TidyLine adopts the current task deadline as their anchor the next time they load. If an older series already drifted after a short month, set it to **Does not repeat**, move it to the intended calendar date, and enable the recurrence again to establish the intended anchor.

Recurring reminder calculations use the same month-end rules. Their starting date is interpreted in the subscribed device's time zone for background delivery and in the current device's local time for open-page delivery.
