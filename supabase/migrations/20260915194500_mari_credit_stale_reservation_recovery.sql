create or replace function public.ralion_sync_credit_wallet(
  p_org uuid,
  p_plan_id text,
  p_monthly_quota integer
)
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
  stale_reserved integer := 0;
begin
  if p_plan_id not in ('COMMUNITY','STARTER','PROFESSIONAL','ENTERPRISE') then
    raise exception 'Invalid plan id';
  end if;
  if p_monthly_quota < 0 then raise exception 'Invalid monthly quota'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));

  select * into w from public.tenant_credit_wallets where organization_id = p_org for update;
  if not found then
    insert into public.tenant_credit_wallets (
      organization_id, plan_id, monthly_quota, remaining_plan_credits, remaining_bonus_credits,
      reserved_credits, lifetime_credits_granted, lifetime_credits_consumed,
      period_start, period_end, last_renewal_at, next_renewal_at
    ) values (
      p_org, p_plan_id, p_monthly_quota, p_monthly_quota, 0,
      0, p_monthly_quota, 0,
      current_start, current_end, now(), current_end::timestamptz
    ) returning * into w;

    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after,
      plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
      type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota, 0, p_monthly_quota,
      0, p_monthly_quota, 0, 0,
      'SUBSCRIPTION_RENEWAL', 'MARI_CREDITS', 'Initial monthly Mari credit allocation',
      jsonb_build_object('plan_id', p_plan_id, 'monthly_quota', p_monthly_quota)
    );
    return w;
  end if;

  with stale as (
    update public.tenant_credit_reservations
      set status = 'RELEASED',
          finalized_at = now(),
          metadata = metadata || jsonb_build_object('release_reason','stale_reservation_recovery')
      where organization_id = p_org
        and status = 'RESERVED'
        and created_at < now() - interval '15 minutes'
      returning amount
  )
  select coalesce(sum(amount), 0)::integer into stale_reserved from stale;

  if stale_reserved > 0 then
    update public.tenant_credit_wallets
      set reserved_credits = greatest(0, reserved_credits - stale_reserved),
          updated_at = now()
      where organization_id = p_org
      returning * into w;
  end if;

  if w.period_start <> current_start then
    update public.tenant_credit_reservations
      set status = 'RELEASED', finalized_at = now(), metadata = metadata || jsonb_build_object('release_reason','period_rollover')
      where organization_id = p_org and status = 'RESERVED';

    insert into public.tenant_credit_ledger (
      organization_id, amount, balance_before, balance_after,
      plan_credits_before, plan_credits_after, bonus_credits_before, bonus_credits_after,
      type, source_feature, reason, metadata
    ) values (
      p_org, p_monthly_quota,
      w.remaining_plan_credits + w.remaining_bonus_credits,
      p_monthly_quota + w.remaining_bonus_credits,
      w.remaining_plan_credits, p_monthly_quota,
      w.remaining_bonus_credits, w.remaining_bonus_credits,
      'SUBSCRIPTION_RENEWAL', 'MARI_CREDITS', 'Monthly Mari credit renewal',
      jsonb_build_object('plan_id', p_plan_id, 'monthly_quota', p_monthly_quota)
    );

    update public.tenant_credit_wallets set
      plan_id = p_plan_id,
      monthly_quota = p_monthly_quota,
      remaining_plan_credits = p_monthly_quota,
      reserved_credits = 0,
      lifetime_credits_granted = lifetime_credits_granted + p_monthly_quota,
      period_start = current_start,
      period_end = current_end,
      last_renewal_at = now(),
      next_renewal_at = current_end::timestamptz,
      updated_at = now()
    where organization_id = p_org
    returning * into w;
    return w;
  end if;

  if w.plan_id <> p_plan_id or w.monthly_quota <> p_monthly_quota then
    old_used := greatest(0, w.monthly_quota - w.remaining_plan_credits);
    new_remaining := greatest(0, p_monthly_quota - old_used);
    update public.tenant_credit_wallets set
      plan_id = p_plan_id,
      monthly_quota = p_monthly_quota,
      remaining_plan_credits = new_remaining,
      lifetime_credits_granted = lifetime_credits_granted + greatest(0, p_monthly_quota - w.monthly_quota),
      updated_at = now()
    where organization_id = p_org
    returning * into w;
  end if;

  return w;
end;
$$;

revoke all on function public.ralion_sync_credit_wallet(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.ralion_sync_credit_wallet(uuid,text,integer) to service_role;
