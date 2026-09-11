-- =====================================================================
-- Ralion OS — Core Table Grants & Workspace/Organization Permission Repair
-- Migration: 20260911_grant_workspaces_organizations_permissions.sql
-- =====================================================================
-- Ensures service_role and authenticated roles have table-level permissions
-- on core tenant/workspace and billing tables in schema public.

-- 1. Table Grants for Core Identity & Tenant Hierarchy
GRANT ALL ON TABLE public.organizations TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;

GRANT ALL ON TABLE public.workspaces TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspaces TO authenticated;

GRANT ALL ON TABLE public.workspace_members TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_members TO authenticated;

GRANT ALL ON TABLE public.organization_members TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO authenticated;

-- 2. Business Profiles & Commerce Tables
GRANT ALL ON TABLE public.business_profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_profiles TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
        GRANT ALL ON TABLE public.customers TO postgres, service_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
        GRANT ALL ON TABLE public.subscriptions TO postgres, service_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO authenticated;
    END IF;
END $$;

-- 3. Default Privileges for Future Tables in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
