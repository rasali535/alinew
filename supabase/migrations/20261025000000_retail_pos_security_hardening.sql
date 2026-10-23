-- =====================================================================
-- Ralion Retail POS Security Hardening: Durable Nonce Consumption & Shared Lockout
-- Migration: 20261025000000_retail_pos_security_hardening.sql
-- =====================================================================

-- 1. Shared Table for Single-Use POS Manager Approval Nonces (Anti-Replay)
CREATE TABLE IF NOT EXISTS public.retail_pos_consumed_tokens (
    token_id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    action_payload_hash TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    sale_id UUID REFERENCES public.retail_sales(id) ON DELETE SET NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_consumed_tokens_ws ON public.retail_pos_consumed_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pos_consumed_tokens_exp ON public.retail_pos_consumed_tokens(expires_at);

-- 2. Shared Table for Anti-Brute-Force Manager PIN Lockouts
CREATE TABLE IF NOT EXISTS public.retail_pos_lockouts (
    lockout_key TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    failed_attempts INT NOT NULL DEFAULT 1,
    locked_until TIMESTAMPTZ,
    last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_lockouts_ws ON public.retail_pos_lockouts(workspace_id);

-- Enable Row Level Security
ALTER TABLE public.retail_pos_consumed_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_pos_lockouts ENABLE ROW LEVEL SECURITY;

-- Service role policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "retail_pos_consumed_tokens_service_role" ON public.retail_pos_consumed_tokens;
    CREATE POLICY "retail_pos_consumed_tokens_service_role" ON public.retail_pos_consumed_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "retail_pos_lockouts_service_role" ON public.retail_pos_lockouts;
    CREATE POLICY "retail_pos_lockouts_service_role" ON public.retail_pos_lockouts FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

GRANT ALL ON public.retail_pos_consumed_tokens TO service_role;
GRANT ALL ON public.retail_pos_lockouts TO service_role;
