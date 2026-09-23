-- Mari Voice Phase 2: durable, tenant-scoped usage telemetry.
-- This records usage for future plan/minute economics without charging credits yet.

create table if not exists public.mari_voice_usage_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  workspace_id uuid,
  user_id uuid,
  session_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  user_turns integer not null default 0 check (user_turns >= 0),
  assistant_turns integer not null default 0 check (assistant_turns >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  input_audio_tokens bigint not null default 0 check (input_audio_tokens >= 0),
  output_audio_tokens bigint not null default 0 check (output_audio_tokens >= 0),
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_id)
);

create index if not exists mari_voice_usage_org_started_idx
  on public.mari_voice_usage_sessions (organization_id, started_at desc);

alter table public.mari_voice_usage_sessions enable row level security;

revoke all on table public.mari_voice_usage_sessions from public, anon, authenticated;
grant all on table public.mari_voice_usage_sessions to service_role;
