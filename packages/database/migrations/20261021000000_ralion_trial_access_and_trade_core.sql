-- ============================================================================
-- RALION TRIAL ACCESS MANAGER & TRADE CORE SCHEMA MIGRATION
-- Migration Version: 20261021000000
-- Products: Ralion Trade OS & Reusable Demo Trial Access Entitlement Engine
-- ============================================================================

-- ============================================================================
-- 1. TRIAL ACCESS CODES & REDEMPTIONS ENGINE (2 NEW TABLES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trial_access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT NOT NULL UNIQUE,
    code_prefix TEXT NOT NULL, -- e.g. "RT-DEMO-8A2F" for safe admin display
    eligible_products TEXT[] NOT NULL DEFAULT '{"retail"}', -- ['retail'], ['trade'], or ['retail', 'trade']
    duration_days INT NOT NULL DEFAULT 14 CHECK (duration_days > 0),
    max_redemptions INT NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
    redemption_count INT NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
    workspace_mode TEXT NOT NULL DEFAULT 'DEMO_DATA' CHECK (workspace_mode IN ('DEMO_DATA', 'CLEAN_WORKSPACE')),
    restricted_email TEXT,
    restricted_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    restricted_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMPTZ, -- absolute deadline if set by admin
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_codes_hash ON public.trial_access_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_trial_codes_status ON public.trial_access_codes(status);

CREATE TABLE IF NOT EXISTS public.trial_code_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id UUID NOT NULL REFERENCES public.trial_access_codes(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'CONVERTED')),
    converted_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_trial_redemptions_ws ON public.trial_code_redemptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_trial_redemptions_user ON public.trial_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_redemptions_code ON public.trial_code_redemptions(code_id);

