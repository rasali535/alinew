-- Ralion OS — Durable Billing / Credit Persistence Hardening
-- 2026-09-16
--
-- Goals:
-- 1. Make subscriptions durable and one-per-organization.
-- 2. Persist PayPal billing-cycle/provider metadata and webhook idempotency.
-- 3. Add the Starter tier required by the application plan catalog.
-- 4. Remove the cross-tenant authenticated subscription read policy.
-- 5. Keep all billing / credit mutations server-side and transactional.

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

-- Allow the application transaction model to represent provider reversals.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status = any (array['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'reversed'::text]));

create unique index if not exists payments_provider_transaction_idx
  on public.payments (payment_provider, transaction_id)
  where transaction_id is not null;

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

-- Atomic webhook claim. Duplicate in-flight/processed events are ignored;
-- previously failed events may be retried by the provider.
create or replace function public.ralion_claim_billing_webhook(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_resource_id text default null,
  p_organization_id uuid default null,
  p_signature_valid boolean default false,
  p_payload_hash text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.billing_webhook_events;
begin
  if nullif(trim(p_provider), '') is null or nullif(trim(p_event_id), '') is null then
    raise exception 'provider and event id are required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_event_id, 0));

  select * into existing
  from public.billing_webhook_events
  where provider = p_provider and event_id = p_event_id
  for update;

  if found and existing.status in ('PROCESSING', 'PROCESSED', 'IGNORED') then
    return jsonb_build_object('claimed', false, 'status', existing.status, 'id', existing.id);
  end if;

  if found then
    update public.billing_webhook_events
    set event_type = p_event_type,
        resource_id = coalesce(p_resource_id, resource_id),
        organization_id = coalesce(p_organization_id, organization_id),
        status = 'PROCESSING',
        signature_valid = p_signature_valid,
        payload_hash = coalesce(p_payload_hash, payload_hash),
        error = null,
        processed_at = null,
        metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
        received_at = now()
    where id = existing.id
    returning * into existing;
  else
    insert into public.billing_webhook_events (
      provider, event_id, event_type, resource_id, organization_id,
      status, signature_valid, payload_hash, metadata
    ) values (
      p_provider, p_event_id, p_event_type, p_resource_id, p_organization_id,
      'PROCESSING', p_signature_valid, p_payload_hash, coalesce(p_metadata, '{}'::jsonb)
    ) returning * into existing;
  end if;

  return jsonb_build_object('claimed', true, 'status', existing.status, 'id', existing.id);
end;
$$;

-- Atomic administrative balance adjustment. Bonus credits are used so monthly
-- plan renewals do not erase deliberate support/admin corrections.
create or replace function public.ralion_adjust_credits(
  p_org uuid,
  p_user uuid,
  p_amount integer,
  p_correlation_id text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.tenant_credit_wallets;
  existing public.tenant_credit_ledger;
  before_total integer;
  after_total integer;
  bonus_before integer;
  bonus_after integer;
  applied integer;
begin
  if p_amount = 0 then raise exception 'Adjustment amount must be non-zero'; end if;
  if nullif(trim(p_correlation_id), '') is null then raise exception 'Correlation id is required'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Reason is required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));

  select * into existing
  from public.tenant_credit_ledger
  where organization_id = p_org
    and correlation_id = p_correlation_id
    and type = 'ADMIN_ADJUSTMENT'
  limit 1;

  if found then
    select * into w from public.tenant_credit_wallets where organization_id = p_org;
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'transactionId', existing.id,
      'amount', existing.amount,
      'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
    );
  end if;

  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if not found then raise exception 'Credit wallet not initialized'; end if;

  before_total := w.remaining_plan_credits + w.remaining_bonus_credits;
  bonus_before := w.remaining_bonus_credits;

  if p_amount > 0 then
    applied := p_amount;
    bonus_after := bonus_before + p_amount;
  else
    -- Administrative deductions can never make the spendable balance negative.
    applied := -least(abs(p_amount), greatest(0, before_total - w.reserved_credits));
    if abs(applied) <= bonus_before then
      bonus_after := bonus_before - abs(applied);
    else
      bonus_after := 0;
      w.remaining_plan_credits := greatest(0, w.remaining_plan_credits - (abs(applied) - bonus_before));
    end if;
  end if;

  update public.tenant_credit_wallets
  set remaining_plan_credits = w.remaining_plan_credits,
      remaining_bonus_credits = bonus_after,
      lifetime_credits_granted = lifetime_credits_granted + case when applied > 0 then applied else 0 end,
      lifetime_credits_consumed = lifetime_credits_consumed + case when applied < 0 then abs(applied) else 0 end,
      updated_at = now()
  where organization_id = p_org
  returning * into w;

  after_total := w.remaining_plan_credits + w.remaining_bonus_credits;

  insert into public.tenant_credit_ledger (
    organization_id, user_id, amount, balance_before, balance_after,
    plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
    type, source_feature, correlation_id, reason, metadata
  ) values (
    p_org, p_user, applied, before_total, after_total,
    case when applied < 0 and abs(applied) > bonus_before then w.remaining_plan_credits + (abs(applied) - bonus_before) else w.remaining_plan_credits end,
    w.remaining_plan_credits, bonus_before, w.remaining_bonus_credits,
    'ADMIN_ADJUSTMENT', 'ADMIN', p_correlation_id, p_reason, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into existing;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'transactionId', existing.id,
    'amount', applied,
    'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits)
  );
end;
$$;

-- Security posture: direct customer reads are tenant-scoped; all mutations and
-- credit RPC execution remain privileged server responsibilities.
alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.tenant_credit_wallets enable row level security;
alter table public.tenant_credit_wallets force row level security;
alter table public.tenant_credit_ledger enable row level security;
alter table public.tenant_credit_ledger force row level security;
alter table public.tenant_credit_reservations enable row level security;
alter table public.tenant_credit_reservations force row level security;

revoke all on table public.billing_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.billing_webhook_events to service_role;

-- Subscription reads must be tenant-scoped. All writes stay server-side.
drop policy if exists "Authenticated users can view subscriptions" on public.subscriptions;
drop policy if exists "Users can view org subscriptions" on public.subscriptions;
drop policy if exists "Users can view their organization subscription" on public.subscriptions;
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
revoke all on table public.payments from anon, authenticated;
grant select, insert, update, delete on table public.payments to service_role;

revoke all on function public.ralion_claim_billing_webhook(text,text,text,text,uuid,boolean,text,jsonb) from public, anon, authenticated;
grant execute on function public.ralion_claim_billing_webhook(text,text,text,text,uuid,boolean,text,jsonb) to service_role;

revoke all on function public.ralion_adjust_credits(uuid,uuid,integer,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ralion_adjust_credits(uuid,uuid,integer,text,text,jsonb) to service_role;

commit;
