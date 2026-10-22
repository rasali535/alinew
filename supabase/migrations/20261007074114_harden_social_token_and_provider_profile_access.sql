
alter table public.social_account_tokens enable row level security;
drop policy if exists "Users can manage own tokens" on public.social_account_tokens;
drop policy if exists "service_role_bypass" on public.social_account_tokens;
drop policy if exists "social_tokens_select_own" on public.social_account_tokens;
drop policy if exists "social_tokens_insert_own" on public.social_account_tokens;
drop policy if exists "social_tokens_update_own" on public.social_account_tokens;
drop policy if exists "social_tokens_delete_own" on public.social_account_tokens;
drop policy if exists "social_tokens_service_role_only" on public.social_account_tokens;
create policy "social_tokens_service_role_only"
on public.social_account_tokens for all to service_role
using (true) with check (true);
revoke all on public.social_account_tokens from anon, authenticated;
grant all on public.social_account_tokens to service_role;

alter table public.social_provider_profiles enable row level security;
drop policy if exists "sp_profiles_user_own" on public.social_provider_profiles;
drop policy if exists "sp_profiles_service_role" on public.social_provider_profiles;
drop policy if exists "sp_profiles_tenant_select" on public.social_provider_profiles;
drop policy if exists "sp_profiles_tenant_insert" on public.social_provider_profiles;
drop policy if exists "sp_profiles_tenant_update" on public.social_provider_profiles;
drop policy if exists "sp_profiles_tenant_delete" on public.social_provider_profiles;
create policy "sp_profiles_user_own"
on public.social_provider_profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "sp_profiles_service_role"
on public.social_provider_profiles for all to service_role
using (true) with check (true);
revoke all on public.social_provider_profiles from anon;
revoke insert, update, delete, truncate, references, trigger
on public.social_provider_profiles from authenticated;
grant select on public.social_provider_profiles to authenticated;
grant all on public.social_provider_profiles to service_role;
;
