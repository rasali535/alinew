-- =====================================================================
-- Ralion Retail POS Security Hardening: Durable Nonce Consumption, Atomic Lockout & Single Transaction Approval
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

-- 3. Atomic Multi-Instance Safe Lockout Increment Function
CREATE OR REPLACE FUNCTION public.record_pos_failed_attempt(
    p_lockout_key TEXT,
    p_workspace_id UUID,
    p_max_attempts INT DEFAULT 5,
    p_lockout_minutes INT DEFAULT 15
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempts INT;
    v_locked_until TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_is_locked BOOLEAN;
BEGIN
    INSERT INTO public.retail_pos_lockouts (
        lockout_key, workspace_id, failed_attempts, last_failed_at, locked_until
    ) VALUES (
        p_lockout_key, p_workspace_id, 1, v_now, NULL
    )
    ON CONFLICT (lockout_key) DO UPDATE
    SET 
        failed_attempts = CASE
            WHEN retail_pos_lockouts.locked_until IS NOT NULL AND retail_pos_lockouts.locked_until <= v_now THEN 1
            ELSE retail_pos_lockouts.failed_attempts + 1
        END,
        last_failed_at = v_now,
        locked_until = CASE
            WHEN (CASE
                    WHEN retail_pos_lockouts.locked_until IS NOT NULL AND retail_pos_lockouts.locked_until <= v_now THEN 1
                    ELSE retail_pos_lockouts.failed_attempts + 1
                  END) >= p_max_attempts THEN v_now + (p_lockout_minutes || ' minutes')::INTERVAL
            ELSE NULL
        END
    RETURNING failed_attempts, locked_until INTO v_attempts, v_locked_until;

    v_is_locked := (v_attempts >= p_max_attempts) AND (v_locked_until > v_now);

    RETURN jsonb_build_object(
        'locked', v_is_locked,
        'failed_attempts', v_attempts,
        'locked_until', v_locked_until,
        'retry_after_seconds', CASE WHEN v_is_locked THEN CEIL(EXTRACT(EPOCH FROM (v_locked_until - v_now))) ELSE 0 END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_pos_lockout(
    p_lockout_key TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.retail_pos_lockouts WHERE lockout_key = p_lockout_key;
END;
$$;

-- Revoke execution from PUBLIC, anon, and authenticated; restrict strictly to service_role
REVOKE EXECUTE ON FUNCTION public.record_pos_failed_attempt(TEXT, UUID, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_pos_failed_attempt(TEXT, UUID, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reset_pos_lockout(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pos_lockout(TEXT) TO service_role;

-- 4. Drop legacy 23-parameter execute_atomic_retail_sale to prevent overloading ambiguity
DROP FUNCTION IF EXISTS public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN
);

-- 5. Atomic POS Checkout & Manager Approval Nonce Claim in the SAME Transaction
CREATE OR REPLACE FUNCTION public.execute_atomic_retail_sale(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_sale_number TEXT,
    p_invoice_number TEXT,
    p_source TEXT,
    p_customer_id TEXT,
    p_customer_name TEXT,
    p_cashier_user_id UUID,
    p_cashier_name TEXT,
    p_shift_id UUID,
    p_currency TEXT,
    p_subtotal NUMERIC,
    p_tax_total NUMERIC,
    p_discount_total NUMERIC,
    p_total_amount NUMERIC,
    p_total_cost NUMERIC,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_idempotency_key TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_payments JSONB,
    p_is_pilot_demo BOOLEAN DEFAULT false,
    p_approval_token_id UUID DEFAULT NULL,
    p_approval_action TEXT DEFAULT NULL,
    p_approval_action_payload_hash TEXT DEFAULT NULL,
    p_approval_terminal_id TEXT DEFAULT NULL,
    p_approval_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_existing_sale_id UUID;
    v_item JSONB;
    v_payment JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_unit_price NUMERIC;
    v_unit_cost NUMERIC;
    v_tax_rate NUMERIC;
    v_discount_rate NUMERIC;
    v_line_total NUMERIC;
    v_line_cost NUMERIC;
    v_product_name TEXT;
    v_sku TEXT;
    v_stock_id UUID;
    v_current_stock NUMERIC;
    v_allow_negative BOOLEAN := false;
    v_final_payment_status TEXT := p_payment_status;
BEGIN
    -- 0. Security & Entitlement Gating: Enforce active tenant module entitlement
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id
          AND workspace_id = p_workspace_id
          AND module_key = 'retail'
          AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    -- Verify workspace belongs to organization
    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = p_workspace_id
          AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

    -- 1. Idempotency Check: Return existing sale without re-executing
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_sale_id
        FROM public.retail_sales
        WHERE workspace_id = p_workspace_id AND idempotency_key = p_idempotency_key;

        IF v_existing_sale_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'sale_id', v_existing_sale_id,
                'idempotent_replay', true
            );
        END IF;
    END IF;

    -- 2. Nonce Check (Pre-flight within the same transaction): Reject already-consumed or expired tokens
    IF p_approval_token_id IS NOT NULL THEN
        IF p_approval_expires_at IS NOT NULL AND p_approval_expires_at < NOW() THEN
            RAISE EXCEPTION 'APPROVAL_TOKEN_EXPIRED: Manager approval token has expired.';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.retail_pos_consumed_tokens
            WHERE token_id = p_approval_token_id
        ) THEN
            RAISE EXCEPTION 'TOKEN_ALREADY_CONSUMED: Manager approval token % has already been consumed.', p_approval_token_id;
        END IF;
    END IF;

    -- 3. Enforce Verifiable Settlement: Unverified external tender cannot be marked PAID
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        IF (v_payment->>'payment_method') IN ('CARD_EXTERNAL', 'BANK_TRANSFER') AND v_final_payment_status = 'PAID' THEN
            v_final_payment_status := 'PARTIAL';
        END IF;
    END LOOP;

    -- Check if negative stock is permitted
    SELECT enable_negative_stock INTO v_allow_negative
    FROM public.retail_settings
    WHERE workspace_id = p_workspace_id;
    IF v_allow_negative IS NULL THEN
        v_allow_negative := false;
    END IF;

    -- 4. Concurrency Safety: Lock each stock level row FOR UPDATE and verify inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_product_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := COALESCE(v_item->>'sku', '');

        -- Server-Side Invariant: Validate positive quantity
        IF v_quantity <= 0 OR v_quantity IS NULL THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be greater than zero for product % (SKU %)',
                v_product_name, v_sku;
        END IF;

        -- Server-Side Invariant: Validate product belongs to this workspace
        IF NOT EXISTS (
            SELECT 1 FROM public.retail_products
            WHERE id = v_product_id AND workspace_id = p_workspace_id
        ) THEN
            RAISE EXCEPTION 'PRODUCT_NOT_IN_WORKSPACE: Product % does not belong to workspace %',
                v_product_id, p_workspace_id;
        END IF;

        -- Acquire exclusive row-level lock on stock level for this product in this workspace
        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO public.retail_stock_levels (
                organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved
            ) VALUES (
                p_organization_id, p_workspace_id, v_product_id, 0, 0
            ) RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
        END IF;

        IF v_current_stock < v_quantity AND NOT v_allow_negative THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % (SKU %) requested %, available %',
                v_product_name, v_sku, v_quantity, v_current_stock;
        END IF;
    END LOOP;

    -- 5. Create Sale Header Record
    INSERT INTO public.retail_sales (
        organization_id, workspace_id, sale_number, invoice_number, source,
        customer_id, customer_name, cashier_user_id, cashier_name, shift_id,
        status, currency, subtotal, tax_total, discount_total, total_amount,
        total_cost, payment_method, payment_status, idempotency_key, notes,
        is_pilot_demo
    ) VALUES (
        p_organization_id, p_workspace_id, p_sale_number, p_invoice_number, p_source,
        p_customer_id, p_customer_name, p_cashier_user_id, p_cashier_name, p_shift_id,
        'COMPLETED', p_currency, p_subtotal, p_tax_total, p_discount_total, p_total_amount,
        p_total_cost, p_payment_method, v_final_payment_status, p_idempotency_key, p_notes,
        p_is_pilot_demo
    ) RETURNING id INTO v_sale_id;

    -- 6. Claim and Consume Approval Token Nonce in the SAME Transaction
    IF p_approval_token_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.retail_pos_consumed_tokens (
                token_id, workspace_id, organization_id, cashier_user_id,
                action, action_payload_hash, terminal_id, sale_id, expires_at
            ) VALUES (
                p_approval_token_id, p_workspace_id, p_organization_id, p_cashier_user_id,
                p_approval_action, p_approval_action_payload_hash, p_approval_terminal_id, v_sale_id,
                COALESCE(p_approval_expires_at, NOW() + INTERVAL '10 minutes')
            );
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION 'TOKEN_ALREADY_CONSUMED: Manager approval token % was consumed concurrently in another transaction.', p_approval_token_id;
        END;
    END IF;

    -- 7. Deduct stock, append movement audit records, and insert sale line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_unit_cost := (v_item->>'unit_cost')::NUMERIC;
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);
        v_discount_rate := COALESCE((v_item->>'discount_rate')::NUMERIC, 0);
        v_line_total := (v_item->>'line_total')::NUMERIC;
        v_line_cost := (v_item->>'line_cost')::NUMERIC;
        v_product_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := COALESCE(v_item->>'sku', '');

        -- Deduct stock
        UPDATE public.retail_stock_levels
        SET quantity_on_hand = quantity_on_hand - v_quantity,
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        RETURNING quantity_on_hand INTO v_current_stock;

        -- Record immutable stock movement
        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, 'SALE',
            -v_quantity, v_current_stock, v_unit_cost, 'SALE_RECEIPT',
            p_sale_number, 'Sale ' || p_sale_number || ' to ' || p_customer_name,
            p_cashier_user_id
        );

        -- Insert line item
        INSERT INTO public.retail_sale_items (
            sale_id, product_id, product_name, sku, quantity,
            unit_price, unit_cost, tax_rate, discount_rate,
            line_total, line_cost
        ) VALUES (
            v_sale_id, v_product_id, v_product_name, v_sku, v_quantity,
            v_unit_price, v_unit_cost, v_tax_rate, v_discount_rate,
            v_line_total, v_line_cost
        );
    END LOOP;

    -- 8. Record Payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.retail_sale_payments (
            sale_id, payment_method, amount, reference
        ) VALUES (
            v_sale_id,
            v_payment->>'payment_method',
            (v_payment->>'amount')::NUMERIC,
            v_payment->>'reference'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'sale_number', p_sale_number
    );
END;
$$;

-- Revoke execution from PUBLIC, anon, and authenticated on execute_atomic_retail_sale; restrict strictly to service_role
REVOKE EXECUTE ON FUNCTION public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

-- Revoke execution from PUBLIC, anon, and authenticated on all other privileged retail engine RPCs
REVOKE EXECUTE ON FUNCTION public.execute_atomic_goods_receipt(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_goods_receipt(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion(UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion(UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_sale_refund(UUID, UUID, UUID, TEXT, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_sale_refund(UUID, UUID, UUID, TEXT, BOOLEAN, UUID) TO service_role;
