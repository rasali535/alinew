-- =====================================================================
-- Ralion OS — Facebook Page Management & Multi-Destination Architecture
-- Migration: 20260817_facebook_page_management.sql
-- Developed by Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Social Destinations Table (Multi-Page & Channel Destinations)
CREATE TABLE IF NOT EXISTS public.social_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    workspace_id UUID,
    user_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'facebook' CHECK (provider IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky')),
    platform TEXT NOT NULL DEFAULT 'facebook' CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x', 'youtube', 'threads', 'pinterest', 'reddit', 'bluesky')),
    infrastructure_provider TEXT NOT NULL DEFAULT 'zernio' CHECK (infrastructure_provider IN ('native', 'zernio')),
    provider_account_id TEXT NOT NULL,
    provider_profile_id TEXT,
    provider_page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_username TEXT,
    profile_image_url TEXT,
    category TEXT,
    followers_count BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'CONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'LOCKED', 'NEEDS_ATTENTION')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_platform_page UNIQUE(organization_id, platform, provider_page_id)
);

CREATE INDEX IF NOT EXISTS idx_sdest_org ON public.social_destinations(organization_id);
CREATE INDEX IF NOT EXISTS idx_sdest_platform ON public.social_destinations(platform);
CREATE INDEX IF NOT EXISTS idx_sdest_page_id ON public.social_destinations(provider_page_id);
CREATE INDEX IF NOT EXISTS idx_sdest_status ON public.social_destinations(status);

-- 3. Organization Social Entitlements Table
CREATE TABLE IF NOT EXISTS public.organization_social_entitlements (
    organization_id UUID PRIMARY KEY,
    facebook_page_limit INT NOT NULL DEFAULT 1,
    instagram_account_limit INT NOT NULL DEFAULT 1,
    linkedin_page_limit INT NOT NULL DEFAULT 1,
    x_account_limit INT NOT NULL DEFAULT 1,
    custom_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Atomic Server-Side Entitlement Validator Function
CREATE OR REPLACE FUNCTION public.validate_facebook_page_entitlement(
    p_organization_id UUID,
    p_page_id TEXT
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INT,
    page_limit INT,
    is_reconnect BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_limit INT := 1;
    v_active_count INT := 0;
    v_is_existing BOOLEAN := false;
BEGIN
    -- 1. Resolve Organization Entitlement Limit
    SELECT facebook_page_limit INTO v_limit
    FROM public.organization_social_entitlements
    WHERE organization_id = p_organization_id;

    IF v_limit IS NULL THEN
        v_limit := 1; -- Default Starter Plan Entitlement
    END IF;

    -- 2. Check if this exact page is already connected for this organization
    SELECT EXISTS (
        SELECT 1 FROM public.social_destinations
        WHERE organization_id = p_organization_id
          AND platform = 'facebook'
          AND provider_page_id = p_page_id
          AND status = 'CONNECTED'
          AND is_active = true
    ) INTO v_is_existing;

    IF v_is_existing THEN
        RETURN QUERY SELECT true, 1, v_limit, true, NULL::TEXT;
        RETURN;
    END IF;

    -- 3. Count currently active connected Facebook pages
    SELECT COUNT(*)::INT INTO v_active_count
    FROM public.social_destinations
    WHERE organization_id = p_organization_id
      AND platform = 'facebook'
      AND status = 'CONNECTED'
      AND is_active = true;

    -- 4. Evaluate limit
    IF v_active_count >= v_limit THEN
        RETURN QUERY SELECT false, v_active_count, v_limit, false, 'FEATURE_LIMIT_REACHED'::TEXT;
    ELSE
        RETURN QUERY SELECT true, v_active_count, v_limit, false, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security (RLS)
ALTER TABLE public.social_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_social_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social destinations for their organization"
    ON public.social_destinations FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage social destinations for their organization"
    ON public.social_destinations FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view organization entitlements"
    ON public.organization_social_entitlements FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 6. Permissions Grant
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_destinations TO authenticated, service_role, anon;
GRANT SELECT, INSERT, UPDATE ON public.organization_social_entitlements TO authenticated, service_role, anon;
