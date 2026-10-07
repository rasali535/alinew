-- Ralion OS — social provider routing server-only hardening
-- Routing determines which infrastructure receives a tenant's social publish.
-- Browser/Data API clients must not be able to read or mutate this authority.

ALTER TABLE public.social_provider_routing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_routing_user_own" ON public.social_provider_routing;
DROP POLICY IF EXISTS "sp_routing_service_role" ON public.social_provider_routing;

CREATE POLICY "sp_routing_service_role"
ON public.social_provider_routing
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.social_provider_routing FROM anon, authenticated;
GRANT ALL ON public.social_provider_routing TO service_role;
