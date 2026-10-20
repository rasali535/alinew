-- Ralion OS — OAuth connection state workspace isolation
-- 2026-10-17
--
-- Aligns database uniqueness and credential-vault permissions with the
-- server-authoritative OAuth lifecycle. Existing tenantless legacy rows remain
-- readable to service_role for controlled cleanup; all new canonical writes
-- are workspace-scoped.

-- ---------------------------------------------------------------------------
-- 1. social_connections: same provider account may be connected independently
--    in different Ralion workspaces without moving/overwriting another tenant.
-- ---------------------------------------------------------------------------
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_user_id_provider_provider_account_id_key;

DROP INDEX IF EXISTS public.social_connections_user_id_provider_provider_account_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_connections_workspace_user_provider_account_unique
  ON public.social_connections (workspace_id, user_id, provider, provider_account_id);

-- ---------------------------------------------------------------------------
-- 2. meta_connections
-- ---------------------------------------------------------------------------
-- Workspace-scoped Meta credential uniqueness is owned by the earlier
-- 20260923053000_meta_credentials_workspace_unique.sql migration in the
-- package database schema. The clean Supabase preview schema does not create
-- meta_connections, so this migration intentionally does not reference that
-- optional table. Runtime Meta writes are exact workspace lookup/update/insert
-- and do not depend on this constraint being present.

-- ---------------------------------------------------------------------------
-- 3. Legacy social_account_tokens: add explicit tenant columns for migration
--    and remove user-global uniqueness. Runtime compatibility continues to use
--    extra_meta until every environment has this migration.
-- ---------------------------------------------------------------------------
ALTER TABLE public.social_account_tokens
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 3a. If extra_meta->>'workspaceId' is already a valid workspace in public.workspaces, adopt it
UPDATE public.social_account_tokens sat
SET workspace_id = (sat.extra_meta->>'workspaceId')::uuid
WHERE sat.workspace_id IS NULL
  AND COALESCE(sat.extra_meta->>'workspaceId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = (sat.extra_meta->>'workspaceId')::uuid);

-- 3b. Resolve workspace_id from workspaces owned by the user
UPDATE public.social_account_tokens sat
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.owner_id = sat.user_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE sat.workspace_id IS NULL;

-- 3c. Resolve workspace_id from workspace_memberships
UPDATE public.social_account_tokens sat
SET workspace_id = (
  SELECT wm.workspace_id FROM public.workspace_members wm
  WHERE wm.user_id = sat.user_id
  ORDER BY wm.joined_at ASC
  LIMIT 1
)
WHERE sat.workspace_id IS NULL;

-- 3d. If extra_meta->>'organizationId' is already a valid organization in public.organizations, adopt it
UPDATE public.social_account_tokens sat
SET organization_id = (sat.extra_meta->>'organizationId')::uuid
WHERE sat.organization_id IS NULL
  AND COALESCE(sat.extra_meta->>'organizationId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = (sat.extra_meta->>'organizationId')::uuid);

-- 3e. Derive organization_id from the resolved workspace_id's organization_id
UPDATE public.social_account_tokens sat
SET organization_id = w.organization_id
FROM public.workspaces w
WHERE sat.workspace_id = w.id
  AND sat.organization_id IS NULL;

-- 3f. Fallback: resolve organization_id from organizations owned by user
UPDATE public.social_account_tokens sat
SET organization_id = (
  SELECT o.id FROM public.organizations o
  WHERE o.owner_id = sat.user_id
  ORDER BY o.created_at ASC
  LIMIT 1
)
WHERE sat.organization_id IS NULL;

-- 3g. Enforce foreign key constraints safely now that references are backfilled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_account_tokens_organization_id_fkey'
  ) THEN
    ALTER TABLE public.social_account_tokens
      ADD CONSTRAINT social_account_tokens_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'social_account_tokens_workspace_id_fkey'
  ) THEN
    ALTER TABLE public.social_account_tokens
      ADD CONSTRAINT social_account_tokens_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.social_account_tokens
  DROP CONSTRAINT IF EXISTS social_account_tokens_user_id_provider_key;

DROP INDEX IF EXISTS public.social_account_tokens_user_id_provider_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_account_tokens_workspace_user_provider_unique
  ON public.social_account_tokens (workspace_id, user_id, provider);

CREATE INDEX IF NOT EXISTS idx_social_account_tokens_workspace
  ON public.social_account_tokens (workspace_id);

CREATE INDEX IF NOT EXISTS idx_social_account_tokens_organization
  ON public.social_account_tokens (organization_id);

ALTER TABLE public.social_account_tokens
  DROP CONSTRAINT IF EXISTS social_account_tokens_workspace_required;
ALTER TABLE public.social_account_tokens
  ADD CONSTRAINT social_account_tokens_workspace_required
  CHECK (workspace_id IS NOT NULL) NOT VALID;

-- Token rows are server-side credentials, not client state.
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON public.social_account_tokens;
DROP POLICY IF EXISTS "service_role_bypass" ON public.social_account_tokens;
DROP POLICY IF EXISTS "social_tokens_delete_own" ON public.social_account_tokens;
DROP POLICY IF EXISTS "social_tokens_insert_own" ON public.social_account_tokens;
DROP POLICY IF EXISTS "social_tokens_select_own" ON public.social_account_tokens;
DROP POLICY IF EXISTS "social_tokens_update_own" ON public.social_account_tokens;
DROP POLICY IF EXISTS "social_account_tokens_service_role_only" ON public.social_account_tokens;

CREATE POLICY "social_account_tokens_service_role_only"
ON public.social_account_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.social_account_tokens FROM anon, authenticated;
GRANT ALL ON public.social_account_tokens TO service_role;
