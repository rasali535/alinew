-- Ralion OS — Operational core persistence
-- Durable workspace-scoped Tasks, Calendar, Documents, Workflows and admin state.

begin;

-- Tasks -----------------------------------------------------------------------
alter table public.tasks
  alter column workspace_id set not null,
  alter column status set default 'TODO',
  alter column priority set default 'MEDIUM',
  add column if not exists description text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.tasks set status = 'TODO' where status is null;
update public.tasks set priority = 'MEDIUM' where priority is null;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status = any (array['TODO'::text,'IN_PROGRESS'::text,'IN_REVIEW'::text,'COMPLETED'::text,'CANCELED'::text]));
alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks add constraint tasks_priority_check
  check (priority = any (array['LOW'::text,'MEDIUM'::text,'HIGH'::text,'URGENT'::text,'CRITICAL'::text]));

create index if not exists tasks_workspace_status_due_idx
  on public.tasks (workspace_id, status, due_date);
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
revoke all on table public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.tasks to service_role;
drop policy if exists "Workspace data isolation" on public.tasks;
drop policy if exists "Users can manage workspace tasks" on public.tasks;

-- Calendar --------------------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  category text not null default 'MEETING',
  attendees text[] not null default '{}'::text[],
  location text,
  notes text,
  related_customer_id uuid references public.customers(id) on delete set null,
  related_deal_id uuid references public.deals(id) on delete set null,
  related_task_id uuid references public.tasks(id) on delete set null,
  reminder_minutes integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_category_check check (category = any (array['MEETING'::text,'APPOINTMENT'::text,'REMINDER'::text,'DISPATCH'::text,'DEADLINE'::text,'OTHER'::text])),
  constraint calendar_events_end_check check (end_at is null or end_at >= start_at),
  constraint calendar_events_reminder_check check (reminder_minutes is null or reminder_minutes >= 0)
);
create index if not exists calendar_events_workspace_start_idx
  on public.calendar_events (workspace_id, start_at);
alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;
revoke all on table public.calendar_events from anon, authenticated;
grant select, insert, update, delete on table public.calendar_events to service_role;

-- Documents -------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  file_path text not null,
  category text not null default 'GENERAL',
  mime_type text,
  size_bytes bigint not null default 0,
  rag_status text not null default 'PENDING',
  extracted_text text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_rag_status_check check (rag_status = any (array['PENDING'::text,'READY'::text,'UNSUPPORTED'::text,'FAILED'::text]))
);
create unique index if not exists documents_workspace_path_uidx
  on public.documents (workspace_id, file_path);
create index if not exists documents_workspace_created_idx
  on public.documents (workspace_id, created_at desc);
alter table public.documents enable row level security;
alter table public.documents force row level security;
revoke all on table public.documents from anon, authenticated;
grant select, insert, update, delete on table public.documents to service_role;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);
create index if not exists document_chunks_workspace_idx on public.document_chunks(workspace_id, document_id);
create index if not exists document_chunks_search_idx on public.document_chunks using gin(search_vector);
alter table public.document_chunks enable row level security;
alter table public.document_chunks force row level security;
revoke all on table public.document_chunks from anon, authenticated;
grant select, insert, update, delete on table public.document_chunks to service_role;

insert into storage.buckets (id, name, public)
values ('ralion-documents', 'ralion-documents', false)
on conflict (id) do update set public = false;

-- Workflows -------------------------------------------------------------------
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  executions_count integer not null default 0,
  last_executed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflows_trigger_check check (trigger_event = any (array['CUSTOMER_CREATED'::text,'DEAL_STAGE_CHANGED'::text,'TASK_COMPLETED'::text,'MANUAL'::text])),
  constraint workflows_actions_array_check check (jsonb_typeof(actions) = 'array')
);
create index if not exists workflows_workspace_trigger_idx
  on public.workflows (workspace_id, trigger_event, is_active);
alter table public.workflows enable row level security;
alter table public.workflows force row level security;
revoke all on table public.workflows from anon, authenticated;
grant select, insert, update, delete on table public.workflows to service_role;

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trigger_event text not null,
  status text not null default 'RUNNING',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint workflow_runs_status_check check (status = any (array['RUNNING'::text,'SUCCEEDED'::text,'FAILED'::text,'SKIPPED'::text]))
);
create index if not exists workflow_runs_workspace_started_idx
  on public.workflow_runs (workspace_id, started_at desc);
alter table public.workflow_runs enable row level security;
alter table public.workflow_runs force row level security;
revoke all on table public.workflow_runs from anon, authenticated;
grant select, insert, update, delete on table public.workflow_runs to service_role;

-- Durable platform-admin tenant controls --------------------------------------
create table if not exists public.tenant_admin_state (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status text not null default 'ACTIVE',
  suspension_reason text,
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint tenant_admin_state_status_check check (status = any (array['ACTIVE'::text,'SUSPENDED'::text]))
);
alter table public.tenant_admin_state enable row level security;
alter table public.tenant_admin_state force row level security;
revoke all on table public.tenant_admin_state from anon, authenticated;
grant select, insert, update, delete on table public.tenant_admin_state to service_role;

-- Audit context ---------------------------------------------------------------
alter table public.audit_logs
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_workspace_created_idx on public.audit_logs(workspace_id, created_at desc);

commit;
