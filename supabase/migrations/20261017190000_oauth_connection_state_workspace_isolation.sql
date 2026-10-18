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
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.social_account_tokens
SET workspace_id = (extra_meta->>'workspaceId')::uuid
WHERE workspace_id IS NULL
  AND COALESCE(extra_meta->>'workspaceId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

UPDATE public.social_account_tokens
SET organization_id = (extra_meta->>'organizationId')::uuid
WHERE organization_id IS NULL
  AND COALESCE(extra_meta->>'organizationId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

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
