-- =====================================================================
-- Ralion OS — Mari Competitive Intelligence v1
-- Public-source evidence ledger, tenant watchlists and weekly briefings.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.mari_competitor_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 160),
  website_url text NOT NULL,
  meta_ad_library_url text,
  google_business_url text,
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED')),
  scan_frequency text NOT NULL DEFAULT 'WEEKLY' CHECK (scan_frequency IN ('WEEKLY', 'ON_DEMAND')),
  last_scanned_at timestamptz,
  next_scan_at timestamptz,
  last_scan_status text,
  last_scan_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, website_url)
);

CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_org_idx
  ON public.mari_competitor_watchlist (organization_id);
CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_workspace_idx
  ON public.mari_competitor_watchlist (workspace_id);
CREATE INDEX IF NOT EXISTS mari_competitor_watchlist_due_idx
  ON public.mari_competitor_watchlist (status, next_scan_at);

CREATE TABLE IF NOT EXISTS public.mari_competitor_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  competitor_id uuid NOT NULL REFERENCES public.mari_competitor_watchlist(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('WEBSITE', 'META_AD_LIBRARY', 'GOOGLE_BUSINESS', 'FACEBOOK_PUBLIC', 'INSTAGRAM_PUBLIC', 'OTHER_PUBLIC')),
  source_url text NOT NULL,
  observation_type text NOT NULL CHECK (observation_type IN ('PAGE_SNAPSHOT', 'POSITIONING', 'PRICING', 'OFFER', 'SERVICE', 'PROMOTION', 'CONTENT_THEME', 'CTA', 'CHANGE', 'OTHER')),
  title text NOT NULL,
  summary text NOT NULL,
  evidence_excerpt text,
  content_hash text NOT NULL,
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  is_inference boolean NOT NULL DEFAULT false,
  observed_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competitor_id, source_type, observation_type, content_hash)
);

CREATE INDEX IF NOT EXISTS mari_competitor_observations_org_idx
  ON public.mari_competitor_observations (organization_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS mari_competitor_observations_competitor_idx
  ON public.mari_competitor_observations (competitor_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.mari_competitor_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  summary text NOT NULL,
  market_moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_observation_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mari_competitor_briefings_org_idx
  ON public.mari_competitor_briefings (organization_id, created_at DESC);

ALTER TABLE public.mari_competitor_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mari_competitor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mari_competitor_briefings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mari_competitor_watchlist FROM anon;
REVOKE ALL ON public.mari_competitor_observations FROM anon;
REVOKE ALL ON public.mari_competitor_briefings FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mari_competitor_watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mari_competitor_observations TO authenticated;
GRANT SELECT, INSERT ON public.mari_competitor_briefings TO authenticated;
GRANT ALL ON public.mari_competitor_watchlist TO service_role;
GRANT ALL ON public.mari_competitor_observations TO service_role;
GRANT ALL ON public.mari_competitor_briefings TO service_role;

CREATE POLICY "mari_comp_watchlist_tenant_select"
ON public.mari_competitor_watchlist FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_watchlist.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_watchlist.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_watchlist_tenant_insert"
ON public.mari_competitor_watchlist FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_watchlist.organization_id AND om.user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_watchlist.workspace_id AND wm.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "mari_comp_watchlist_tenant_update"
ON public.mari_competitor_watchlist FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_watchlist.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_watchlist.workspace_id AND wm.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_watchlist.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_watchlist.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_watchlist_tenant_delete"
ON public.mari_competitor_watchlist FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_watchlist.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_watchlist.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_obs_tenant_select"
ON public.mari_competitor_observations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_observations.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_observations.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_obs_tenant_insert"
ON public.mari_competitor_observations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_observations.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_observations.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_obs_tenant_update"
ON public.mari_competitor_observations FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_observations.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_observations.workspace_id AND wm.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_observations.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_observations.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_obs_tenant_delete"
ON public.mari_competitor_observations FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_observations.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_observations.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_brief_tenant_select"
ON public.mari_competitor_briefings FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_briefings.organization_id AND om.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_briefings.workspace_id AND wm.user_id = (SELECT auth.uid()))
);

CREATE POLICY "mari_comp_brief_tenant_insert"
ON public.mari_competitor_briefings FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = mari_competitor_briefings.organization_id AND om.user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = mari_competitor_briefings.workspace_id AND wm.user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "mari_comp_watchlist_service_role"
ON public.mari_competitor_watchlist FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mari_comp_obs_service_role"
ON public.mari_competitor_observations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "mari_comp_brief_service_role"
ON public.mari_competitor_briefings FOR ALL TO service_role USING (true) WITH CHECK (true);
