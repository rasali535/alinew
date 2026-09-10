-- =====================================================================
-- Ralion OS — P0 Social Content / Inbox / Webhook RLS Hardening
-- Migration: 20260910_social_content_rls_hardening.sql
-- =====================================================================

-- SOCIAL POSTS ---------------------------------------------------------
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_posts_user_own" ON public.social_posts;
DROP POLICY IF EXISTS "social_posts_service_role" ON public.social_posts;

CREATE POLICY "social_posts_tenant_select"
ON public.social_posts
FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_posts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "social_posts_tenant_insert"
ON public.social_posts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_posts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "social_posts_tenant_update"
ON public.social_posts
FOR UPDATE TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_posts.workspace_id
      AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_posts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "social_posts_tenant_delete"
ON public.social_posts
FOR DELETE TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_posts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "social_posts_service_role"
ON public.social_posts
FOR ALL TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_tenant_required;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_tenant_required
  CHECK (workspace_id IS NOT NULL) NOT VALID;

-- SOCIAL INBOX ---------------------------------------------------------
ALTER TABLE public.social_inbox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_inbox_user_own" ON public.social_inbox_messages;
DROP POLICY IF EXISTS "social_inbox_service_role" ON public.social_inbox_messages;

-- Access requires membership in the inbox row's workspace AND the referenced
-- connection must belong to that same workspace. This blocks connection-ID
-- substitution across tenants.
CREATE POLICY "social_inbox_tenant_select"
ON public.social_inbox_messages
FOR SELECT TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = social_inbox_messages.workspace_id
      AND wm.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.social_connections sc
    WHERE sc.id = social_inbox_messages.connection_id
      AND sc.workspace_id = social_inbox_messages.workspace_id
  )
);

CREATE POLICY "social_inbox_service_role"
ON public.social_inbox_messages
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Inbox ingestion/mutation is backend-only. Browser clients can read only
-- tenant-authorized rows; webhooks/server workers write with service role.
REVOKE INSERT, UPDATE, DELETE ON public.social_inbox_messages FROM authenticated, anon;
REVOKE ALL ON public.social_inbox_messages FROM anon;
GRANT SELECT ON public.social_inbox_messages TO authenticated;
GRANT ALL ON public.social_inbox_messages TO service_role;

ALTER TABLE public.social_inbox_messages
  DROP CONSTRAINT IF EXISTS social_inbox_tenant_required;
ALTER TABLE public.social_inbox_messages
  ADD CONSTRAINT social_inbox_tenant_required
  CHECK (workspace_id IS NOT NULL) NOT VALID;

-- SOCIAL WEBHOOK LOG ---------------------------------------------------
-- The current webhook log has no tenant key. Until it is tenant-scoped, no
-- tenant/admin browser role may query it. Service role only.
ALTER TABLE public.social_webhooks_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhooks_log_admin" ON public.social_webhooks_log;
CREATE POLICY "webhooks_log_service_role_only"
ON public.social_webhooks_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);
REVOKE ALL ON public.social_webhooks_log FROM authenticated, anon;
GRANT ALL ON public.social_webhooks_log TO service_role;

-- SOCIAL ENTITLEMENTS --------------------------------------------------
ALTER TABLE public.organization_social_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view organization entitlements" ON public.organization_social_entitlements;

CREATE POLICY "social_entitlements_tenant_select"
ON public.organization_social_entitlements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_social_entitlements.organization_id
      AND om.user_id = auth.uid()
  )
);

CREATE POLICY "social_entitlements_service_role"
ON public.organization_social_entitlements
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Entitlements are billing/backend authority. Tenants can view their own but
-- cannot self-upgrade limits through direct database writes.
REVOKE INSERT, UPDATE, DELETE ON public.organization_social_entitlements FROM authenticated, anon;
REVOKE ALL ON public.organization_social_entitlements FROM anon;
GRANT SELECT ON public.organization_social_entitlements TO authenticated;
GRANT ALL ON public.organization_social_entitlements TO service_role;
