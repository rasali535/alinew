-- Ralion OS — Mari Marketing Learning outcome integrity
-- Stable experiment identity + idempotent metric snapshots.

ALTER TABLE public.mari_marketing_outcomes
  ADD COLUMN IF NOT EXISTS metrics_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mari_marketing_experiment_source
  ON public.mari_marketing_experiments (organization_id, workspace_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mari_marketing_outcome_metrics
  ON public.mari_marketing_outcomes (experiment_id, metrics_hash)
  WHERE metrics_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mari_marketing_experiments_source
  ON public.mari_marketing_experiments (organization_id, workspace_id, source_type, source_id);

COMMENT ON COLUMN public.mari_marketing_outcomes.metrics_hash IS
  'Deterministic hash of the observed metric payload. Prevents duplicate outcome snapshots when metrics have not changed.';
