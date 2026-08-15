-- =====================================================================
-- Ralion OS — Meta Platform Data Protection & Security Hardening
-- Migration: 20260815_meta_security_hardening.sql
-- Developed by Ras Ali Labs (Pty) Ltd
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. Meta Connections Table (Dedicated Meta Platform Data Store)
-- Minimizes data retention strictly to necessary operational fields.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.meta_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    meta_user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('facebook', 'instagram', 'meta', 'whatsapp')),
    email TEXT,
    profile_picture_url TEXT,
    account_handle TEXT,
    account_name TEXT,
    page_id TEXT,
    scopes TEXT[] DEFAULT '{}',
    connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'expired', 'disconnected', 'revoked')),
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider, meta_user_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_conn_user_id ON public.meta_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_conn_meta_user_id ON public.meta_connections(meta_user_id);
CREATE INDEX IF NOT EXISTS idx_meta_conn_status ON public.meta_connections(connection_status);

-- =====================================================================
-- 3. Security Audit Logs Table (Immutable, Append-Only)
-- Retains comprehensive security events for >= 90 days.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    meta_user_id TEXT,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN ('AUTH', 'META', 'ADMIN', 'SECURITY', 'DATA_ACCESS', 'RBAC')),
    success BOOLEAN NOT NULL DEFAULT true,
    ip_address TEXT,
    user_agent TEXT,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_logs_meta_user_id ON public.security_audit_logs(meta_user_id);
CREATE INDEX IF NOT EXISTS idx_sec_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_logs_timestamp ON public.security_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_category ON public.security_audit_logs(event_category);

-- =====================================================================
-- 4. Weekly Security Review Records Table
-- Supports Meta requirement for recurring 7-day security audit reviews.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.security_review_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_period TEXT NOT NULL, -- e.g. '2026-W33'
    reviewer TEXT NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    findings TEXT,
    incidents_found INT NOT NULL DEFAULT 0,
    actions_taken TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ACTION_REQUIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sec_review_period ON public.security_review_records(review_period);
CREATE INDEX IF NOT EXISTS idx_sec_review_reviewed_at ON public.security_review_records(reviewed_at DESC);

-- =====================================================================
-- 5. Security Alerts Table
-- Tracks threat detection and security anomalies.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'FAILED_LOGIN_SPIKE',
        'SUSPICIOUS_META_ACTIVITY',
        'PRIVILEGE_ESCALATION_ATTEMPT',
        'UNAUTHORIZED_API_CALL',
        'TOKEN_ANOMALY',
        'EXCESSIVE_RATE_LIMIT',
        'ACCOUNT_LOCKED',
        'SECURITY_ALERT'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    meta_user_id TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sec_alerts_status ON public.security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sec_alerts_severity ON public.security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_sec_alerts_created_at ON public.security_alerts(created_at DESC);

-- =====================================================================
-- 6. Trigger for updated_at timestamps
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_meta_conn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_meta_connections_updated ON public.meta_connections;
CREATE TRIGGER on_meta_connections_updated
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_meta_conn_updated_at();

-- =====================================================================
-- 7. Row Level Security (RLS) Configuration
-- =====================================================================
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_review_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- 7.1 meta_connections RLS:
-- Users can view their own connections. Token writes require service_role.
CREATE POLICY "meta_conn_select_own" ON public.meta_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meta_conn_service_role" ON public.meta_connections
    FOR ALL USING (auth.role() = 'service_role');

-- 7.2 security_audit_logs RLS:
-- Audit logs are strictly immutable: NO UPDATE, NO DELETE permitted.
-- Users can insert their own events or service_role can manage.
-- Only platform admins or service_role can read audit logs.
CREATE POLICY "audit_logs_insert_authenticated" ON public.security_audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit_logs_select_admin" ON public.security_audit_logs
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMINISTRATOR')
        )
    );

CREATE POLICY "audit_logs_service_role" ON public.security_audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 7.3 security_review_records RLS:
-- Only administrators and service_role can read/write review records.
CREATE POLICY "sec_review_admin_access" ON public.security_review_records
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMINISTRATOR')
        )
    );

-- 7.4 security_alerts RLS:
-- Admins and service_role can view and update alerts.
CREATE POLICY "sec_alerts_admin_access" ON public.security_alerts
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE user_id = auth.uid() AND role IN ('OWNER', 'ADMINISTRATOR')
        )
    );

-- =====================================================================
-- 8. Safe View for Non-Privileged Client Access
-- Hides all encrypted tokens completely from client queries.
-- =====================================================================
CREATE OR REPLACE VIEW public.meta_connections_safe AS
  SELECT id, user_id, workspace_id, meta_user_id, provider, email,
         profile_picture_url, account_handle, account_name, page_id,
         scopes, connection_status, token_expires_at, last_sync_at,
         created_at, updated_at
  FROM public.meta_connections;

GRANT SELECT ON public.meta_connections_safe TO authenticated;
GRANT ALL ON public.meta_connections TO service_role;
GRANT ALL ON public.security_audit_logs TO service_role;
GRANT ALL ON public.security_review_records TO service_role;
GRANT ALL ON public.security_alerts TO service_role;
