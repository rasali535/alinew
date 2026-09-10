-- =====================================================================
-- Ralion OS — P0 Meta / Provider Tenant RLS Hardening
-- Migration: 20260910_meta_provider_tenant_rls_hardening.sql
-- =====================================================================

-- META CONNECTIONS ------------------------------------------------------
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meta_conn_select_own" ON public.meta_connections;
DROP POLICY IF EXISTS "meta_conn_service_role" ON public.meta_connections;

CREATE POLICY "meta_conn_tenant_select"
ON public.meta_connections
FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = meta_connections.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "meta_conn_service_role"
ON public.meta_connections
FOR ALL TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE public.meta_connections
  DROP CONSTRAINT IF EXISTS meta_connections_tenant_required;
ALTER TABLE public.meta_connections
  ADD CONSTRAINT meta_connections_tenant_required
  CHECK (workspace_id IS NOT NULL) NOT VALID;

-- Ensure the client-safe view cannot bypass RLS through view ownership.
ALTER VIEW public.meta_connections_safe SET (security_invoker = true);
GRANT SELECT ON public.meta_connections_safe TO authenticated;
REVOKE ALL ON public.meta_connections_safe FROM anon;

-- PROVIDER PROFILES -----------------------------------------------------
ALTER TABLE public.social_provider_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_profiles_user_own" ON public.social_provider_profiles;
DROP POLICY IF EXISTS "sp_profiles_service_role" ON public.social_provider_profiles;

CREATE POLICY "sp_profiles_tenant_select"
ON public.social_provider_profiles
FOR SELECT TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_provider_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_provider_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "sp_profiles_tenant_insert"
ON public.social_provider_profiles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = social_provider_profiles.organization_id
          AND om.user_id = auth.uid()
      )
    )
    OR
    (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_provider_profiles.workspace_id
          AND wm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "sp_profiles_tenant_update"
ON public.social_provider_profiles
FOR UPDATE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_provider_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_provider_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_provider_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_provider_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "sp_profiles_tenant_delete"
ON public.social_provider_profiles
FOR DELETE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_provider_profiles.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_provider_profiles.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "sp_profiles_service_role"
ON public.social_provider_profiles
FOR ALL TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE public.social_provider_profiles
  DROP CONSTRAINT IF EXISTS social_provider_profiles_tenant_required;
ALTER TABLE public.social_provider_profiles
  ADD CONSTRAINT social_provider_profiles_tenant_required
  CHECK (organization_id IS NOT NULL OR workspace_id IS NOT NULL) NOT VALID;

REVOKE ALL ON public.meta_connections FROM anon;
REVOKE ALL ON public.social_provider_profiles FROM anon;
