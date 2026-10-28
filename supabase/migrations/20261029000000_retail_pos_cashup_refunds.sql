-- =====================================================================
-- Migration: 20261029000000_retail_pos_cashup_refunds.sql
-- Module: Ralion Retail POS Ecosystem Hardening
-- Description:
--   1. Immutable Cashier Cash-Up Reports (retail_cashier_cashup_reports)
--   2. Floor Manager Product Returns & Refunds (retail_returns, retail_return_items)
--   3. Auditable Transaction Voids (retail_voided_sales)
--   4. Atomic Stored Procedures:
--      - execute_atomic_sale_return_and_refund
--      - execute_atomic_void_sale
--      - execute_atomic_close_shift_cashup
--   5. Service-role-only execution lockdown & privilege enforcement
-- =====================================================================

-- 0. STATUS AND PAYMENT STATUS CONSTRAINT EXPANSION FOR RETURNS AND VOIDS
ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_status_check;
ALTER TABLE public.retail_sales ADD CONSTRAINT retail_sales_status_check
    CHECK (status IN ('COMPLETED', 'PARTIALLY_PAID', 'PENDING', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED'));

ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_payment_status_check;
ALTER TABLE public.retail_sales ADD CONSTRAINT retail_sales_payment_status_check
    CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED', 'VOIDED'));

-- 1. IMMUTABLE CASHIER CASH-UP REPORTS
CREATE TABLE IF NOT EXISTS public.retail_cashier_cashup_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.retail_cashier_shifts(id) ON DELETE CASCADE,
    cashier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cashier_name TEXT NOT NULL,
    terminal_id TEXT DEFAULT 'DEFAULT_POS_TERMINAL',
    started_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    opening_float NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sales_count INTEGER NOT NULL DEFAULT 0,
    gross_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    card_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transfer_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_refunds NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    noncash_refunds NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund_count INTEGER NOT NULL DEFAULT 0,
    returns_count INTEGER NOT NULL DEFAULT 0,
    void_count INTEGER NOT NULL DEFAULT 0,
    void_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_in NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_out NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_cash_actual NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    variance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    closed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manager_approval_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_cashup_shift UNIQUE (workspace_id, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_cashup_workspace ON public.retail_cashier_cashup_reports(workspace_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_cashup_cashier ON public.retail_cashier_cashup_reports(workspace_id, cashier_user_id);

REVOKE ALL ON public.retail_cashier_cashup_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.retail_cashier_cashup_reports TO service_role;

-- 2. FLOOR MANAGER PRODUCT RETURNS & REFUNDS
CREATE TABLE IF NOT EXISTS public.retail_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    return_number TEXT NOT NULL,
    sale_id UUID NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    cashier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cashier_name TEXT NOT NULL,
    approved_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by_name TEXT NOT NULL,
    shift_id UUID REFERENCES public.retail_cashier_shifts(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    total_refund_amount NUMERIC(12, 2) NOT NULL,
    refund_payment_method TEXT NOT NULL DEFAULT 'CASH',
    refund_reference TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_retail_return_number UNIQUE (workspace_id, return_number)
);

CREATE INDEX IF NOT EXISTS idx_retail_returns_sale ON public.retail_returns(workspace_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_retail_returns_shift ON public.retail_returns(workspace_id, shift_id);

REVOKE ALL ON public.retail_returns FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.retail_returns TO service_role;

CREATE TABLE IF NOT EXISTS public.retail_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.retail_returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES public.retail_sale_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE SET NULL,
    pack_label TEXT,
    pack_size NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    quantity_returned NUMERIC(10, 2) NOT NULL,
    base_quantity_returned NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    refund_line_total NUMERIC(12, 2) NOT NULL,
    condition TEXT NOT NULL DEFAULT 'SELLABLE' CHECK (condition IN ('SELLABLE', 'DAMAGED', 'DEFECTIVE')),
    restocked BOOLEAN NOT NULL DEFAULT true,
    inspection_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_return_items_return ON public.retail_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_retail_return_items_sale_item ON public.retail_return_items(sale_item_id);

REVOKE ALL ON public.retail_return_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.retail_return_items TO service_role;

-- 3. AUDITABLE TRANSACTION VOIDS
CREATE TABLE IF NOT EXISTS public.retail_voided_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    sale_number TEXT NOT NULL,
    cashier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cashier_name TEXT NOT NULL,
    approved_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_by_name TEXT NOT NULL,
    shift_id UUID REFERENCES public.retail_cashier_shifts(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    voided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_retail_voided_sale UNIQUE (workspace_id, sale_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_voids_workspace ON public.retail_voided_sales(workspace_id, voided_at DESC);

REVOKE ALL ON public.retail_voided_sales FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.retail_voided_sales TO service_role;

-- 4. ATOMIC STORED PROCEDURE: EXECUTE SALE RETURN AND REFUND
CREATE OR REPLACE FUNCTION public.execute_atomic_sale_return_and_refund(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_sale_id UUID,
    p_return_number TEXT,
    p_cashier_user_id UUID,
    p_cashier_name TEXT,
    p_approved_by_user_id UUID,
    p_approved_by_name TEXT,
    p_shift_id UUID,
    p_reason TEXT,
    p_refund_payment_method TEXT,
    p_refund_reference TEXT,
    p_return_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item JSONB;
    v_sale_item RECORD;
    v_return_id UUID;
    v_total_refund NUMERIC(12, 2) := 0.00;
    v_prior_returned NUMERIC(10, 2);
    v_req_qty NUMERIC(10, 2);
    v_base_qty NUMERIC(10, 2);
    v_pack_size NUMERIC(10, 2);
    v_line_refund NUMERIC(12, 2);
    v_is_sellable BOOLEAN;
    v_condition TEXT;
    v_stock_id UUID;
    v_current_stock NUMERIC(12, 2);
    v_items_count INTEGER := 0;
    v_remaining_unrefunded_items INTEGER;
BEGIN
    -- Tenant & Entitlement verification
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    -- Lock sale row
    SELECT id, sale_number, customer_name, status, total_amount, currency
    INTO v_sale
    FROM public.retail_sales
    WHERE id = p_sale_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_sale.id IS NULL THEN
        RAISE EXCEPTION 'SALE_NOT_FOUND: Sale % does not exist in workspace.', p_sale_id;
    END IF;

    IF v_sale.status = 'VOIDED' THEN
        RAISE EXCEPTION 'SALE_ALREADY_VOIDED: Cannot return items from a voided sale.';
    END IF;

    -- Create Return record header
    INSERT INTO public.retail_returns (
        organization_id, workspace_id, return_number, sale_id, receipt_number,
        customer_name, cashier_user_id, cashier_name, approved_by_user_id, approved_by_name,
        shift_id, reason, total_refund_amount, refund_payment_method, refund_reference, status
    ) VALUES (
        p_organization_id, p_workspace_id, p_return_number, p_sale_id, v_sale.sale_number,
        v_sale.customer_name, p_cashier_user_id, p_cashier_name, p_approved_by_user_id, p_approved_by_name,
        p_shift_id, p_reason, 0.00, p_refund_payment_method, p_refund_reference, 'COMPLETED'
    ) RETURNING id INTO v_return_id;

    -- Process each return line
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
        v_req_qty := (v_item->>'quantity_returned')::NUMERIC;
        v_condition := COALESCE(v_item->>'condition', 'SELLABLE');
        v_is_sellable := (v_condition = 'SELLABLE');

        IF v_req_qty IS NULL OR v_req_qty <= 0 THEN
            RAISE EXCEPTION 'INVALID_RETURN_QUANTITY: Returned quantity must be greater than zero.';
        END IF;

        -- Lock sale item
        SELECT id, product_id, product_name, sku, package_id, pack_label, pack_size,
               quantity, unit_price, tax_rate, discount_rate, line_total, line_cost, base_quantity
        INTO v_sale_item
        FROM public.retail_sale_items
        WHERE id = (v_item->>'sale_item_id')::UUID AND sale_id = p_sale_id
        FOR UPDATE;

        IF v_sale_item.id IS NULL THEN
            RAISE EXCEPTION 'SALE_ITEM_NOT_FOUND: Sale item % does not belong to sale %.', (v_item->>'sale_item_id'), p_sale_id;
        END IF;

        -- Sum prior returns for this sale item
        SELECT COALESCE(SUM(quantity_returned), 0) INTO v_prior_returned
        FROM public.retail_return_items
        WHERE sale_item_id = v_sale_item.id;

        IF (v_prior_returned + v_req_qty) > v_sale_item.quantity THEN
            RAISE EXCEPTION 'RETURN_QUANTITY_EXCEEDED: Product % (SKU %) sold quantity is %, previously returned %, requested %. Maximum returnable is %.',
                v_sale_item.product_name, v_sale_item.sku, v_sale_item.quantity, v_prior_returned, v_req_qty, (v_sale_item.quantity - v_prior_returned);
        END IF;

        v_pack_size := COALESCE(v_sale_item.pack_size, 1.00);
        v_base_qty := v_req_qty * v_pack_size;

        -- Calculate prorated refund amount for this line
        v_line_refund := ROUND((v_sale_item.line_total / v_sale_item.quantity) * v_req_qty, 2);
        v_total_refund := v_total_refund + v_line_refund;
        v_items_count := v_items_count + 1;

        -- Insert return item record
        INSERT INTO public.retail_return_items (
            return_id, sale_item_id, product_id, product_name, sku,
            package_id, pack_label, pack_size, quantity_returned, base_quantity_returned,
            unit_price, tax_rate, discount_rate, refund_line_total, condition,
            restocked, inspection_notes
        ) VALUES (
            v_return_id, v_sale_item.id, v_sale_item.product_id, v_sale_item.product_name, v_sale_item.sku,
            v_sale_item.package_id, v_sale_item.pack_label, v_pack_size, v_req_qty, v_base_qty,
            v_sale_item.unit_price, v_sale_item.tax_rate, v_sale_item.discount_rate, v_line_refund, v_condition,
            v_is_sellable, v_item->>'inspection_notes'
        );

        -- Stock Disposition: Sellable goods re-enter stock; damaged goods are quarantined
        IF v_is_sellable THEN
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_base_qty, updated_at = NOW()
            WHERE workspace_id = p_workspace_id AND product_id = v_sale_item.product_id
            RETURNING quantity_on_hand INTO v_current_stock;

            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, movement_type,
                quantity_change, balance_after, unit_cost, reference_type,
                reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_sale_item.product_id, 'SALE_REFUND',
                v_base_qty, v_current_stock, ROUND(v_sale_item.line_cost / GREATEST(1, v_sale_item.quantity * v_pack_size), 2),
                'SALE_RECEIPT', p_return_number,
                'Restocked return for ' || v_sale.sale_number || ': ' || p_reason || ' (Inspection: SELLABLE)',
                p_cashier_user_id
            );
        ELSE
            -- Damaged goods do NOT increase quantity_on_hand; record audit entry of quarantined return
            SELECT quantity_on_hand INTO v_current_stock
            FROM public.retail_stock_levels
            WHERE workspace_id = p_workspace_id AND product_id = v_sale_item.product_id;

            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, movement_type,
                quantity_change, balance_after, unit_cost, reference_type,
                reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_sale_item.product_id, 'DAMAGE_WRITE_OFF',
                0, v_current_stock, ROUND(v_sale_item.line_cost / GREATEST(1, v_sale_item.quantity * v_pack_size), 2),
                'SALE_RECEIPT', p_return_number,
                'Damaged returned goods quarantined for ' || v_sale.sale_number || ': ' || p_reason || ' (' || v_condition || ')',
                p_cashier_user_id
            );
        END IF;
    END LOOP;

    -- Update total refund amount on return header
    UPDATE public.retail_returns
    SET total_refund_amount = v_total_refund
    WHERE id = v_return_id;

    -- Check if sale is fully refunded or partially refunded
    SELECT COUNT(*) INTO v_remaining_unrefunded_items
    FROM public.retail_sale_items si
    WHERE si.sale_id = p_sale_id
      AND si.quantity > (
          SELECT COALESCE(SUM(ri.quantity_returned), 0)
          FROM public.retail_return_items ri
          WHERE ri.sale_item_id = si.id
      );

    IF v_remaining_unrefunded_items = 0 THEN
        UPDATE public.retail_sales
        SET status = 'REFUNDED', payment_status = 'REFUNDED',
            notes = COALESCE(notes || ' | ', '') || 'Fully refunded via ' || p_return_number,
            updated_at = NOW()
        WHERE id = p_sale_id;
    ELSE
        UPDATE public.retail_sales
        SET status = 'PARTIALLY_REFUNDED', payment_status = 'PARTIAL',
            notes = COALESCE(notes || ' | ', '') || 'Partial refund (' || v_total_refund || ') via ' || p_return_number,
            updated_at = NOW()
        WHERE id = p_sale_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', p_return_number,
        'sale_id', p_sale_id,
        'receipt_number', v_sale.sale_number,
        'total_refund_amount', v_total_refund,
        'refund_payment_method', p_refund_payment_method,
        'status', CASE WHEN v_remaining_unrefunded_items = 0 THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_sale_return_and_refund FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_sale_return_and_refund TO service_role;

-- 5. ATOMIC STORED PROCEDURE: EXECUTE VOID SALE
CREATE OR REPLACE FUNCTION public.execute_atomic_void_sale(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_sale_id UUID,
    p_cashier_user_id UUID,
    p_cashier_name TEXT,
    p_approved_by_user_id UUID,
    p_approved_by_name TEXT,
    p_shift_id UUID,
    p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
    v_current_stock NUMERIC(12, 2);
    v_base_qty NUMERIC(10, 2);
    v_void_id UUID;
BEGIN
    -- Verify Entitlement
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    -- Lock sale row
    SELECT id, sale_number, customer_name, status, total_amount, currency
    INTO v_sale
    FROM public.retail_sales
    WHERE id = p_sale_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_sale.id IS NULL THEN
        RAISE EXCEPTION 'SALE_NOT_FOUND: Sale % does not exist in workspace.', p_sale_id;
    END IF;

    IF v_sale.status = 'VOIDED' THEN
        RAISE EXCEPTION 'SALE_ALREADY_VOIDED: Sale % is already voided.', v_sale.sale_number;
    END IF;

    -- Check if sale has returns
    IF EXISTS (SELECT 1 FROM public.retail_returns WHERE sale_id = p_sale_id) THEN
        RAISE EXCEPTION 'CANNOT_VOID_RETURNED_SALE: Sale % has active product returns/refunds and cannot be voided.', v_sale.sale_number;
    END IF;

    -- Restock all sold items
    FOR v_item IN
        SELECT product_id, product_name, sku, COALESCE(base_quantity, quantity) AS base_qty,
               unit_cost, COALESCE(pack_size, 1.00) AS pack_size
        FROM public.retail_sale_items
        WHERE sale_id = p_sale_id
        ORDER BY product_id
    LOOP
        v_base_qty := v_item.base_qty;

        UPDATE public.retail_stock_levels
        SET quantity_on_hand = quantity_on_hand + v_base_qty, updated_at = NOW()
        WHERE workspace_id = p_workspace_id AND product_id = v_item.product_id
        RETURNING quantity_on_hand INTO v_current_stock;

        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_item.product_id, 'SALE_REFUND',
            v_base_qty, v_current_stock, ROUND(v_item.unit_cost / v_item.pack_size, 2),
            'SALE_RECEIPT', v_sale.sale_number,
            'Void transaction for ' || v_sale.sale_number || ': ' || p_reason || ' (Authorized by ' || p_approved_by_name || ')',
            p_cashier_user_id
        );
    END LOOP;

    -- Record void transaction
    INSERT INTO public.retail_voided_sales (
        organization_id, workspace_id, sale_id, sale_number, cashier_user_id,
        cashier_name, approved_by_user_id, approved_by_name, shift_id, reason, amount
    ) VALUES (
        p_organization_id, p_workspace_id, p_sale_id, v_sale.sale_number, p_cashier_user_id,
        p_cashier_name, p_approved_by_user_id, p_approved_by_name, p_shift_id, p_reason, v_sale.total_amount
    ) RETURNING id INTO v_void_id;

    -- Update sale status to VOIDED
    UPDATE public.retail_sales
    SET status = 'VOIDED', payment_status = 'VOIDED',
        notes = COALESCE(notes || ' | ', '') || 'Voided: ' || p_reason || ' (Approved by ' || p_approved_by_name || ')',
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'void_id', v_void_id,
        'sale_id', p_sale_id,
        'sale_number', v_sale.sale_number,
        'amount', v_sale.total_amount
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_void_sale FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_void_sale TO service_role;

-- 6. ATOMIC STORED PROCEDURE: EXECUTE CLOSE SHIFT CASH-UP
CREATE OR REPLACE FUNCTION public.execute_atomic_close_shift_cashup(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_shift_id UUID,
    p_closed_by_user_id UUID,
    p_closing_cash_actual NUMERIC,
    p_manager_approval_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift RECORD;
    v_report_id UUID;
    v_sales_count INTEGER := 0;
    v_gross_sales NUMERIC(12, 2) := 0.00;
    v_discount_total NUMERIC(12, 2) := 0.00;
    v_tax_total NUMERIC(12, 2) := 0.00;
    v_net_sales NUMERIC(12, 2) := 0.00;
    v_cash_sales NUMERIC(12, 2) := 0.00;
    v_card_sales NUMERIC(12, 2) := 0.00;
    v_transfer_sales NUMERIC(12, 2) := 0.00;
    v_other_sales NUMERIC(12, 2) := 0.00;
    v_cash_refunds NUMERIC(12, 2) := 0.00;
    v_noncash_refunds NUMERIC(12, 2) := 0.00;
    v_refund_count INTEGER := 0;
    v_returns_count INTEGER := 0;
    v_void_count INTEGER := 0;
    v_void_total NUMERIC(12, 2) := 0.00;
    v_expected_cash NUMERIC(12, 2) := 0.00;
    v_variance NUMERIC(12, 2) := 0.00;
    v_closed_at TIMESTAMPTZ := NOW();
    v_terminal_id TEXT := 'DEFAULT_POS_TERMINAL';
BEGIN
    -- Verify Entitlement
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    -- Lock shift row
    SELECT id, organization_id, workspace_id, cashier_user_id, cashier_name,
           started_at, closed_at, opening_cash, status
    INTO v_shift
    FROM public.retail_cashier_shifts
    WHERE id = p_shift_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_shift.id IS NULL THEN
        RAISE EXCEPTION 'SHIFT_NOT_FOUND: Shift % does not exist in workspace.', p_shift_id;
    END IF;

    -- Idempotency check: if shift is already closed and cash-up report exists, return existing report
    IF v_shift.status = 'CLOSED' THEN
        SELECT id INTO v_report_id
        FROM public.retail_cashier_cashup_reports
        WHERE shift_id = p_shift_id AND workspace_id = p_workspace_id;

        IF v_report_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_closed', true,
                'report_id', v_report_id,
                'shift_id', p_shift_id
            );
        END IF;
    END IF;

    -- Calculate Sales Totals for this shift (excluding VOIDED sales)
    SELECT
        COUNT(*),
        COALESCE(SUM(subtotal), 0.00),
        COALESCE(SUM(discount_total), 0.00),
        COALESCE(SUM(tax_total), 0.00),
        COALESCE(SUM(total_amount), 0.00)
    INTO
        v_sales_count, v_gross_sales, v_discount_total, v_tax_total, v_net_sales
    FROM public.retail_sales
    WHERE shift_id = p_shift_id AND workspace_id = p_workspace_id AND status <> 'VOIDED';

    -- Calculate Payment Breakdown (from retail_sale_payments joined with active sales)
    SELECT
        COALESCE(SUM(CASE WHEN rsp.payment_method = 'CASH' THEN rsp.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN rsp.payment_method IN ('CARD', 'CARD_EXTERNAL') THEN rsp.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN rsp.payment_method = 'BANK_TRANSFER' THEN rsp.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN rsp.payment_method NOT IN ('CASH', 'CARD', 'CARD_EXTERNAL', 'BANK_TRANSFER') THEN rsp.amount ELSE 0 END), 0.00)
    INTO
        v_cash_sales, v_card_sales, v_transfer_sales, v_other_sales
    FROM public.retail_sale_payments rsp
    JOIN public.retail_sales rs ON rs.id = rsp.sale_id
    WHERE rs.shift_id = p_shift_id AND rs.workspace_id = p_workspace_id AND rs.status <> 'VOIDED';

    -- Calculate Returns and Refunds processed during this shift
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN refund_payment_method = 'CASH' THEN total_refund_amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN refund_payment_method <> 'CASH' THEN total_refund_amount ELSE 0 END), 0.00)
    INTO
        v_refund_count, v_cash_refunds, v_noncash_refunds
    FROM public.retail_returns
    WHERE shift_id = p_shift_id AND workspace_id = p_workspace_id;

    -- Count return item units
    SELECT COALESCE(SUM(ri.quantity_returned), 0)
    INTO v_returns_count
    FROM public.retail_return_items ri
    JOIN public.retail_returns r ON r.id = ri.return_id
    WHERE r.shift_id = p_shift_id AND r.workspace_id = p_workspace_id;

    -- Calculate Voids
    SELECT
        COUNT(*),
        COALESCE(SUM(amount), 0.00)
    INTO
        v_void_count, v_void_total
    FROM public.retail_voided_sales
    WHERE shift_id = p_shift_id AND workspace_id = p_workspace_id;

    -- Cash Drawer Formula:
    -- Expected Cash = Opening Float + Cash Sales - Cash Refunds
    v_expected_cash := ROUND(v_shift.opening_cash + v_cash_sales - v_cash_refunds, 2);
    v_variance := ROUND(p_closing_cash_actual - v_expected_cash, 2);

    -- Update shift row to CLOSED
    UPDATE public.retail_cashier_shifts
    SET status = 'CLOSED',
        closed_at = v_closed_at,
        closing_cash_actual = p_closing_cash_actual,
        expected_cash = v_expected_cash,
        variance = v_variance,
        notes = p_notes
    WHERE id = p_shift_id;

    -- Insert Immutable Cash-Up Report
    INSERT INTO public.retail_cashier_cashup_reports (
        organization_id, workspace_id, shift_id, cashier_user_id, cashier_name,
        terminal_id, started_at, closed_at, opening_float, sales_count,
        gross_sales, discount_total, tax_total, net_sales, cash_sales,
        card_sales, transfer_sales, other_sales, cash_refunds, noncash_refunds,
        refund_count, returns_count, void_count, void_total, paid_in, paid_out,
        expected_cash, closing_cash_actual, variance, currency, closed_by_user_id,
        manager_approval_user_id, notes
    ) VALUES (
        p_organization_id, p_workspace_id, p_shift_id, v_shift.cashier_user_id, v_shift.cashier_name,
        v_terminal_id, v_shift.started_at, v_closed_at, v_shift.opening_cash, v_sales_count,
        v_gross_sales, v_discount_total, v_tax_total, v_net_sales, v_cash_sales,
        v_card_sales, v_transfer_sales, v_other_sales, v_cash_refunds, v_noncash_refunds,
        v_refund_count, v_returns_count, v_void_count, v_void_total, 0.00, 0.00,
        v_expected_cash, p_closing_cash_actual, v_variance, 'USD', p_closed_by_user_id,
        p_manager_approval_user_id, p_notes
    ) RETURNING id INTO v_report_id;

    RETURN jsonb_build_object(
        'success', true,
        'report_id', v_report_id,
        'shift_id', p_shift_id,
        'cashier_name', v_shift.cashier_name,
        'started_at', v_shift.started_at,
        'closed_at', v_closed_at,
        'opening_float', v_shift.opening_cash,
        'sales_count', v_sales_count,
        'gross_sales', v_gross_sales,
        'net_sales', v_net_sales,
        'cash_sales', v_cash_sales,
        'card_sales', v_card_sales,
        'transfer_sales', v_transfer_sales,
        'cash_refunds', v_cash_refunds,
        'noncash_refunds', v_noncash_refunds,
        'void_count', v_void_count,
        'expected_cash', v_expected_cash,
        'closing_cash_actual', p_closing_cash_actual,
        'variance', v_variance
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_close_shift_cashup FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_close_shift_cashup TO service_role;
