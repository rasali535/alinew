-- Ralion OS — CRM / Customer persistence hardening
-- Canonical workspace-scoped customer and deal storage for server-authenticated APIs.

begin;

alter table public.customers
  alter column workspace_id set not null;

alter table public.deals
  alter column workspace_id set not null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists deal_type text not null default 'LEAD',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists ai_score integer not null default 50,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.deals drop constraint if exists deals_ai_score_check;
alter table public.deals
  add constraint deals_ai_score_check check (ai_score between 0 and 100);

alter table public.deals drop constraint if exists deals_deal_type_check;
alter table public.deals
  add constraint deals_deal_type_check check (deal_type = any (array['LEAD'::text, 'CUSTOMER'::text, 'SUPPLIER'::text, 'PARTNER'::text]));

create index if not exists customers_workspace_created_idx
  on public.customers (workspace_id, created_at desc);
create index if not exists customers_workspace_email_idx
  on public.customers (workspace_id, lower(email));
create index if not exists deals_workspace_stage_created_idx
  on public.deals (workspace_id, stage, created_at desc);
create index if not exists deals_workspace_customer_idx
  on public.deals (workspace_id, customer_id)
  where customer_id is not null;

alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.deals enable row level security;
alter table public.deals force row level security;

-- Customer and pipeline data now flow through authenticated server routes.
-- Prevent browser clients from becoming an alternate source of tenant authority.
revoke all on table public.customers from anon, authenticated;
revoke all on table public.deals from anon, authenticated;
grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.deals to service_role;

-- Remove legacy direct-client policies. Service-role routes bypass RLS only after
-- requireRalionContext has derived the canonical workspace from the user session.
drop policy if exists "Workspace data isolation" on public.customers;
drop policy if exists "Workspace data isolation" on public.deals;
drop policy if exists "Users can manage workspace customers" on public.customers;
drop policy if exists "Users can manage workspace deals" on public.deals;

commit;
