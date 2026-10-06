create table if not exists public.tenant_credit_wallets (
  organization_id uuid primary key,
  plan_id text not null check (plan_id in ('COMMUNITY','STARTER','PROFESSIONAL','ENTERPRISE')),
  monthly_quota integer not null check (monthly_quota >= 0),
  remaining_plan_credits integer not null check (remaining_plan_credits >= 0),
  remaining_bonus_credits integer not null default 0 check (remaining_bonus_credits >= 0),
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  lifetime_credits_granted bigint not null default 0 check (lifetime_credits_granted >= 0),
  lifetime_credits_consumed bigint not null default 0 check (lifetime_credits_consumed >= 0),
  period_start date not null,
  period_end date not null,
  last_renewal_at timestamptz not null default now(),
  next_renewal_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_credit_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid,
  correlation_id text not null,
  amount integer not null check (amount > 0),
  status text not null check (status in ('RESERVED','CHARGED','RELEASED')),
  source_feature text not null,
  provider text,
  model text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (organization_id, correlation_id)
);

create table if not exists public.tenant_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid,
  amount integer not null,
  balance_before integer not null,
  balance_after integer not null,
  plan_credits_before integer not null,
  plan_credits_after integer not null,
  bonus_credits_before integer not null,
  bonus_credits_after integer not null,
  type text not null check (type in ('SUBSCRIPTION_RENEWAL','BONUS_GRANT','PROMOTIONAL_GRANT','ADMIN_ADJUSTMENT','CONSUMPTION','REFUND')),
  source_feature text,
  provider text,
  model text,
  correlation_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_reservations_org_status on public.tenant_credit_reservations (organization_id, status, created_at desc);
create index if not exists idx_credit_ledger_org_created on public.tenant_credit_ledger (organization_id, created_at desc);
create unique index if not exists idx_credit_ledger_consumption_correlation on public.tenant_credit_ledger (organization_id, correlation_id) where type = 'CONSUMPTION' and correlation_id is not null;

alter table public.tenant_credit_wallets enable row level security;
alter table public.tenant_credit_reservations enable row level security;
alter table public.tenant_credit_ledger enable row level security;

revoke all on public.tenant_credit_wallets from anon, authenticated;
revoke all on public.tenant_credit_reservations from anon, authenticated;
revoke all on public.tenant_credit_ledger from anon, authenticated;
grant all on public.tenant_credit_wallets to service_role;
grant all on public.tenant_credit_reservations to service_role;
grant all on public.tenant_credit_ledger to service_role;

create or replace function public.ralion_sync_credit_wallet(p_org uuid, p_plan_id text, p_monthly_quota integer)
returns public.tenant_credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.tenant_credit_wallets;
  current_start date := date_trunc('month', current_date)::date;
  current_end date := (date_trunc('month', current_date) + interval '1 month')::date;
  old_used integer := 0;
  new_remaining integer := 0;
