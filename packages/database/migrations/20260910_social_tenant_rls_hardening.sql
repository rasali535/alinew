-- =====================================================================
-- Ralion OS — P0 Social Tenant RLS / IDOR Hardening
-- Migration: 20260910_social_tenant_rls_hardening.sql
-- =====================================================================
-- Security invariant: a user's identity alone never grants access to a
-- tenant-owned social resource. Access requires membership in the row's
-- canonical organization/workspace. Credentials remain service-role only.

-- ---------------------------------------------------------------------
-- 1. SOCIAL CONNECTIONS
-- ---------------------------------------------------------------------
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_conn_user_own" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_service_role" ON public.social_connections;

CREATE POLICY "social_conn_tenant_select"
ON public.social_connections
FOR SELECT TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_connections.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_conn_tenant_insert"
ON public.social_connections
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = social_connections.organization_id
          AND om.user_id = auth.uid()
      )
    )
    OR
    (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_connections.workspace_id
          AND wm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "social_conn_tenant_update"
ON public.social_connections
FOR UPDATE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_connections.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_connections.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_conn_tenant_delete"
ON public.social_connections
FOR DELETE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_connections.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_connections.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_conn_service_role"
ON public.social_connections
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Reject tenantless connections at the database boundary.
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_tenant_required;
ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_tenant_required
  CHECK (organization_id IS NOT NULL OR workspace_id IS NOT NULL) NOT VALID;

-- ---------------------------------------------------------------------
-- 2. SOCIAL DESTINATIONS
-- ---------------------------------------------------------------------
ALTER TABLE public.social_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view social destinations for their organization" ON public.social_destinations;
DROP POLICY IF EXISTS "Users can manage social destinations for their organization" ON public.social_destinations;

CREATE POLICY "social_dest_tenant_select"
ON public.social_destinations
FOR SELECT TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_destinations.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_destinations.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_dest_tenant_insert"
ON public.social_destinations
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = social_destinations.organization_id
          AND om.user_id = auth.uid()
      )
    )
    OR
    (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = social_destinations.workspace_id
          AND wm.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "social_dest_tenant_update"
ON public.social_destinations
FOR UPDATE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_destinations.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_destinations.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_destinations.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_destinations.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_dest_tenant_delete"
ON public.social_destinations
FOR DELETE TO authenticated
USING (
  (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = social_destinations.organization_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = social_destinations.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "social_dest_service_role"
ON public.social_destinations
FOR ALL TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE public.social_destinations
  DROP CONSTRAINT IF EXISTS social_destinations_tenant_required;
ALTER TABLE public.social_destinations
  ADD CONSTRAINT social_destinations_tenant_required
  CHECK (organization_id IS NOT NULL OR workspace_id IS NOT NULL) NOT VALID;

-- Anon must never have direct social-table privileges.
REVOKE ALL ON public.social_destinations FROM anon;
REVOKE ALL ON public.organization_social_entitlements FROM anon;

-- ---------------------------------------------------------------------
-- 3. CREDENTIAL VAULT
-- ---------------------------------------------------------------------
ALTER TABLE public.social_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_cred_service_role_only" ON public.social_credentials;
CREATE POLICY "social_cred_service_role_only"
ON public.social_credentials
FOR ALL TO service_role
USING (true) WITH CHECK (true);
REVOKE ALL ON public.social_credentials FROM anon, authenticated;
GRANT ALL ON public.social_credentials TO service_role;

-- ---------------------------------------------------------------------
-- 4. SAFE VIEW
-- ---------------------------------------------------------------------
-- security_invoker ensures the view obeys the caller's RLS on
-- social_connections rather than acting with the view owner's privileges.
ALTER VIEW public.social_connections_safe SET (security_invoker = true);
GRANT SELECT ON public.social_connections_safe TO authenticated;
REVOKE ALL ON public.social_connections_safe FROM anon;

-- Existing rows can be audited/remediated before validating these constraints:
-- ALTER TABLE public.social_connections VALIDATE CONSTRAINT social_connections_tenant_required;
-- ALTER TABLE public.social_destinations VALIDATE CONSTRAINT social_destinations_tenant_required;
