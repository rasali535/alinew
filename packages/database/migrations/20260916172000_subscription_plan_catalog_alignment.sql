-- Ralion OS — Canonical subscription catalog alignment
-- Align durable DB reporting metadata with PLAN_CATALOG and the verified PayPal live plans.

begin;

update public.subscription_plans
set
  name = 'Community',
  price = 0,
  currency = 'USD',
  billing_cycle = 'monthly',
  updated_at = now()
where slug = 'community';

update public.subscription_plans
set
  name = 'Starter',
  price = 19,
  currency = 'USD',
  billing_cycle = 'monthly',
  updated_at = now()
where slug = 'starter';

update public.subscription_plans
set
  name = 'Professional',
  price = 49,
  currency = 'USD',
  billing_cycle = 'monthly',
  updated_at = now()
where slug = 'professional';

update public.subscription_plans
set
  name = 'Enterprise',
  price = 199,
  currency = 'USD',
  billing_cycle = 'monthly',
  updated_at = now()
where slug = 'enterprise';

commit;
