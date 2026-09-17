-- Ralion OS — Mari Intelligence API
-- Tenant-bound API keys, scopes, revocation and usage accounting.

begin;

create table if not exists public.mari_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['intelligence:read','knowledge:read']::text[],
  status text not null default 'ACTIVE',
  monthly_request_limit integer not null default 1000,
  monthly_credit_limit integer not null default 1000,
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_ip_hash text,
  request_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mari_api_keys_status_check check (status = any (array['ACTIVE'::text,'REVOKED'::text])),
  constraint mari_api_keys_scopes_check check (cardinality(scopes) > 0),
  constraint mari_api_keys_request_limit_check check (monthly_request_limit > 0),
  constraint mari_api_keys_credit_limit_check check (monthly_credit_limit > 0)
);

create index if not exists mari_api_keys_workspace_status_idx
  on public.mari_api_keys (workspace_id, status, created_at desc);
create index if not exists mari_api_keys_org_status_idx
  on public.mari_api_keys (organization_id, status, created_at desc);

alter table public.mari_api_keys enable row level security;
alter table public.mari_api_keys force row level security;
revoke all on table public.mari_api_keys from anon, authenticated;
grant select, insert, update, delete on table public.mari_api_keys to service_role;

create table if not exists public.mari_api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.mari_api_keys(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id text not null,
  endpoint text not null,
  status_code integer not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  credits_used integer not null default 0,
  rag_chunks integer not null default 0,
  model text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  constraint mari_api_usage_key_request_unique unique (api_key_id, request_id),
  constraint mari_api_usage_status_code_check check (status_code between 100 and 599),
  constraint mari_api_usage_token_check check (prompt_tokens >= 0 and completion_tokens >= 0 and total_tokens >= 0),
  constraint mari_api_usage_credit_check check (credits_used >= 0),
  constraint mari_api_usage_rag_check check (rag_chunks >= 0)
);

create index if not exists mari_api_usage_workspace_created_idx
  on public.mari_api_usage (workspace_id, created_at desc);
create index if not exists mari_api_usage_org_created_idx
  on public.mari_api_usage (organization_id, created_at desc);

alter table public.mari_api_usage enable row level security;
alter table public.mari_api_usage force row level security;
revoke all on table public.mari_api_usage from anon, authenticated;
grant select, insert, update, delete on table public.mari_api_usage to service_role;

commit;
