create table if not exists public.mari_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['intelligence:read','knowledge:read']::text[],
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  monthly_request_limit integer not null default 1000 check (monthly_request_limit > 0),
  monthly_credit_limit integer not null default 1000 check (monthly_credit_limit > 0),
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_ip_hash text,
  request_count bigint not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mari_api_keys_expiry_after_creation check (expires_at is null or expires_at > created_at)
);

create index if not exists mari_api_keys_org_workspace_idx
  on public.mari_api_keys (organization_id, workspace_id, created_at desc);

create index if not exists mari_api_keys_active_idx
  on public.mari_api_keys (organization_id, workspace_id, status)
  where status = 'ACTIVE';

create table if not exists public.mari_api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.mari_api_keys(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id text not null,
  endpoint text not null,
  status_code integer not null check (status_code between 100 and 599),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  rag_chunks integer not null default 0 check (rag_chunks >= 0),
  model text,
  latency_ms integer not null default 0 check (latency_ms >= 0),
  created_at timestamptz not null default now(),
  unique (api_key_id, request_id)
);

create index if not exists mari_api_usage_key_created_idx
  on public.mari_api_usage (api_key_id, created_at desc);

create index if not exists mari_api_usage_org_workspace_created_idx
  on public.mari_api_usage (organization_id, workspace_id, created_at desc);

alter table public.mari_api_keys enable row level security;
alter table public.mari_api_usage enable row level security;

revoke all on table public.mari_api_keys from anon, authenticated;
revoke all on table public.mari_api_usage from anon, authenticated;

grant all on table public.mari_api_keys to service_role;
grant all on table public.mari_api_usage to service_role;
