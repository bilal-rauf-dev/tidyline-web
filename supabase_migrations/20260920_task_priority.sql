-- Store the priority chosen in task forms or parsed by Quick Add.

alter table public.tasks
  add column if not exists priority text;

alter table public.tasks
  drop constraint if exists tasks_priority_valid;

alter table public.tasks
  add constraint tasks_priority_valid
  check (priority is null or priority in ('high', 'medium', 'low'));
