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
-- 4. Atomic direct workspace grant stored procedure with comprehensive safeguards:
--    - grant_workspace_trial_access(...)
--    - Single ACID transaction:
--      * Validates organization and workspace existence
--      * Row-level locking on workspace prevents concurrent grant race conditions
--      * Enforces cross-tenant assignment rejection
--      * Validates product module keys ('retail', 'trade')
--      * Validates currency ('USD', 'BWP', 'ZAR', 'EUR', 'GBP')
--      * Validates workspace mode ('CLEAN_WORKSPACE', 'DEMO_DATA')
--      * Safeguards Proinsight pilot workspace against demo data seeding
--      * Safeguards active customer business records (products & sales) against demo seeding
--      * Preserves active commercial paid (STANDARD, PROFESSIONAL, ENTERPRISE) & PILOT tiers
--      * Atomically upserts entitlements on (workspace_id, module_key)
--      * Records redemption history in trial_code_redemptions
--      * Records immutable audit log entry in audit_logs
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

-- 3. Atomic Direct Workspace Trial Grant Function
-- Provides atomic, all-or-nothing execution with strict safeguards
CREATE OR REPLACE FUNCTION public.grant_workspace_trial_access(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_eligible_products TEXT[],
    p_duration_days INTEGER DEFAULT 14,
    p_currency TEXT DEFAULT 'USD',
    p_workspace_mode TEXT DEFAULT 'CLEAN_WORKSPACE',
    p_reason TEXT DEFAULT 'Administrative direct demo grant',
    p_admin_user_id UUID DEFAULT NULL,
    p_admin_email TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product TEXT;
    v_expires_at TIMESTAMPTZ;
    v_redemption_id UUID;
    v_existing RECORD;
    v_clean_currency TEXT;
    v_clean_mode TEXT;
BEGIN
    -- 1. Validate mandatory parameters
    IF p_organization_id IS NULL OR p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Both organization_id and workspace_id are required.';
    END IF;

    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: A mandatory audit justification of at least 5 characters is required.';
    END IF;

    IF p_duration_days IS NULL OR p_duration_days <= 0 OR p_duration_days > 365 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Trial duration must be between 1 and 365 days.';
    END IF;

    -- Validate and normalize product module keys
    IF p_eligible_products IS NULL OR array_length(p_eligible_products, 1) = 0 THEN
        p_eligible_products := ARRAY['retail'];
    END IF;

    FOR v_product IN SELECT unnest(p_eligible_products)
    LOOP
        IF v_product NOT IN ('retail', 'trade') THEN
            RAISE EXCEPTION 'INVALID_ARGUMENT: Unsupported product module key ''%''. Allowed modules are ''retail'', ''trade''.', v_product;
        END IF;
    END LOOP;

    -- Validate and normalize currency
    v_clean_currency := UPPER(TRIM(COALESCE(p_currency, 'USD')));
    IF v_clean_currency NOT IN ('USD', 'BWP', 'ZAR', 'EUR', 'GBP') THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Unsupported currency ''%''. Allowed currencies are USD, BWP, ZAR, EUR, GBP.', p_currency;
    END IF;

    -- Validate and normalize workspace mode
    v_clean_mode := UPPER(TRIM(COALESCE(p_workspace_mode, 'CLEAN_WORKSPACE')));
    IF v_clean_mode NOT IN ('CLEAN_WORKSPACE', 'DEMO_DATA') THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Unsupported workspace mode ''%''. Allowed modes are ''CLEAN_WORKSPACE'', ''DEMO_DATA''.', p_workspace_mode;
    END IF;

    -- 2. Validate tenant-workspace relationship (strictly reject cross-tenant assignments)
    IF NOT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Target organization % does not exist.', p_organization_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = p_workspace_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Target workspace % does not exist.', p_workspace_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REJECTED: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

    -- Acquire row-level lock on workspace to serialize concurrent direct grants
    PERFORM 1 FROM public.workspaces WHERE id = p_workspace_id FOR UPDATE;

    -- 3. Live Business Record & Pilot Workspace Safeguards for DEMO_DATA mode
    IF v_clean_mode = 'DEMO_DATA' THEN
        -- Strictly guard Proinsight live pilot workspace against demo seeding
        IF p_workspace_id = '67074e47-76bb-40e1-ae05-362e9cae8798'::UUID THEN
            RAISE EXCEPTION 'SAFEGUARD_BLOCKED: Demo data seeding strictly denied for Proinsight live pilot workspace.';
        END IF;

        -- Check if workspace contains live non-demo retail products
        IF EXISTS (
            SELECT 1 FROM public.retail_products
            WHERE workspace_id = p_workspace_id
              AND (is_pilot_demo IS FALSE OR is_pilot_demo IS NULL)
        ) THEN
            RAISE EXCEPTION 'SAFEGUARD_BLOCKED: Destination workspace contains live customer products. Seeding demo data into an active business workspace is prohibited.';
        END IF;

        -- Check if workspace contains live sales records
        IF EXISTS (
            SELECT 1 FROM public.retail_sales
            WHERE workspace_id = p_workspace_id
        ) THEN
            RAISE EXCEPTION 'SAFEGUARD_BLOCKED: Destination workspace contains live sales records. Seeding demo data into an active business workspace is prohibited.';
        END IF;
    END IF;

    -- 4. Preserve existing commercial paid and PILOT entitlements
    FOR v_product IN SELECT unnest(p_eligible_products)
    LOOP
        SELECT * INTO v_existing
        FROM public.tenant_module_entitlements
        WHERE workspace_id = p_workspace_id
          AND module_key = v_product;

        IF FOUND AND v_existing.status = 'ACTIVE' AND v_existing.tier IN ('PILOT', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE') THEN
            IF v_existing.expires_at IS NULL OR v_existing.expires_at > NOW() THEN
                RAISE EXCEPTION 'SAFEGUARD_BLOCKED: Workspace already possesses an active % commercial entitlement for module %. Active paid/pilot subscriptions cannot be downgraded or overwritten with a demo trial.',
                    v_existing.tier, v_product;
            END IF;
        END IF;
    END LOOP;

    -- 5. Calculate expiration timestamp
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;

    -- 6. Insert grant record into trial_code_redemptions atomically
    INSERT INTO public.trial_code_redemptions (
        code_id,
        user_id,
        organization_id,
        workspace_id,
        status,
        trial_starts_at,
        trial_expires_at,
        grant_type,
        granted_by_user_id,
        reason,
        redeemed_at
    ) VALUES (
        NULL,
        COALESCE(p_admin_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        p_organization_id,
        p_workspace_id,
        'ACTIVE',
        NOW(),
        v_expires_at,
        'ADMIN_DIRECT',
        p_admin_user_id,
        TRIM(p_reason),
        NOW()
    ) RETURNING id INTO v_redemption_id;

    -- 7. Upsert entitlements for each eligible product using correct unique constraint (workspace_id, module_key)
    FOR v_product IN SELECT unnest(p_eligible_products)
    LOOP
        INSERT INTO public.tenant_module_entitlements (
            organization_id,
            workspace_id,
            module_key,
            tier,
            status,
            expires_at,
            default_currency,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            p_workspace_id,
            v_product,
            'TRIAL',
            'ACTIVE',
            v_expires_at,
            v_clean_currency,
            NOW(),
            NOW()
        )
        ON CONFLICT (workspace_id, module_key) DO UPDATE SET
            tier = 'TRIAL',
            status = 'ACTIVE',
            expires_at = EXCLUDED.expires_at,
            default_currency = EXCLUDED.default_currency,
            updated_at = NOW();
    END LOOP;

    -- 8. Record immutable audit log entry
    INSERT INTO public.audit_logs (
        organization_id,
        user_id,
        action,
        module,
        metadata
    ) VALUES (
        p_organization_id,
        p_admin_user_id,
        'WORKSPACE_TRIAL_GRANTED',
        'TRIAL_ACCESS_MANAGER',
        jsonb_build_object(
            'workspaceId', p_workspace_id,
            'organizationId', p_organization_id,
            'eligibleProducts', p_eligible_products,
            'durationDays', p_duration_days,
            'currency', v_clean_currency,
            'workspaceMode', v_clean_mode,
            'reason', TRIM(p_reason),
            'notes', p_notes,
            'adminEmail', p_admin_email,
            'trialExpiresAt', v_expires_at,
            'redemptionId', v_redemption_id,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Demo access granted successfully to workspace for %s days (%s).', p_duration_days, v_clean_currency),
        'workspaceId', p_workspace_id,
        'organizationId', p_organization_id,
        'eligibleProducts', p_eligible_products,
        'durationDays', p_duration_days,
        'currency', v_clean_currency,
        'workspaceMode', v_clean_mode,
        'expiresAt', v_expires_at,
        'redemptionId', v_redemption_id
    );
END;
$$;

-- 4. Security: Restrict direct grant function execution strictly to service_role
REVOKE EXECUTE ON FUNCTION public.grant_workspace_trial_access FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_workspace_trial_access TO service_role;
