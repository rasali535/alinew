-- =====================================================================
-- Ralion OS — Harden Trial Access Code Redemption & Direct Workspace Grants
-- Migration: 20261024000000_harden_trial_redemption_and_workspace_grants.sql
-- Ras Ali Labs (Pty) Ltd
--
-- Security Priority:
-- 1. Revoke EXECUTE on redeem_trial_access_code() from authenticated & public.
--    This closes the privilege escalation vector preventing arbitrary authenticated
--    clients from calling the SECURITY DEFINER function with spoofed user/workspace IDs.
-- 2. Grant EXECUTE strictly to service_role (server-brokered execution only).
-- 3. Support direct administrative workspace grants without voucher codes:
--    - Make trial_code_redemptions.code_id nullable
--    - Add grant_type ('VOUCHER', 'ADMIN_DIRECT')
--    - Add granted_by_user_id (references auth.users)
--    - Add reason (mandatory justification for audit logging)
-- =====================================================================

-- 1. Security Hardening: Revoke public/authenticated execution on redeem_trial_access_code
REVOKE EXECUTE ON FUNCTION public.redeem_trial_access_code(TEXT, UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_trial_access_code FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_trial_access_code(TEXT, UUID, UUID, UUID, TEXT, TEXT) TO service_role;

-- 2. Schema Hardening for Direct Workspace Grants
-- Allow code_id to be NULL for direct platform admin grants
ALTER TABLE public.trial_code_redemptions ALTER COLUMN code_id DROP NOT NULL;

-- Add grant_type column with CHECK constraint
ALTER TABLE public.trial_code_redemptions
    ADD COLUMN IF NOT EXISTS grant_type TEXT NOT NULL DEFAULT 'VOUCHER'
    CHECK (grant_type IN ('VOUCHER', 'ADMIN_DIRECT'));

-- Add granted_by_user_id for administrative attribution
ALTER TABLE public.trial_code_redemptions
    ADD COLUMN IF NOT EXISTS granted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add administrative reason column
ALTER TABLE public.trial_code_redemptions
    ADD COLUMN IF NOT EXISTS reason TEXT;

-- Index for efficient workspace direct grant lookups
CREATE INDEX IF NOT EXISTS idx_trial_redemptions_grant_type
    ON public.trial_code_redemptions(workspace_id, grant_type, status);

-- Comment for regulatory and compliance audit
COMMENT ON TABLE public.trial_code_redemptions IS 'Tracks trial access code redemptions and direct platform admin demo grants.';
