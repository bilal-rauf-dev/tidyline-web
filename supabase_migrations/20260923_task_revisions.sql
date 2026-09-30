-- Prevent two browsers from silently overwriting the same task.
-- The client updates or deletes a row only when this revision still matches
-- the version it last read. Successful edits increment the revision.

alter table public.tasks
  add column if not exists revision bigint not null default 1;

alter table public.tasks
  drop constraint if exists tasks_revision_positive;

alter table public.tasks
  add constraint tasks_revision_positive check (revision >= 1);
