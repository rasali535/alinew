-- =====================================================================
-- Ralion OS — Zernio Social Infrastructure Layer Migration
-- Migration: 20260817_zernio_social_infrastructure.sql
-- Developed by Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. Social Provider Profiles (Tenant Mapping Table)
-- Maps Ralion Organizations & Workspaces 1:1 to Zernio Profiles.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'zernio' CHECK (provider IN ('zernio')),
    provider_profile_id TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, provider),
    UNIQUE(provider_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_prof_org ON public.social_provider_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_ws ON public.social_provider_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_user ON public.social_provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_pid ON public.social_provider_profiles(provider_profile_id);

-- =====================================================================
-- 3. Social Provider Routing Configuration Table
-- Controls per-platform provider selection (zernio vs native) and priorities.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_provider_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky')),
    provider TEXT NOT NULL DEFAULT 'zernio' CHECK (provider IN ('zernio', 'native')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    fallback_provider TEXT DEFAULT 'native' CHECK (fallback_provider IN ('zernio', 'native', 'none')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_sp_routing_ws ON public.social_provider_routing(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sp_routing_platform ON public.social_provider_routing(platform);

-- =====================================================================
-- 4. Extend social_connections with Infrastructure Provider & Zernio IDs
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'social_connections' AND column_name = 'infrastructure_provider'
    ) THEN
        ALTER TABLE public.social_connections 
        ADD COLUMN infrastructure_provider TEXT NOT NULL DEFAULT 'native' CHECK (infrastructure_provider IN ('native', 'zernio'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'social_connections' AND column_name = 'zernio_account_id'
    ) THEN
        ALTER TABLE public.social_connections 
        ADD COLUMN zernio_account_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'social_connections' AND column_name = 'zernio_profile_id'
    ) THEN
        ALTER TABLE public.social_connections 
        ADD COLUMN zernio_profile_id TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_conn_infra ON public.social_connections(infrastructure_provider);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_acc ON public.social_connections(zernio_account_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_prof ON public.social_connections(zernio_profile_id);

-- =====================================================================
-- 5. Social Webhook Events Log (Immutable Webhook Audit)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'zernio',
    event_type TEXT NOT NULL,
    event_id TEXT,
    provider_profile_id TEXT,
    provider_account_id TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT true,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swe_provider ON public.social_webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_swe_profile_id ON public.social_webhook_events(provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_swe_account_id ON public.social_webhook_events(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_swe_created_at ON public.social_webhook_events(created_at DESC);

-- =====================================================================
-- 6. Trigger for Updated_at Timestamps
-- =====================================================================
DROP TRIGGER IF EXISTS on_social_provider_profiles_updated ON public.social_provider_profiles;
CREATE TRIGGER on_social_provider_profiles_updated
  BEFORE UPDATE ON public.social_provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

DROP TRIGGER IF EXISTS on_social_provider_routing_updated ON public.social_provider_routing;
CREATE TRIGGER on_social_provider_routing_updated
  BEFORE UPDATE ON public.social_provider_routing
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

-- =====================================================================
-- 7. Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.social_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_provider_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_webhook_events ENABLE ROW LEVEL SECURITY;

-- 7.1 social_provider_profiles RLS:
CREATE POLICY "sp_profiles_user_own" ON public.social_provider_profiles
    FOR ALL USING (
        auth.uid() = user_id OR
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "sp_profiles_service_role" ON public.social_provider_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 7.2 social_provider_routing RLS:
CREATE POLICY "sp_routing_user_own" ON public.social_provider_routing
    FOR ALL USING (
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "sp_routing_service_role" ON public.social_provider_routing
    FOR ALL USING (auth.role() = 'service_role');

-- 7.3 social_webhook_events RLS: Strict Admin / Service Role only
CREATE POLICY "swe_admin_access" ON public.social_webhook_events
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMINISTRATOR')
        )
    );

-- =====================================================================
-- 8. Refresh Safe View to include Infrastructure Provider fields
-- =====================================================================
CREATE OR REPLACE VIEW public.social_connections_safe AS
  SELECT id, user_id, organization_id, workspace_id, provider, provider_account_id,
         account_name, username, profile_image_url, account_type, connection_status,
         token_status, scopes, capabilities, metadata, followers_count,
         infrastructure_provider, zernio_account_id, zernio_profile_id,
         last_sync_at, last_health_check_at, health_error_message, connected_at, created_at, updated_at
  FROM public.social_connections;

GRANT SELECT ON public.social_connections_safe TO authenticated;
GRANT ALL ON public.social_provider_profiles TO service_role;
GRANT ALL ON public.social_provider_routing TO service_role;
GRANT ALL ON public.social_webhook_events TO service_role;
