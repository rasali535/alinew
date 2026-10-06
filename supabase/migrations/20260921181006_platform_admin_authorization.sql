create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'PLATFORM_ADMIN' check (role in ('PLATFORM_ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REVOKED')),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

-- Administrator grants are environment-specific operational data.
-- Provision them explicitly after creating users and organizations; migration
-- replay must not copy a production user/organization UUID into a preview.
