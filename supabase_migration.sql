create table if not exists public.tasks (
  id                uuid        primary key,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  title             text        not null default '',
  deadline          date,
  deadline_time     time,
  start_date        date,
  planned_date      date,
  original_deadline date,
  follow_up_date    date,
  scheduled_start   text,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  done              boolean     not null default false,
  pinned            boolean     not null default false,
  archived          boolean     not null default false,
  notes             text        not null default '',
  location          text        not null default '',
  duration          jsonb,
  energy_level      text,
  status            text        not null default 'active',
  waiting_for       text        not null default '',
  recurrence        jsonb,
  reminders         jsonb       not null default '[]'::jsonb,
  tags              jsonb       not null default '[]'::jsonb,
  checklist         jsonb       not null default '[]'::jsonb,
  links             jsonb       not null default '[]'::jsonb,
  attachments       jsonb       not null default '[]'::jsonb,
  postpone_history  jsonb       not null default '[]'::jsonb
);

alter table public.tasks enable row level security;

-- RLS: each user can only touch their own rows
create policy "Users can read own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create index if not exists tasks_user_id_idx on public.tasks(user_id);

-- ─── 2. User settings table ───────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id        uuid     primary key references auth.users(id) on delete cascade,
  workspace_name text     not null default '',
  theme          text     not null default 'dark',
  accent         text     not null default '#ff5a36',
  density        text     not null default 'comfortable',
  bucket_order   jsonb    not null default '["today","tomorrow","this-week","next-week","later"]'::jsonb,
  overload_hours numeric  not null default 6,
  confirm_delete boolean  not null default true,
  templates      jsonb    not null default '[]'::jsonb,
  saved_filters  jsonb    not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