begin
  if p_plan_id not in ('COMMUNITY','STARTER','PROFESSIONAL','ENTERPRISE') then raise exception 'Invalid plan id'; end if;
  if p_monthly_quota < 0 then raise exception 'Invalid monthly quota'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;

  if not found then
    insert into public.tenant_credit_wallets (
      organization_id, plan_id, monthly_quota, remaining_plan_credits, remaining_bonus_credits,
      reserved_credits, lifetime_credits_granted, lifetime_credits_consumed,
      period_start, period_end, last_renewal_at, next_renewal_at
    ) values (
      p_org, p_plan_id, p_monthly_quota, p_monthly_quota, 0, 0, p_monthly_quota, 0,
      current_start, current_end, now(), current_end::timestamptz
    ) returning * into w;
    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after, plan_credits_before, plan_credits_after,
      bonus_credits_before, bonus_credits_after, type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota, 0, p_monthly_quota, 0, p_monthly_quota, 0, 0,
      'SUBSCRIPTION_RENEWAL', 'MARI_CREDITS', 'Initial monthly Mari credit allocation',
      jsonb_build_object('plan_id', p_plan_id, 'monthly_quota', p_monthly_quota)
    );
    return w;
  end if;

  if w.period_start <> current_start then
    update public.tenant_credit_reservations
      set status = 'RELEASED', finalized_at = now(), metadata = metadata || jsonb_build_object('release_reason','period_rollover')
      where organization_id = p_org and status = 'RESERVED';
    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after, plan_credits_before, plan_credits_after,
      bonus_credits_before, bonus_credits_after, type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota, w.remaining_plan_credits + w.remaining_bonus_credits,
      p_monthly_quota + w.remaining_bonus_credits, w.remaining_plan_credits, p_monthly_quota,
      w.remaining_bonus_credits, w.remaining_bonus_credits, 'SUBSCRIPTION_RENEWAL', 'MARI_CREDITS',
      'Monthly Mari credit renewal', jsonb_build_object('plan_id', p_plan_id, 'monthly_quota', p_monthly_quota)
    );
    update public.tenant_credit_wallets set
      plan_id = p_plan_id, monthly_quota = p_monthly_quota, remaining_plan_credits = p_monthly_quota,
      reserved_credits = 0, lifetime_credits_granted = lifetime_credits_granted + p_monthly_quota,
      period_start = current_start, period_end = current_end, last_renewal_at = now(),
      next_renewal_at = current_end::timestamptz, updated_at = now()
    where organization_id = p_org returning * into w;
    return w;
  end if;

  if w.plan_id <> p_plan_id or w.monthly_quota <> p_monthly_quota then
    old_used := greatest(0, w.monthly_quota - w.remaining_plan_credits);
    new_remaining := greatest(0, p_monthly_quota - old_used);
    update public.tenant_credit_wallets set
      plan_id = p_plan_id, monthly_quota = p_monthly_quota, remaining_plan_credits = new_remaining,
      lifetime_credits_granted = lifetime_credits_granted + greatest(0, p_monthly_quota - w.monthly_quota),
      updated_at = now()
    where organization_id = p_org returning * into w;
  end if;
  return w;
end;
$$;

create or replace function public.ralion_get_credit_summary(p_org uuid, p_plan_id text, p_monthly_quota integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.tenant_credit_wallets;
  used integer;
  available integer;
begin
  select * into w from public.ralion_sync_credit_wallet(p_org, p_plan_id, p_monthly_quota);
  used := greatest(0, w.monthly_quota - w.remaining_plan_credits);
  available := greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits);
  return jsonb_build_object(
    'organizationId', w.organization_id, 'planId', w.plan_id, 'monthlyQuota', w.monthly_quota,
    'allocatedCredits', w.monthly_quota + w.remaining_bonus_credits, 'usedCredits', used,
    'reservedCredits', w.reserved_credits, 'remainingCredits', available,
    'planCreditsRemaining', w.remaining_plan_credits, 'bonusCreditsRemaining', w.remaining_bonus_credits,
    'utilizationRate', case when w.monthly_quota > 0 then round((used::numeric / w.monthly_quota::numeric) * 100, 2) else 0 end,
    'periodStart', w.period_start, 'periodEnd', w.period_end,
    'lifetimeCreditsGranted', w.lifetime_credits_granted, 'lifetimeCreditsConsumed', w.lifetime_credits_consumed
  );
end;
$$;

