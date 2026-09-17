-- Mari embeddable website widget
-- Public websites receive only a public widget identifier. Short-lived browser
-- sessions are issued server-side and stored only as SHA-256 hashes.

create table if not exists public.mari_embed_widgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  public_token text not null unique,
  allowed_domains text[] not null,
  assistant_name text not null default 'Mari',
  welcome_message text not null default 'Hi! I’m Mari. How can I help?',
  accent_color text not null default '#7c3aed',
  position text not null default 'bottom-right',
  status text not null default 'ACTIVE',
  monthly_request_limit integer not null default 1000,
  request_count bigint not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mari_embed_widgets_name_check check (char_length(name) between 1 and 120),
  constraint mari_embed_widgets_public_token_check check (public_token like 'mw_public_%'),
  constraint mari_embed_widgets_allowed_domains_check check (cardinality(allowed_domains) > 0),
  constraint mari_embed_widgets_position_check check (position in ('bottom-right', 'bottom-left')),
  constraint mari_embed_widgets_status_check check (status in ('ACTIVE', 'PAUSED', 'REVOKED')),
  constraint mari_embed_widgets_monthly_limit_check check (monthly_request_limit > 0)
);

create index if not exists mari_embed_widgets_org_workspace_idx
  on public.mari_embed_widgets (organization_id, workspace_id, created_at desc);
create index if not exists mari_embed_widgets_workspace_idx
  on public.mari_embed_widgets (workspace_id, created_at desc);
create index if not exists mari_embed_widgets_created_by_idx
  on public.mari_embed_widgets (created_by);
create index if not exists mari_embed_widgets_active_token_idx
  on public.mari_embed_widgets (public_token)
  where status = 'ACTIVE';

create table if not exists public.mari_widget_sessions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.mari_embed_widgets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  origin text not null,
  expires_at timestamptz not null,
  request_count bigint not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mari_widget_sessions_expiry_check check (expires_at > created_at),
  constraint mari_widget_sessions_request_count_check check (request_count >= 0)
);

create index if not exists mari_widget_sessions_widget_idx
  on public.mari_widget_sessions (widget_id, expires_at desc);
create index if not exists mari_widget_sessions_token_idx
  on public.mari_widget_sessions (token_hash);
create index if not exists mari_widget_sessions_expiry_idx
  on public.mari_widget_sessions (expires_at);

create table if not exists public.mari_widget_usage (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.mari_embed_widgets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  request_id text not null,
  session_fingerprint text not null,
  status_code integer not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  credits_used integer not null default 0,
  model text,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now(),
  constraint mari_widget_usage_status_code_check check (status_code between 100 and 599),
  constraint mari_widget_usage_prompt_tokens_check check (prompt_tokens >= 0),
  constraint mari_widget_usage_completion_tokens_check check (completion_tokens >= 0),
  constraint mari_widget_usage_total_tokens_check check (total_tokens >= 0),
  constraint mari_widget_usage_credits_used_check check (credits_used >= 0),
  constraint mari_widget_usage_latency_ms_check check (latency_ms >= 0),
  unique (widget_id, request_id)
);

create index if not exists mari_widget_usage_widget_created_idx
  on public.mari_widget_usage (widget_id, created_at desc);
create index if not exists mari_widget_usage_org_workspace_created_idx
  on public.mari_widget_usage (organization_id, workspace_id, created_at desc);
create index if not exists mari_widget_usage_session_created_idx
  on public.mari_widget_usage (session_fingerprint, created_at desc);

alter table public.mari_embed_widgets enable row level security;
alter table public.mari_widget_sessions enable row level security;
alter table public.mari_widget_usage enable row level security;

revoke all on table public.mari_embed_widgets from anon, authenticated;
revoke all on table public.mari_widget_sessions from anon, authenticated;
revoke all on table public.mari_widget_usage from anon, authenticated;

grant select, insert, update, delete on table public.mari_embed_widgets to service_role;
grant select, insert, update, delete on table public.mari_widget_sessions to service_role;
grant select, insert, update, delete on table public.mari_widget_usage to service_role;
