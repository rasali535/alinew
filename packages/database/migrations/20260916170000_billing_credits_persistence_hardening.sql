-- Ralion OS — Durable Billing / Credit Persistence Hardening
-- 2026-09-16
--
-- Goals:
-- 1. Make subscriptions durable and one-per-organization.
-- 2. Persist PayPal billing-cycle/provider metadata and webhook idempotency.
-- 3. Add the Starter tier required by the application plan catalog.
-- 4. Remove the cross-tenant authenticated subscription read policy.
-- 5. Keep all billing mutations server-side (service role only).

begin;

-- Canonical Starter plan required by PLAN_CATALOG / PayPal mapping.
insert into public.subscription_plans (
  name,
  description,
  price,
  billing_cycle,
  features,
  slug,
  currency,
  limits,
  is_public,
  trial_days,
  updated_at
)
values (
  'Starter',
  'Starter / Standard Ralion OS plan',
  19,
  'monthly',
  '{}'::jsonb,
  'starter',
  'USD',
  '{}'::jsonb,
  true,
  0,
  now()
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  billing_cycle = excluded.billing_cycle,
  updated_at = now();

-- Bring the legacy subscriptions table up to the application billing contract.
alter table public.subscriptions
  add column if not exists billing_cycle text not null default 'monthly',
  add column if not exists provider_customer_id text,
  add column if not exists provider_plan_id text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.subscriptions
set
  current_period_start = coalesce(current_period_start, subscription_start::timestamptz, start_date::timestamptz, created_at),
  current_period_end = coalesce(current_period_end, subscription_end::timestamptz, end_date::timestamptz, created_at + interval '1 month'),
  billing_cycle = coalesce(nullif(lower(billing_cycle), ''), 'monthly'),
  updated_at = coalesce(updated_at, now())
where current_period_start is null
   or current_period_end is null
   or billing_cycle is null
   or billing_cycle = '';

alter table public.subscriptions
  alter column current_period_start set not null,
  alter column current_period_end set not null;

alter table public.subscriptions drop constraint if exists subscriptions_edition_check;
alter table public.subscriptions
  add constraint subscriptions_edition_check
  check (edition = any (array['community'::text, 'starter'::text, 'professional'::text, 'enterprise'::text]));

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status = any (array['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'suspended'::text, 'expired'::text, 'pending'::text]));

alter table public.subscriptions drop constraint if exists subscriptions_billing_cycle_check;
alter table public.subscriptions
  add constraint subscriptions_billing_cycle_check
  check (billing_cycle = any (array['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]));

create unique index if not exists subscriptions_one_per_organization_idx
  on public.subscriptions (organization_id);

create unique index if not exists subscriptions_external_provider_id_idx
  on public.subscriptions (payment_provider, external_subscription_id)
  where external_subscription_id is not null;

-- Durable webhook idempotency ledger. This is deliberately separate from the
-- product webhooks table, whose purpose is outbound customer integrations.
create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  resource_id text,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status = any (array['PROCESSING'::text, 'PROCESSED'::text, 'FAILED'::text, 'IGNORED'::text])),
  signature_valid boolean not null default false,
  payload_hash text,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, event_id)
);

create index if not exists billing_webhook_events_org_received_idx
  on public.billing_webhook_events (organization_id, received_at desc);

alter table public.billing_webhook_events enable row level security;

revoke all on table public.billing_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.billing_webhook_events to service_role;

-- Subscription reads must be tenant-scoped. All writes stay server-side.
drop policy if exists "Authenticated users can view subscriptions" on public.subscriptions;
drop policy if exists "Users can view org subscriptions" on public.subscriptions;
create policy "Users can view their organization subscription"
  on public.subscriptions
  for select
  to authenticated
  using (organization_id in (select public.get_user_organizations()));

revoke insert, update, delete on table public.subscriptions from anon, authenticated;
revoke select on table public.subscriptions from anon;
grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;

-- Payment mutation is server-only. Tenant-facing payment history should flow
-- through authenticated API routes rather than direct table writes.
revoke insert, update, delete on table public.payments from anon, authenticated;
grant select, insert, update, delete on table public.payments to service_role;

commit;
