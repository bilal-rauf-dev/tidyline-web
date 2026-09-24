-- Preserve an optional wall-clock due time alongside the existing due date.
-- Date-only tasks continue to use the app's 09:00 local reminder fallback.

alter table public.tasks
  add column if not exists deadline_time time;

alter table public.tasks
  drop constraint if exists tasks_deadline_time_requires_deadline;

alter table public.tasks
  add constraint tasks_deadline_time_requires_deadline
  check (deadline_time is null or deadline is not null);
