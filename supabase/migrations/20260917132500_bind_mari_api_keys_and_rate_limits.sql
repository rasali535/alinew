-- Bind customer Mari keys to the workspace they were created from and add
-- durable per-key rate-limit accounting for the public API.

alter table public.developer_api_keys
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Backfill legacy rows deterministically when an organization already had keys
-- before workspace binding was introduced. New keys are always created with the
-- authenticated workspace id by the server route.
update public.developer_api_keys k
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.organization_id = k.organization_id
  order by w.created_at asc nulls last, w.id asc
  limit 1
)
where k.workspace_id is null;

do $$
begin
  if exists (select 1 from public.developer_api_keys where workspace_id is null) then
    raise exception 'Cannot enforce developer_api_keys.workspace_id: legacy key exists without a workspace for its organization';
  end if;
end
$$;

alter table public.developer_api_keys
  alter column workspace_id set not null;

create index if not exists developer_api_keys_workspace_idx
  on public.developer_api_keys (workspace_id, created_at desc);

grant select, insert, update, delete on table public.developer_api_keys to service_role;
revoke all on table public.developer_api_keys from anon, authenticated;

create table if not exists public.developer_api_key_rate_limits (
  api_key_id uuid not null references public.developer_api_keys(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (api_key_id, window_start)
);

alter table public.developer_api_key_rate_limits enable row level security;
revoke all on table public.developer_api_key_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.developer_api_key_rate_limits to service_role;

create or replace function public.ralion_consume_api_key_rate_limit(
  p_api_key_id uuid,
  p_limit integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window_start timestamptz := date_trunc('minute', now());
  v_count integer;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
begin
  insert into public.developer_api_key_rate_limits (api_key_id, window_start, request_count)
  values (p_api_key_id, v_window_start, 1)
  on conflict (api_key_id, window_start)
  do update set request_count = public.developer_api_key_rate_limits.request_count + 1
  returning request_count into v_count;

  return query
  select
    v_count <= v_limit,
    greatest(v_limit - v_count, 0),
    v_window_start + interval '1 minute';
end;
$$;

revoke all on function public.ralion_consume_api_key_rate_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.ralion_consume_api_key_rate_limit(uuid, integer) to service_role;
