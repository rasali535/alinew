-- =====================================================================
-- Ralion OS — Core Table Grants & Workspace/Organization Permission Repair
-- Migration: 20260911_grant_workspaces_organizations_permissions.sql
-- =====================================================================
-- Grants only the permissions genuinely required by the server-side service_role
-- and authenticated users (subject to RLS policies). Does NOT broadly grant CRUD
-- or default privileges to authenticated, anon, PUBLIC, or future tables.

-- 1. Explicit Service Role Grants for Server-Side Orchestration
GRANT ALL ON TABLE public.organizations TO postgres, service_role;
GRANT ALL ON TABLE public.workspaces TO postgres, service_role;
GRANT ALL ON TABLE public.workspace_members TO postgres, service_role;
GRANT ALL ON TABLE public.organization_members TO postgres, service_role;
GRANT ALL ON TABLE public.business_profiles TO postgres, service_role;

-- 2. Authenticated Role Table Access (Subject to Row-Level Security policies)
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT SELECT ON TABLE public.workspaces TO authenticated;
GRANT SELECT ON TABLE public.workspace_members TO authenticated;
GRANT SELECT ON TABLE public.organization_members TO authenticated;
GRANT SELECT ON TABLE public.business_profiles TO authenticated;

-- 3. Commerce/Subscription Tables if present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        GRANT ALL ON TABLE public.customers TO postgres, service_role;
        GRANT SELECT ON TABLE public.customers TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        GRANT ALL ON TABLE public.subscriptions TO postgres, service_role;
        GRANT SELECT ON TABLE public.subscriptions TO authenticated;
    END IF;
END $$;
