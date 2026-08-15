-- =====================================================================
-- Ralion OS — Unified Social Media Connections System
-- Migration: 20260815_social_connections_unified.sql
-- Developed by Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. Unified Social Connections Table (Metadata & State)
-- Multi-tenant: Supports both User-level and Organization/Workspace-level connections.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x')),
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
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    last_health_check_at TIMESTAMPTZ DEFAULT NOW(),
    health_error_message TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_conn_user_id ON public.social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_workspace_id ON public.social_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_conn_provider ON public.social_connections(provider);
CREATE INDEX IF NOT EXISTS idx_social_conn_status ON public.social_connections(connection_status);

-- =====================================================================
-- 3. Social Credentials Vault (Isolated Server-Side Storage)
-- AES-256-GCM encrypted tokens. Service-role only access.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    refresh_expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_connection_id)
);

CREATE INDEX IF NOT EXISTS idx_social_cred_conn_id ON public.social_credentials(social_connection_id);
CREATE INDEX IF NOT EXISTS idx_social_cred_expires ON public.social_credentials(expires_at);

-- =====================================================================
-- 4. Unified Social Content & Posts Table
-- Multi-platform publishing queue and history.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    media_types TEXT[] DEFAULT '{}',
    platforms TEXT[] NOT NULL, -- e.g. ['facebook', 'instagram', 'linkedin', 'x']
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'QUEUED', 'PROCESSING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'CANCELLED')),
    platform_post_ids JSONB DEFAULT '{}'::jsonb, -- e.g. {"facebook": "fb_post_123", "x": "x_tweet_456"}
    platform_results JSONB DEFAULT '{}'::jsonb,  -- status and errors per platform
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    author_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_workspace ON public.social_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON public.social_posts(scheduled_for);

-- =====================================================================
-- 5. Unified Social Inbox Table (Direct Messages & Conversations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x')),
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    sender_avatar_url TEXT,
    recipient_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    media_url TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_conn_id ON public.social_inbox_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conversation ON public.social_inbox_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_provider ON public.social_inbox_messages(provider);
CREATE INDEX IF NOT EXISTS idx_inbox_timestamp ON public.social_inbox_messages(timestamp DESC);

-- =====================================================================
-- 6. Social Webhooks Audit Log Table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.social_webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT true,
    processed BOOLEAN NOT NULL DEFAULT false,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON public.social_webhooks_log(provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_received ON public.social_webhooks_log(received_at DESC);

-- =====================================================================
-- 7. Trigger for Updated_at Timestamps
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_social_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_social_connections_updated ON public.social_connections;
CREATE TRIGGER on_social_connections_updated
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

DROP TRIGGER IF EXISTS on_social_posts_updated ON public.social_posts;
CREATE TRIGGER on_social_posts_updated
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_tables_updated_at();

-- =====================================================================
-- 8. Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_webhooks_log ENABLE ROW LEVEL SECURITY;

-- 8.1 social_connections RLS:
CREATE POLICY "social_conn_user_own" ON public.social_connections
    FOR ALL USING (
        auth.uid() = user_id OR
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "social_conn_service_role" ON public.social_connections
    FOR ALL USING (auth.role() = 'service_role');

-- 8.2 social_credentials RLS: STRICT SERVICE ROLE ONLY
-- Non-privileged clients are prohibited from querying credentials directly.
CREATE POLICY "social_cred_service_role_only" ON public.social_credentials
    FOR ALL USING (auth.role() = 'service_role');

-- 8.3 social_posts RLS:
CREATE POLICY "social_posts_user_own" ON public.social_posts
    FOR ALL USING (
        auth.uid() = user_id OR
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ))
    );

CREATE POLICY "social_posts_service_role" ON public.social_posts
    FOR ALL USING (auth.role() = 'service_role');

-- 8.4 social_inbox_messages RLS:
CREATE POLICY "social_inbox_user_own" ON public.social_inbox_messages
    FOR ALL USING (
        (workspace_id IS NOT NULL AND workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )) OR
        connection_id IN (
            SELECT id FROM public.social_connections WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "social_inbox_service_role" ON public.social_inbox_messages
    FOR ALL USING (auth.role() = 'service_role');

-- 8.5 social_webhooks_log RLS: Admin / Service Role only
CREATE POLICY "webhooks_log_admin" ON public.social_webhooks_log
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMINISTRATOR')
        )
    );

-- =====================================================================
-- 9. Safe Client View for Social Connections
-- Completely omits credentials for client apps.
-- =====================================================================
CREATE OR REPLACE VIEW public.social_connections_safe AS
  SELECT id, user_id, organization_id, workspace_id, provider, provider_account_id,
         account_name, username, profile_image_url, account_type, connection_status,
         token_status, scopes, capabilities, metadata, followers_count,
         last_sync_at, last_health_check_at, health_error_message, connected_at, created_at, updated_at
  FROM public.social_connections;

GRANT SELECT ON public.social_connections_safe TO authenticated;
GRANT ALL ON public.social_connections TO service_role;
GRANT ALL ON public.social_credentials TO service_role;
GRANT ALL ON public.social_posts TO service_role;
GRANT ALL ON public.social_inbox_messages TO service_role;
GRANT ALL ON public.social_webhooks_log TO service_role;