-- Admin Preview Sessions: Short-lived server-authorized preview sessions for platform administrators
CREATE TABLE IF NOT EXISTS public.admin_preview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash TEXT NOT NULL UNIQUE,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product TEXT NOT NULL CHECK (product IN ('retail', 'trade')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preview_sessions_token_hash ON public.admin_preview_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_preview_sessions_admin ON public.admin_preview_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_preview_sessions_ws ON public.admin_preview_sessions(workspace_id);

-- Add expires_at column to tenant_module_entitlements if not present
ALTER TABLE public.tenant_module_entitlements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Evolve tier check constraint to include TRIAL tier
ALTER TABLE public.tenant_module_entitlements DROP CONSTRAINT IF EXISTS tenant_module_entitlements_tier_check;
ALTER TABLE public.tenant_module_entitlements ADD CONSTRAINT tenant_module_entitlements_tier_check CHECK (tier IN ('PILOT', 'TRIAL', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'));

-- ============================================================================
-- 2. EVOLVE EXISTING TRADE TABLES & ADD NEW PROCUREMENT/QUOTATION TABLES
-- ============================================================================

-- Evolve existing trade_suppliers (add workspace_id, code, payment_terms, lead_time_days)
ALTER TABLE public.trade_suppliers ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.trade_suppliers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.trade_suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'NET30';
ALTER TABLE public.trade_suppliers ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 7;
CREATE INDEX IF NOT EXISTS idx_trade_suppliers_ws ON public.trade_suppliers(workspace_id);

-- Evolve existing trade_products (add workspace_id, cost_price, wholesale_price, minimum_order_quantity)
ALTER TABLE public.trade_products ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.trade_products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.trade_products ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.trade_products ADD COLUMN IF NOT EXISTS minimum_order_quantity INT DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_trade_products_ws ON public.trade_products(workspace_id);

-- Evolve existing trade_orders (add workspace_id, buyer_name, payment_status)
ALTER TABLE public.trade_orders ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.trade_orders ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.trade_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID';
CREATE INDEX IF NOT EXISTS idx_trade_orders_ws ON public.trade_orders(workspace_id);

-- 4 NEW TABLES: Procurement (Purchase Orders) & Wholesale Quotations
CREATE TABLE IF NOT EXISTS public.trade_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID REFERENCES public.trade_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_po_ws ON public.trade_purchase_orders(workspace_id);

CREATE TABLE IF NOT EXISTS public.trade_po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.trade_purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.trade_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(15, 2) NOT NULL CHECK (unit_cost >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_po_items_po ON public.trade_po_items(po_id);

CREATE TABLE IF NOT EXISTS public.trade_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_company TEXT,
    buyer_email TEXT,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'ACCEPTED', 'CONVERTED', 'REJECTED')),
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_quotes_ws ON public.trade_quotations(workspace_id);

CREATE TABLE IF NOT EXISTS public.trade_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.trade_quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.trade_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_quote_items_q ON public.trade_quote_items(quotation_id);

-- ============================================================================
-- 3. ATOMIC TRIAL CODE REDEMPTION STORED PROCEDURE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_trial_access_code(
    p_code_hash TEXT,
    p_user_id UUID,
    p_organization_id UUID,
    p_workspace_id UUID,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code RECORD;
    v_user_email TEXT;
    v_expires_at TIMESTAMPTZ;
    v_product TEXT;
    v_redemption_id UUID;
BEGIN
    -- 1. Validate caller workspace belongs to organization
    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %', p_workspace_id, p_organization_id;
    END IF;

    -- 2. Retrieve user email for restriction check
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

    -- 3. Acquire exclusive lock on trial access code
    SELECT * INTO v_code
    FROM public.trial_access_codes
    WHERE code_hash = p_code_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_CODE: Trial access code not found or invalid.';
    END IF;

    IF v_code.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'CODE_NOT_ACTIVE: This demo access code is % and cannot be redeemed.', v_code.status;
    END IF;

    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        UPDATE public.trial_access_codes SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_code.id;
        RAISE EXCEPTION 'CODE_EXPIRED: This demo access code has reached its expiration deadline.';
    END IF;

    IF v_code.redemption_count >= v_code.max_redemptions THEN
        RAISE EXCEPTION 'REDEMPTION_LIMIT_EXCEEDED: This demo access code has reached its maximum redemptions limit (%).', v_code.max_redemptions;
    END IF;

    -- 4. Enforce optional eligibility restrictions
    IF v_code.restricted_email IS NOT NULL AND LOWER(TRIM(v_code.restricted_email)) <> LOWER(TRIM(COALESCE(v_user_email, ''))) THEN
        RAISE EXCEPTION 'RESTRICTED_EMAIL_MISMATCH: This demo code is restricted to a specific recipient.';
    END IF;

    IF v_code.restricted_organization_id IS NOT NULL AND v_code.restricted_organization_id <> p_organization_id THEN
        RAISE EXCEPTION 'RESTRICTED_ORG_MISMATCH: This demo code is restricted to a different organization.';
    END IF;

    IF v_code.restricted_workspace_id IS NOT NULL AND v_code.restricted_workspace_id <> p_workspace_id THEN
        RAISE EXCEPTION 'RESTRICTED_WORKSPACE_MISMATCH: This demo code is restricted to a specific workspace.';
    END IF;

    -- 5. Calculate atomic expiration timestamp starting from this moment
    v_expires_at := NOW() + (v_code.duration_days || ' days')::INTERVAL;

    -- 6. Atomically increment redemption counter
    UPDATE public.trial_access_codes
    SET redemption_count = redemption_count + 1,
        updated_at = NOW()
    WHERE id = v_code.id;

    -- 7. Record immutable redemption audit entry
    INSERT INTO public.trial_code_redemptions (
        code_id, user_id, organization_id, workspace_id,
        redeemed_at, trial_starts_at, trial_expires_at, status, ip_address, user_agent
    ) VALUES (
        v_code.id, p_user_id, p_organization_id, p_workspace_id,
        NOW(), NOW(), v_expires_at, 'ACTIVE', p_ip, p_user_agent
    ) RETURNING id INTO v_redemption_id;

    -- 8. Provision entitlements for all eligible products atomically
    FOREACH v_product IN ARRAY v_code.eligible_products
    LOOP
        -- Safety Rule: Code redemption cannot overwrite an existing active paid entitlement (PILOT, STANDARD, PROFESSIONAL, ENTERPRISE)
        IF EXISTS (
            SELECT 1 FROM public.tenant_module_entitlements
            WHERE workspace_id = p_workspace_id
              AND module_key = v_product
              AND status = 'ACTIVE'
              AND tier IN ('PILOT', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE')
              AND (expires_at IS NULL OR expires_at > NOW())
        ) THEN
            RAISE EXCEPTION 'CANNOT_OVERWRITE_ACTIVE_PAID_ENTITLEMENT: Workspace % already has an active % entitlement for %.',
                p_workspace_id,
                (SELECT tier FROM public.tenant_module_entitlements WHERE workspace_id = p_workspace_id AND module_key = v_product),
                v_product;
        END IF;

        INSERT INTO public.tenant_module_entitlements (
            organization_id, workspace_id, module_key, status, tier, default_currency, expires_at, created_at, updated_at
        ) VALUES (
            p_organization_id, p_workspace_id, v_product, 'ACTIVE', 'TRIAL', 'USD', v_expires_at, NOW(), NOW()
        )
        ON CONFLICT (workspace_id, module_key) DO UPDATE SET
            status = 'ACTIVE',
            tier = 'TRIAL',
            expires_at = v_expires_at,
            updated_at = NOW();
    END LOOP;

    -- 9. Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'code_id', v_code.id,
        'eligible_products', v_code.eligible_products,
        'workspace_mode', v_code.workspace_mode,
        'duration_days', v_code.duration_days,
        'trial_expires_at', v_expires_at
    );
END;
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.trial_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_preview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_quote_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'trial_access_codes',
        'trial_code_redemptions',
        'admin_preview_sessions',
        'trade_purchase_orders',
        'trade_po_items',
        'trade_quotations',
        'trade_quote_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.redeem_trial_access_code FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_trial_access_code TO service_role, authenticated;