create or replace function public.ralion_reserve_credits(
  p_org uuid, p_user uuid, p_correlation_id text, p_plan_id text, p_monthly_quota integer,
  p_amount integer, p_source_feature text, p_provider text default null, p_model text default null,
  p_reason text default null, p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.tenant_credit_wallets;
  r public.tenant_credit_reservations;
  available integer;
begin
  if p_amount <= 0 then raise exception 'Reservation amount must be positive'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into w from public.ralion_sync_credit_wallet(p_org, p_plan_id, p_monthly_quota);
  select * into r from public.tenant_credit_reservations where organization_id = p_org and correlation_id = p_correlation_id;
  if found then
    return jsonb_build_object('allowed', r.status in ('RESERVED','CHARGED'), 'status', r.status,
      'reservationId', r.id, 'amount', r.amount,
      'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
  end if;
  available := greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits);
  if available < p_amount then
    return jsonb_build_object('allowed', false, 'status', 'INSUFFICIENT_CREDITS', 'amount', p_amount, 'remainingCredits', available);
  end if;
  insert into public.tenant_credit_reservations (
    organization_id, user_id, correlation_id, amount, status, source_feature, provider, model, reason, metadata
  ) values (
    p_org, p_user, p_correlation_id, p_amount, 'RESERVED', p_source_feature, p_provider, p_model, p_reason, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into r;
  update public.tenant_credit_wallets set reserved_credits = reserved_credits + p_amount, updated_at = now()
    where organization_id = p_org returning * into w;
  return jsonb_build_object('allowed', true, 'status', 'RESERVED', 'reservationId', r.id, 'amount', p_amount,
    'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
end;
$$;

create or replace function public.ralion_finalize_credits(
  p_org uuid, p_correlation_id text, p_success boolean, p_provider text default null,
  p_model text default null, p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.tenant_credit_wallets;
  r public.tenant_credit_reservations;
  plan_before integer;
  bonus_before integer;
  balance_before integer;
  plan_use integer;
  bonus_use integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into r from public.tenant_credit_reservations where organization_id = p_org and correlation_id = p_correlation_id for update;
  if not found then return jsonb_build_object('success', false, 'status', 'NOT_FOUND'); end if;
  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if r.status = 'CHARGED' or r.status = 'RELEASED' then
    return jsonb_build_object('success', r.status = 'CHARGED', 'status', r.status,
      'creditsDeducted', case when r.status = 'CHARGED' then r.amount else 0 end,
      'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
  end if;
  if not p_success then
    update public.tenant_credit_wallets set reserved_credits = greatest(0, reserved_credits - r.amount), updated_at = now()
      where organization_id = p_org returning * into w;
    update public.tenant_credit_reservations set status = 'RELEASED', provider = coalesce(p_provider, provider), model = coalesce(p_model, model),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb), finalized_at = now() where id = r.id;
    return jsonb_build_object('success', true, 'status', 'RELEASED', 'creditsDeducted', 0,
      'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
  end if;
  plan_before := w.remaining_plan_credits;
  bonus_before := w.remaining_bonus_credits;
  balance_before := plan_before + bonus_before;
  plan_use := least(r.amount, plan_before);
  bonus_use := r.amount - plan_use;
  update public.tenant_credit_wallets set
    remaining_plan_credits = greatest(0, remaining_plan_credits - plan_use),
    remaining_bonus_credits = greatest(0, remaining_bonus_credits - bonus_use),
    reserved_credits = greatest(0, reserved_credits - r.amount),
    lifetime_credits_consumed = lifetime_credits_consumed + r.amount, updated_at = now()
  where organization_id = p_org returning * into w;
  update public.tenant_credit_reservations set status = 'CHARGED', provider = coalesce(p_provider, provider), model = coalesce(p_model, model),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb), finalized_at = now() where id = r.id;
  insert into public.tenant_credit_ledger (
    organization_id, user_id, amount, balance_before, balance_after, plan_credits_before, plan_credits_after,
    bonus_credits_before, bonus_credits_after, type, source_feature, provider, model, correlation_id, reason, metadata
  ) values (
    p_org, r.user_id, -r.amount, balance_before, w.remaining_plan_credits + w.remaining_bonus_credits,
    plan_before, w.remaining_plan_credits, bonus_before, w.remaining_bonus_credits, 'CONSUMPTION', r.source_feature,
    coalesce(p_provider, r.provider), coalesce(p_model, r.model), r.correlation_id, r.reason,
    r.metadata || coalesce(p_metadata, '{}'::jsonb)
  ) on conflict do nothing;
  return jsonb_build_object('success', true, 'status', 'CHARGED', 'creditsDeducted', r.amount,
    'remainingCredits', greatest(0, w.remaining_plan_credits + w.remaining_bonus_credits - w.reserved_credits));
end;
$$;

revoke all on function public.ralion_sync_credit_wallet(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.ralion_get_credit_summary(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.ralion_reserve_credits(uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.ralion_finalize_credits(uuid,text,boolean,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ralion_sync_credit_wallet(uuid,text,integer) to service_role;
grant execute on function public.ralion_get_credit_summary(uuid,text,integer) to service_role;
grant execute on function public.ralion_reserve_credits(uuid,uuid,text,text,integer,integer,text,text,text,text,jsonb) to service_role;
grant execute on function public.ralion_finalize_credits(uuid,text,boolean,text,text,jsonb) to service_role;
