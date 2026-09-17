-- Keep exactly one mutable rate-limit counter row per API key.
-- This avoids unbounded per-minute row growth while preserving atomic enforcement.

alter table public.developer_api_key_rate_limits
  drop constraint if exists developer_api_key_rate_limits_pkey;

alter table public.developer_api_key_rate_limits
  add constraint developer_api_key_rate_limits_pkey primary key (api_key_id);

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
  v_effective_window timestamptz;
  v_count integer;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
begin
  insert into public.developer_api_key_rate_limits (api_key_id, window_start, request_count)
  values (p_api_key_id, v_window_start, 1)
  on conflict (api_key_id)
  do update set
    window_start = case
      when public.developer_api_key_rate_limits.window_start < v_window_start then v_window_start
      else public.developer_api_key_rate_limits.window_start
    end,
    request_count = case
      when public.developer_api_key_rate_limits.window_start < v_window_start then 1
      else public.developer_api_key_rate_limits.request_count + 1
    end
  returning request_count, window_start into v_count, v_effective_window;

  return query
  select
    v_count <= v_limit,
    greatest(v_limit - v_count, 0),
    v_effective_window + interval '1 minute';
end;
$$;

revoke all on function public.ralion_consume_api_key_rate_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.ralion_consume_api_key_rate_limit(uuid, integer) to service_role;
