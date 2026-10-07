-- Ralion OS — social_connections authenticated read-only hardening
-- Production incident follow-up: direct authenticated mutation of tenant identity
-- on social_connections must never be possible. All connection lifecycle writes
-- are server-side/service-role operations.

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_conn_service_role" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_user_own" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_tenant_select" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_tenant_insert" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_tenant_update" ON public.social_connections;
DROP POLICY IF EXISTS "social_conn_tenant_delete" ON public.social_connections;

CREATE POLICY "social_conn_user_own"
ON public.social_connections
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "social_conn_service_role"
ON public.social_connections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Browser/data-API clients may read only their own connection metadata.
-- OAuth callbacks, disconnects, token refreshes, provider synchronization and
-- all other mutations remain server-side under service_role.
REVOKE ALL ON public.social_connections FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.social_connections
FROM authenticated;
GRANT SELECT ON public.social_connections TO authenticated;
GRANT ALL ON public.social_connections TO service_role;

-- Preserve the safe client projection under caller RLS.
ALTER VIEW public.social_connections_safe SET (security_invoker = true);
REVOKE ALL ON public.social_connections_safe FROM anon;
GRANT SELECT ON public.social_connections_safe TO authenticated;
