-- Background reminder delivery for signed-in users.
-- Apply after supabase_migration.sql and 20260918_atomic_task_replace.sql.

create table if not exists public.push_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  endpoint           text not null unique,
  p256dh             text not null,
  auth_key           text not null,
  expiration_time    bigint,
  timezone           text not null default 'UTC',
  user_agent         text not null default '',
  enabled            boolean not null default true,
  last_seen_at       timestamptz not null default now(),
  last_success_at    timestamptz,
  last_error_at      timestamptz,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions(user_id, enabled);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read own push subscriptions" on public.push_subscriptions;
create policy "Users can read own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Register through a function so a browser endpoint can move safely between
-- accounts on a shared device. This prevents the previous account continuing
-- to receive reminders after the browser is signed into a different account.
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_key text,
  p_expiration_time bigint,
  p_timezone text,
  p_user_agent text
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  subscription public.push_subscriptions;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(length(trim(p_endpoint)), 0) = 0 or
     coalesce(length(trim(p_p256dh)), 0) = 0 or
     coalesce(length(trim(p_auth_key)), 0) = 0 then
    raise exception 'A complete push subscription is required';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id <> current_user_id;

  insert into public.push_subscriptions (
    user_id, endpoint, p256dh, auth_key, expiration_time,
    timezone, user_agent, enabled, last_seen_at, updated_at
  ) values (
    current_user_id, p_endpoint, p_p256dh, p_auth_key, p_expiration_time,
    coalesce(nullif(trim(p_timezone), ''), 'UTC'), coalesce(p_user_agent, ''),
    true, now(), now()
  )
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
    expiration_time = excluded.expiration_time,
    timezone = excluded.timezone,
    user_agent = excluded.user_agent,
    enabled = true,
    last_seen_at = now(),
    updated_at = now()
  returning * into subscription;

  return subscription;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, bigint, text, text) from public;
revoke all on function public.register_push_subscription(text, text, text, bigint, text, text) from anon;
grant execute on function public.register_push_subscription(text, text, text, bigint, text, text) to authenticated;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.push_subscriptions
  where user_id = auth.uid() and endpoint = p_endpoint;
$$;

revoke all on function public.unregister_push_subscription(text) from public;
revoke all on function public.unregister_push_subscription(text) from anon;
grant execute on function public.unregister_push_subscription(text) to authenticated;

create table if not exists public.reminder_deliveries (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  task_id            uuid not null references public.tasks(id) on delete cascade,
  subscription_id    uuid not null references public.push_subscriptions(id) on delete cascade,
  reminder_id        text not null,
  scheduled_for      timestamptz not null,
  payload            jsonb not null,
  status             text not null default 'pending'
                     check (status in ('pending', 'sending', 'retry', 'sent', 'failed')),
  attempt_count      integer not null default 0,
  next_attempt_at    timestamptz not null default now(),
  claimed_at         timestamptz,
  sent_at            timestamptz,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (subscription_id, task_id, reminder_id, scheduled_for)
);

create index if not exists reminder_deliveries_retry_idx
  on public.reminder_deliveries(status, next_attempt_at);
create index if not exists reminder_deliveries_user_created_idx
  on public.reminder_deliveries(user_id, created_at desc);

alter table public.reminder_deliveries enable row level security;

drop policy if exists "Users can read own reminder deliveries" on public.reminder_deliveries;
create policy "Users can read own reminder deliveries"
  on public.reminder_deliveries for select
  using (auth.uid() = user_id);

-- Atomically claim a small batch. A stale claim is retried after five minutes,
-- which covers a function stopping after claiming but before sending.
create or replace function public.claim_reminder_deliveries(p_limit integer default 100)
returns table (
  delivery_id bigint,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_key text,
  payload jsonb,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select d.id
    from public.reminder_deliveries d
    join public.push_subscriptions s on s.id = d.subscription_id
    where s.enabled = true
      and (
        (d.status in ('pending', 'retry') and d.next_attempt_at <= now())
        or (d.status = 'sending' and d.claimed_at < now() - interval '5 minutes')
      )
    order by d.next_attempt_at, d.id
    for update of d skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ), claimed as (
    update public.reminder_deliveries d
    set status = 'sending',
        attempt_count = d.attempt_count + 1,
        claimed_at = now(),
        updated_at = now()
    from candidates c
    where d.id = c.id
    returning d.*
  )
  select
    d.id,
    s.id,
    s.endpoint,
    s.p256dh,
    s.auth_key,
    d.payload,
    d.attempt_count
  from claimed d
  join public.push_subscriptions s on s.id = d.subscription_id;
end;
$$;

revoke all on function public.claim_reminder_deliveries(integer) from public;
revoke all on function public.claim_reminder_deliveries(integer) from anon;
revoke all on function public.claim_reminder_deliveries(integer) from authenticated;
grant execute on function public.claim_reminder_deliveries(integer) to service_role;
