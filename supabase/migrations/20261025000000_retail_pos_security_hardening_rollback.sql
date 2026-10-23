-- =====================================================================
-- Ralion Retail POS Security Hardening: Rollback Script
-- Migration: 20261025000000_retail_pos_security_hardening_rollback.sql
-- =====================================================================

-- 1. Drop 28-parameter execute_atomic_retail_sale
DROP FUNCTION IF EXISTS public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
);

-- 2. Restore execute_atomic_retail_sale to baseline (23 parameters without approval token)
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
    p_is_pilot_demo BOOLEAN DEFAULT false
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

    -- Check if negative stock is permitted
    SELECT enable_negative_stock INTO v_allow_negative
    FROM public.retail_settings
    WHERE workspace_id = p_workspace_id;
    IF v_allow_negative IS NULL THEN
        v_allow_negative := false;
    END IF;

    -- 2. Concurrency Safety: Lock each stock level row FOR UPDATE and verify inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_product_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := COALESCE(v_item->>'sku', '');

        IF v_quantity <= 0 OR v_quantity IS NULL THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be greater than zero for product % (SKU %)',
                v_product_name, v_sku;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.retail_products
            WHERE id = v_product_id AND workspace_id = p_workspace_id
        ) THEN
            RAISE EXCEPTION 'PRODUCT_NOT_IN_WORKSPACE: Product % does not belong to workspace %',
                v_product_id, p_workspace_id;
        END IF;

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

    -- 3. Create Sale Header Record
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
        p_total_cost, p_payment_method, p_payment_status, p_idempotency_key, p_notes,
        p_is_pilot_demo
    ) RETURNING id INTO v_sale_id;

    -- 4. Deduct stock, append movement audit records, and insert sale line items
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

        UPDATE public.retail_stock_levels
        SET quantity_on_hand = quantity_on_hand - v_quantity,
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        RETURNING quantity_on_hand INTO v_current_stock;

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

    -- 5. Record Payments
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

REVOKE EXECUTE ON FUNCTION public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT,
    NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN
) TO service_role, authenticated;

-- 3. Drop atomic lockout helper functions
DROP FUNCTION IF EXISTS public.record_pos_failed_attempt(TEXT, UUID, INT, INT);
DROP FUNCTION IF EXISTS public.reset_pos_lockout(TEXT);

-- 4. Drop security hardening tables
DROP TABLE IF EXISTS public.retail_pos_consumed_tokens CASCADE;
DROP TABLE IF EXISTS public.retail_pos_lockouts CASCADE;
