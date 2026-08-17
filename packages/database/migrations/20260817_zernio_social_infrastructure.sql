-- =====================================================================
-- Ralion OS — Zernio Social Infrastructure Layer Migration
-- Migration: 20260817_zernio_social_infrastructure.sql
-- Developed by Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_social_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3. Social Provider Profiles (Tenant Mapping Table)
-- Maps Ralion Organizations & Workspaces 1:1 to Zernio Profiles.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    workspace_id UUID,
    user_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'zernio' CHECK (provider IN ('zernio')),
    provider_profile_id TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_prof_org ON public.social_provider_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_ws ON public.social_provider_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_user ON public.social_provider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_prof_pid ON public.social_provider_profiles(provider_profile_id);

-- =====================================================================
-- 4. Social Provider Routing Configuration Table
-- Controls per-platform provider selection (zernio vs native) and priorities.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_provider_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    organization_id UUID,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky')),
    provider TEXT NOT NULL DEFAULT 'zernio' CHECK (provider IN ('zernio', 'native')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    fallback_provider TEXT DEFAULT 'native' CHECK (fallback_provider IN ('zernio', 'native', 'none')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_routing_ws ON public.social_provider_routing(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sp_routing_platform ON public.social_provider_routing(platform);

-- =====================================================================
-- 5. Unified Social Connections Table (if not exists)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID,
    workspace_id UUID,
    provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky')),
    provider_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    username TEXT,
    profile_image_url TEXT,
    account_type TEXT NOT NULL DEFAULT 'PERSONAL' CHECK (account_type IN ('PERSONAL', 'PAGE', 'BUSINESS', 'ORGANIZATION', 'CREATOR')),
    connection_status TEXT NOT NULL DEFAULT 'CONNECTED' CHECK (connection_status IN ('CONNECTED', 'NEEDS_ATTENTION', 'RECONNECT_REQUIRED', 'DISCONNECTED', 'REVOKED')),
    token_status TEXT NOT NULL DEFAULT 'TOKEN_VALID' CHECK (token_status IN ('TOKEN_VALID', 'TOKEN_EXPIRING', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'REAUTH_REQUIRED')),
    scopes TEXT[] NOT NULL DEFAULT '{}',
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    followers_count BIGINT DEFAULT 0,
    infrastructure_provider TEXT NOT NULL DEFAULT 'native' CHECK (infrastructure_provider IN ('native', 'zernio')),
    zernio_account_id TEXT,
    zernio_profile_id TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    last_health_check_at TIMESTAMPTZ DEFAULT NOW(),
    health_error_message TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_account_id)
);

-- Extend social_connections if table already exists
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

CREATE INDEX IF NOT EXISTS idx_social_conn_user_id ON public.social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_infra ON public.social_connections(infrastructure_provider);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_acc ON public.social_connections(zernio_account_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_zernio_prof ON public.social_connections(zernio_profile_id);

-- =====================================================================
-- 6. Social Webhook Events Log (Immutable Webhook Audit)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'zernio',
    event_type TEXT NOT NULL,
    event_id TEXT,
    provider_profile_id TEXT,
    provider_account_id TEXT,
    organization_id UUID,
    workspace_id UUID,
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
-- 7. Trigger for Updated_at Timestamps
-- =====================================================================
DROP TRIGGER IF EXISTS on_social_provider_profiles_updated ON public.social_provider_profiles;
CREATE TRIGGER on_social_provider_profiles_updated
  BEFORE UPDATE ON public.social_provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

DROP TRIGGER IF EXISTS on_social_provider_routing_updated ON public.social_provider_routing;
CREATE TRIGGER on_social_provider_routing_updated
  BEFORE UPDATE ON public.social_provider_routing
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

DROP TRIGGER IF EXISTS on_social_connections_updated ON public.social_connections;
CREATE TRIGGER on_social_connections_updated
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

-- =====================================================================
-- 8. Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.social_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_provider_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_webhook_events ENABLE ROW LEVEL SECURITY;

-- 8.1 social_provider_profiles RLS:
DROP POLICY IF EXISTS "sp_profiles_user_own" ON public.social_provider_profiles;
CREATE POLICY "sp_profiles_user_own" ON public.social_provider_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sp_profiles_service_role" ON public.social_provider_profiles;
CREATE POLICY "sp_profiles_service_role" ON public.social_provider_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 8.2 social_connections RLS:
DROP POLICY IF EXISTS "social_conn_user_own" ON public.social_connections;
CREATE POLICY "social_conn_user_own" ON public.social_connections
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "social_conn_service_role" ON public.social_connections;
CREATE POLICY "social_conn_service_role" ON public.social_connections
    FOR ALL USING (auth.role() = 'service_role');

-- 8.3 social_provider_routing RLS:
DROP POLICY IF EXISTS "sp_routing_service_role" ON public.social_provider_routing;
CREATE POLICY "sp_routing_service_role" ON public.social_provider_routing
    FOR ALL USING (auth.role() = 'service_role');

-- 8.4 social_webhook_events RLS: Strict Service Role only
DROP POLICY IF EXISTS "swe_service_role_only" ON public.social_webhook_events;
CREATE POLICY "swe_service_role_only" ON public.social_webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================================
-- 9. Refresh Safe View to include Infrastructure Provider fields
-- =====================================================================
CREATE OR REPLACE VIEW public.social_connections_safe AS
  SELECT id, user_id, organization_id, workspace_id, provider, provider_account_id,
         account_name, username, profile_image_url, account_type, connection_status,
         token_status, scopes, capabilities, metadata, followers_count,
         infrastructure_provider, zernio_account_id, zernio_profile_id,
         last_sync_at, last_health_check_at, health_error_message, connected_at, created_at, updated_at
  FROM public.social_connections;

GRANT SELECT ON public.social_connections_safe TO authenticated;
GRANT ALL ON public.social_connections TO authenticated, service_role;
GRANT ALL ON public.social_provider_profiles TO authenticated, service_role;
GRANT ALL ON public.social_provider_routing TO authenticated, service_role;
GRANT ALL ON public.social_webhook_events TO service_role;
