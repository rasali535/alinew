-- =====================================================================
-- Ralion OS — Competitive Intelligence evidence-integrity hardening
-- All mutations flow through authenticated Ralion server routes using the
-- privileged server client. Tenant clients retain RLS-scoped read access.
-- =====================================================================

REVOKE INSERT, UPDATE, DELETE ON public.mari_competitor_watchlist FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mari_competitor_observations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mari_competitor_briefings FROM authenticated;

GRANT SELECT ON public.mari_competitor_watchlist TO authenticated;
GRANT SELECT ON public.mari_competitor_observations TO authenticated;
GRANT SELECT ON public.mari_competitor_briefings TO authenticated;

DROP POLICY IF EXISTS "mari_comp_watchlist_tenant_insert" ON public.mari_competitor_watchlist;
DROP POLICY IF EXISTS "mari_comp_watchlist_tenant_update" ON public.mari_competitor_watchlist;
DROP POLICY IF EXISTS "mari_comp_watchlist_tenant_delete" ON public.mari_competitor_watchlist;

DROP POLICY IF EXISTS "mari_comp_obs_tenant_insert" ON public.mari_competitor_observations;
DROP POLICY IF EXISTS "mari_comp_obs_tenant_update" ON public.mari_competitor_observations;
DROP POLICY IF EXISTS "mari_comp_obs_tenant_delete" ON public.mari_competitor_observations;

DROP POLICY IF EXISTS "mari_comp_brief_tenant_insert" ON public.mari_competitor_briefings;
