-- Ralion OS: canonical, server-only social publication history.
-- growth_content remains the upstream planning model. This table records dispatch outcomes.
-- This migration is additive and safe for the production-shaped legacy social_posts table.

CREATE TABLE IF NOT EXISTS public.social_posts (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id text NOT NULL,
    workspace_id text,
    organization_id text,
    title text,
    body text NOT NULL,
    media_urls text[] DEFAULT '{}'::text[],
    media_types text[] DEFAULT '{}'::text[],
    platforms text[] NOT NULL,
    status text NOT NULL DEFAULT 'PUBLISHED',
    platform_post_ids jsonb DEFAULT '{}'::jsonb,
    platform_results jsonb DEFAULT '{}'::jsonb,
    scheduled_for timestamptz,
    published_at timestamptz,
    author_name text DEFAULT 'Ralion User',
    social_connection_id uuid,
    content_id uuid,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.social_posts
    ADD COLUMN IF NOT EXISTS organization_id text,
    ADD COLUMN IF NOT EXISTS content_id uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT pg_catalog.now();

COMMENT ON COLUMN public.social_posts.content_id IS
    'Optional logical reference to upstream growth_content; intentionally not a foreign key.';

CREATE INDEX IF NOT EXISTS idx_social_posts_tenant_created
    ON public.social_posts (organization_id, workspace_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_created
    ON public.social_posts (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_status_created
    ON public.social_posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_platforms
    ON public.social_posts USING gin (platforms);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts FORCE ROW LEVEL SECURITY;

-- Remove known legacy direct-client policies. Publication history is brokered by
-- authenticated server routes, which add organization/workspace/user predicates.
DROP POLICY IF EXISTS social_posts_user_own ON public.social_posts;
DROP POLICY IF EXISTS social_posts_tenant_select ON public.social_posts;
DROP POLICY IF EXISTS social_posts_tenant_insert ON public.social_posts;
DROP POLICY IF EXISTS social_posts_tenant_update ON public.social_posts;
DROP POLICY IF EXISTS social_posts_tenant_delete ON public.social_posts;
DROP POLICY IF EXISTS social_posts_service_role ON public.social_posts;

REVOKE ALL ON TABLE public.social_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_posts TO service_role;
