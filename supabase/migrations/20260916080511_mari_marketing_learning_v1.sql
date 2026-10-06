-- Ralion OS — Mari Marketing Learning Engine v1
-- Tenant-isolated, evidence-backed marketing experiments and learned patterns.

CREATE TABLE IF NOT EXISTS public.mari_marketing_experiments (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  created_by uuid,
  source_type text NOT NULL CHECK (source_type IN ('SOCIAL_POST','GROWTH_CONTENT','CAMPAIGN','MANUAL')),
  source_id text,
  hypothesis text NOT NULL,
  content_type text,
  objective text,
  audience text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'OBSERVED' CHECK (status IN ('PLANNED','RUNNING','OBSERVED','COMPLETED','CANCELLED')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS public.mari_marketing_outcomes (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  experiment_id uuid NOT NULL REFERENCES public.mari_marketing_experiments(id) ON DELETE CASCADE,
  metric_window_days integer NOT NULL DEFAULT 30 CHECK (metric_window_days BETWEEN 1 AND 365),
  impressions bigint,
  reach bigint,
  reactions bigint NOT NULL DEFAULT 0,
  comments bigint NOT NULL DEFAULT 0,
  shares bigint NOT NULL DEFAULT 0,
  clicks bigint,
  leads bigint,
  conversions bigint,
  spend numeric(14,2),
  revenue numeric(14,2),
  engagement bigint NOT NULL DEFAULT 0,
  engagement_rate_pct numeric(10,4),
  raw_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS public.mari_marketing_learnings (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  learning_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('CONTENT_TYPE','MESSAGE_THEME','CTA','AUDIENCE','CHANNEL','TIMING','OFFER','OBJECTIVE','OTHER')),
  claim text NOT NULL,
  evidence_summary text NOT NULL,
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count integer NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  supporting_experiment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  contradicting_experiment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'EMERGING' CHECK (status IN ('EMERGING','SUPPORTED','CONTESTED','STALE')),
  first_observed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  last_observed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (organization_id, workspace_id, learning_key)
);

CREATE INDEX IF NOT EXISTS idx_mari_marketing_experiments_tenant ON public.mari_marketing_experiments (organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_outcomes_tenant ON public.mari_marketing_outcomes (organization_id, workspace_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mari_marketing_learnings_tenant ON public.mari_marketing_learnings (organization_id, workspace_id, confidence DESC, updated_at DESC);

ALTER TABLE public.mari_marketing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mari_marketing_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mari_marketing_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mari_marketing_experiments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mari_marketing_outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mari_marketing_learnings FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.mari_marketing_experiments, public.mari_marketing_outcomes, public.mari_marketing_learnings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mari_marketing_experiments, public.mari_marketing_outcomes, public.mari_marketing_learnings TO service_role;

DROP POLICY IF EXISTS mari_marketing_experiments_service_role ON public.mari_marketing_experiments;
CREATE POLICY mari_marketing_experiments_service_role ON public.mari_marketing_experiments FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS mari_marketing_outcomes_service_role ON public.mari_marketing_outcomes;
CREATE POLICY mari_marketing_outcomes_service_role ON public.mari_marketing_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS mari_marketing_learnings_service_role ON public.mari_marketing_learnings;
CREATE POLICY mari_marketing_learnings_service_role ON public.mari_marketing_learnings FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.mari_marketing_learnings IS 'Evidence-backed tenant marketing learnings. Claims must remain probabilistic and traceable to experiments; never treated as universal truth.';
