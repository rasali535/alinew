-- Ralion OS — Admin Command Centre production compatibility
-- Keeps durable admin reads compatible with hardened production permissions.

begin;

alter table public.social_provider_profiles
  add column if not exists account_id text;

grant select on table public.subscription_plans to service_role;

-- Ensure PostgREST notices schema/privilege changes immediately after deploy.
notify pgrst, 'reload schema';

commit;
