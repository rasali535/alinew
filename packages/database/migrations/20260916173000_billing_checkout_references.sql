-- Ralion OS — Opaque billing checkout references
-- Keeps tenant/user/plan metadata in Supabase instead of PayPal custom_id.

begin;

create table if not exists public.billing_checkout_references (
  reference text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id text,
  user_id text,
  plan_id text not null check (plan_id = any (array['starter'::text, 'professional'::text, 'enterprise'::text])),
  billing_cycle text not null default 'monthly' check (billing_cycle = 'monthly'),
  provider text not null default 'paypal' check (provider = 'paypal'),
  provider_subscription_id text,
  status text not null default 'PENDING' check (status = any (array['PENDING'::text, 'BOUND'::text, 'CONSUMED'::text, 'EXPIRED'::text, 'FAILED'::text])),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_reference_shape check (
    reference like 'ral_sub_%'
    and char_length(reference) <= 64
  )
);

create unique index if not exists billing_checkout_references_provider_subscription_idx
  on public.billing_checkout_references (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists billing_checkout_references_org_created_idx
  on public.billing_checkout_references (organization_id, created_at desc);

alter table public.billing_checkout_references enable row level security;
alter table public.billing_checkout_references force row level security;

revoke all on table public.billing_checkout_references from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_checkout_references to service_role;

commit;
