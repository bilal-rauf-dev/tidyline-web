-- Run after supabase_migration.sql on existing or new Supabase projects.
-- A failed insert rolls back the delete because the function runs in one transaction.
create or replace function public.replace_user_tasks(p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Expected an array of task rows';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) as entry(value)
    where entry.value->>'user_id' is distinct from current_user_id::text
  ) then
    raise exception 'Task rows must belong to the signed-in user';
  end if;

  delete from public.tasks where user_id = current_user_id;
  insert into public.tasks
  select * from jsonb_populate_recordset(null::public.tasks, p_rows);
end;
$$;

revoke all on function public.replace_user_tasks(jsonb) from public;
revoke all on function public.replace_user_tasks(jsonb) from anon;
grant execute on function public.replace_user_tasks(jsonb) to authenticated;
