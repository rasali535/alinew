-- Ralion OS customer Mari API-key lifecycle hardening
-- Raw API keys are never persisted; only SHA-256 hashes and display prefixes live here.

alter table public.developer_api_keys
  add column if not exists revoked_at timestamptz,
  add column if not exists rotated_at timestamptz,
  add column if not exists environment text not null default 'live',
  add column if not exists rate_limit_per_minute integer not null default 60;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'developer_api_keys_environment_check'
      and conrelid = 'public.developer_api_keys'::regclass
  ) then
    alter table public.developer_api_keys
      add constraint developer_api_keys_environment_check
      check (environment in ('live'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'developer_api_keys_rate_limit_check'
      and conrelid = 'public.developer_api_keys'::regclass
  ) then
    alter table public.developer_api_keys
      add constraint developer_api_keys_rate_limit_check
      check (rate_limit_per_minute between 1 and 10000);
  end if;
end
$$;

create unique index if not exists developer_api_keys_key_hash_unique
  on public.developer_api_keys (key_hash);

create index if not exists developer_api_keys_org_created_idx
  on public.developer_api_keys (organization_id, created_at desc);

create index if not exists developer_api_keys_active_hash_idx
  on public.developer_api_keys (key_hash)
  where revoked_at is null;

-- Management is server-only through authenticated Ralion API routes. Keep RLS as
-- defense in depth and remove the old broad ALL policy from the exposed schema.
alter table public.developer_api_keys enable row level security;
drop policy if exists "Org members view API keys" on public.developer_api_keys;
revoke all on table public.developer_api_keys from anon, authenticated;
