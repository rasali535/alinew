-- Ralion OS — Intelligent workflow approvals and outcome learning
begin;

alter table public.workflows drop constraint if exists workflows_trigger_check;
alter table public.workflows add constraint workflows_trigger_check check (
  trigger_event = any (array[
    'CUSTOMER_CREATED'::text,'DEAL_STAGE_CHANGED'::text,'TASK_COMPLETED'::text,
    'SOCIAL_COMMENT_RECEIVED'::text,'SOCIAL_INBOX_RECEIVED'::text,'MANUAL'::text
  ])
);

alter table public.workflow_runs drop constraint if exists workflow_runs_status_check;
alter table public.workflow_runs add constraint workflow_runs_status_check check (
  status = any (array['RUNNING'::text,'WAITING_APPROVAL'::text,'SUCCEEDED'::text,'FAILED'::text,'SKIPPED'::text])
);

create table if not exists public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'PENDING',
  decision jsonb not null default '{}'::jsonb,
  proposed_action jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workflow_approvals_status_check check (status = any (array['PENDING'::text,'APPROVED'::text,'REJECTED'::text]))
);
create index if not exists workflow_approvals_workspace_status_idx on public.workflow_approvals(workspace_id,status,created_at desc);
alter table public.workflow_approvals enable row level security;
alter table public.workflow_approvals force row level security;
revoke all on table public.workflow_approvals from anon, authenticated;
grant select,insert,update,delete on table public.workflow_approvals to service_role;

create table if not exists public.workflow_outcomes (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  outcome_type text not null,
  success boolean,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists workflow_outcomes_workspace_type_idx on public.workflow_outcomes(workspace_id,outcome_type,measured_at desc);
alter table public.workflow_outcomes enable row level security;
alter table public.workflow_outcomes force row level security;
revoke all on table public.workflow_outcomes from anon, authenticated;
grant select,insert,update,delete on table public.workflow_outcomes to service_role;

commit;
