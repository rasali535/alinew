alter table public.social_provider_profiles add column if not exists account_id text;
create index if not exists social_provider_profiles_account_id_idx on public.social_provider_profiles(account_id) where account_id is not null;
