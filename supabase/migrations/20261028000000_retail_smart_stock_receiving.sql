-- =====================================================================
-- Ralion OS — Migration: MARI Smart Stock Receiving
-- Ras Ali Labs (Pty) Ltd
--
-- Enables intelligent stock receiving from supplier invoices and
-- packing lists (PDF, scanned images, CSV, spreadsheets).
--
-- Architectural Guarantees:
-- 1. Uploading an invoice or packing list creates a reviewable DRAFT only;
--    it NEVER automatically increases stock or modifies inventory balances.
-- 2. Physical stock increases ONLY upon explicit authorized manager approval
--    via atomic PostgreSQL transaction.
-- 3. Duplicate detection by file SHA-256 and (workspace, supplier, doc_type, doc_number).
-- 4. Single-transaction nonce claim prevents concurrent or replay double-receiving.
-- 5. Full workspace isolation and RLS: direct client execution revoked,
--    granted exclusively to service_role.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Smart Receipt Drafts Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_smart_receipt_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('INVOICE', 'PACKING_LIST', 'COMBINED')),
    status TEXT NOT NULL CHECK (status IN (
        'PENDING_EXTRACTION', 'PROCESSING', 'EXTRACTED', 'READY_FOR_REVIEW', 'POSTING', 'POSTED', 'FAILED', 'REJECTED'
    )) DEFAULT 'PENDING_EXTRACTION',
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    file_sha256 TEXT NOT NULL,
    supplier_id UUID REFERENCES public.retail_suppliers(id) ON DELETE SET NULL,
    extracted_supplier_name TEXT,
    extracted_supplier_tax_id TEXT,
    extracted_document_number TEXT,
    extracted_po_number TEXT,
    purchase_order_id UUID REFERENCES public.retail_purchase_orders(id) ON DELETE SET NULL,
    document_date DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    extraction_raw JSONB,
    extraction_error TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    posted_at TIMESTAMPTZ,
    goods_receipt_id UUID REFERENCES public.retail_goods_receipts(id) ON DELETE SET NULL,
    posting_nonce UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace indices and deduplication
CREATE INDEX IF NOT EXISTS idx_retail_smart_drafts_ws ON public.retail_smart_receipt_drafts (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_retail_smart_drafts_sha ON public.retail_smart_receipt_drafts (workspace_id, file_sha256);
CREATE INDEX IF NOT EXISTS idx_retail_smart_drafts_po ON public.retail_smart_receipt_drafts (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_retail_smart_drafts_nonce ON public.retail_smart_receipt_drafts (posting_nonce);

-- Prevent duplicate active documents for same supplier + doc_number within workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_smart_drafts_doc_unique
ON public.retail_smart_receipt_drafts (workspace_id, supplier_id, document_type, extracted_document_number)
WHERE extracted_document_number IS NOT NULL AND status NOT IN ('REJECTED', 'FAILED');

-- ---------------------------------------------------------------------
-- 2. Smart Receipt Draft Items Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_smart_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.retail_smart_receipt_drafts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    raw_description TEXT NOT NULL,
    raw_sku TEXT,
    raw_barcode TEXT,
    stated_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    damaged_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    missing_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_of_measure TEXT NOT NULL DEFAULT 'units',
    pack_label TEXT,
    pack_size NUMERIC(14, 4) NOT NULL DEFAULT 1.0000 CHECK (pack_size > 0),
    calculated_base_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(14, 2),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    matched_product_id UUID REFERENCES public.retail_products(id) ON DELETE SET NULL,
    matched_package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE SET NULL,
    matched_po_item_id UUID REFERENCES public.retail_po_items(id) ON DELETE SET NULL,
    match_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    match_status TEXT NOT NULL CHECK (match_status IN (
        'EXACT', 'HIGH_CONFIDENCE', 'NEEDS_REVIEW', 'UNMATCHED', 'PROPOSED_NEW'
    )) DEFAULT 'UNMATCHED',
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_smart_items_draft ON public.retail_smart_receipt_items (draft_id);
CREATE INDEX IF NOT EXISTS idx_retail_smart_items_prod ON public.retail_smart_receipt_items (matched_product_id);
CREATE INDEX IF NOT EXISTS idx_retail_smart_items_ws ON public.retail_smart_receipt_items (workspace_id);

-- ---------------------------------------------------------------------
-- 3. Smart Receipt Multi-Document Attachments Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_smart_receipt_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.retail_smart_receipt_drafts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('INVOICE', 'PACKING_LIST', 'DELIVERY_NOTE', 'OTHER')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    file_sha256 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_smart_attach_draft ON public.retail_smart_receipt_attachments (draft_id);
CREATE INDEX IF NOT EXISTS idx_retail_smart_attach_ws ON public.retail_smart_receipt_attachments (workspace_id);

-- ---------------------------------------------------------------------
-- 4. RLS & Privileges: service_role only
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'retail_smart_receipt_drafts',
        'retail_smart_receipt_items',
        'retail_smart_receipt_attachments'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. Atomic Smart Stock Receipt Posting RPC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_atomic_smart_stock_receipt(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_draft_id UUID,
    p_approved_by UUID,
    p_nonce UUID,
    p_notes TEXT,
    p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_draft RECORD;
    v_po_id UUID;
    v_po_number TEXT;
    v_receipt_number TEXT;
    v_receipt_id UUID;
    v_item JSONB;
    v_line_id UUID;
    v_product_id UUID;
    v_package_id UUID;
    v_qty NUMERIC;
    v_pack_size NUMERIC;
    v_base NUMERIC;
    v_unit_cost NUMERIC;
    v_stock_id UUID;
    v_current_stock NUMERIC;
    v_po_item_id UUID;
    v_lines_posted INTEGER := 0;
    v_total_base NUMERIC := 0;
    v_existing_receipt RECORD;
    v_supplier_id UUID;
    v_default_po_number TEXT;
BEGIN
    -- Entitlement check
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    -- Workspace check
    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

    -- Lock draft row for update
    SELECT * INTO v_draft
    FROM public.retail_smart_receipt_drafts
    WHERE id = p_draft_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'DRAFT_NOT_FOUND: Smart receiving draft % not found in workspace.', p_draft_id;
    END IF;

    -- Idempotent retry: if already posted with the exact same nonce, return existing receipt safely
    IF v_draft.status = 'POSTED' THEN
        IF v_draft.posting_nonce = p_nonce AND v_draft.goods_receipt_id IS NOT NULL THEN
            SELECT receipt_number INTO v_receipt_number
            FROM public.retail_goods_receipts
            WHERE id = v_draft.goods_receipt_id;

            RETURN jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'draft_id', p_draft_id,
                'receipt_id', v_draft.goods_receipt_id,
                'receipt_number', v_receipt_number,
                'message', 'Receipt already posted with matching nonce; safely returned without duplicate stock adjustments.'
            );
        ELSE
            RAISE EXCEPTION 'DRAFT_ALREADY_POSTED: Smart receiving draft % has already been posted to inventory.', p_draft_id;
        END IF;
    END IF;

    IF v_draft.status NOT IN ('READY_FOR_REVIEW', 'EXTRACTED') THEN
        RAISE EXCEPTION 'INVALID_DRAFT_STATUS: Draft status is %, must be READY_FOR_REVIEW or EXTRACTED to post.', v_draft.status;
    END IF;

    -- Nonce uniqueness check across drafts to prevent cross-draft nonce reuse
    IF p_nonce IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.retail_smart_receipt_drafts
        WHERE posting_nonce = p_nonce AND id <> p_draft_id
    ) THEN
        RAISE EXCEPTION 'NONCE_ALREADY_USED: Posting nonce % has already been consumed by another receiving operation.', p_nonce;
    END IF;

    -- Resolve or create PO linkage
    v_po_id := v_draft.purchase_order_id;
    v_supplier_id := v_draft.supplier_id;

    IF v_po_id IS NOT NULL THEN
        SELECT po_number INTO v_po_number
        FROM public.retail_purchase_orders
        WHERE id = v_po_id AND workspace_id = p_workspace_id;
    ELSE
        -- Ensure we have a valid supplier for PO creation
        IF v_supplier_id IS NULL THEN
            -- Lookup or fallback to first active supplier in workspace
            SELECT id INTO v_supplier_id
            FROM public.retail_suppliers
            WHERE workspace_id = p_workspace_id
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_supplier_id IS NULL THEN
                -- Auto-create default supplier record from extracted info
                INSERT INTO public.retail_suppliers (
                    organization_id, workspace_id, name, payment_terms, currency
                ) VALUES (
                    p_organization_id, p_workspace_id,
                    COALESCE(v_draft.extracted_supplier_name, 'General Supplier'),
                    'Net 30',
                    v_draft.currency
                ) RETURNING id INTO v_supplier_id;
            END IF;
        END IF;

        -- Create linked PO record representing this invoice/delivery
        v_default_po_number := 'PO-SR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
        INSERT INTO public.retail_purchase_orders (
            organization_id, workspace_id, supplier_id, po_number, status,
            total_amount, currency, notes
        ) VALUES (
            p_organization_id, p_workspace_id, v_supplier_id, v_default_po_number,
            'SUBMITTED', v_draft.total_amount, v_draft.currency,
            'Auto-generated from Smart Receiving Draft ' || COALESCE(v_draft.extracted_document_number, v_draft.file_name)
        ) RETURNING id, po_number INTO v_po_id, v_po_number;
    END IF;

    -- Receipt number generation
    v_receipt_number := 'GRN-SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6));

    -- Insert Goods Receipt header
    INSERT INTO public.retail_goods_receipts (
        organization_id, workspace_id, purchase_order_id, receipt_number, received_by, notes
    ) VALUES (
        p_organization_id, p_workspace_id, v_po_id, v_receipt_number, p_approved_by,
        COALESCE(p_notes, 'Smart Stock Receipt from ' || v_draft.document_type || ' ' || COALESCE(v_draft.extracted_document_number, ''))
    ) RETURNING id INTO v_receipt_id;

    -- Process lines
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_line_id := NULLIF(COALESCE(v_item->>'id', v_item->>'item_id'), '')::UUID;
        v_product_id := (v_item->>'product_id')::UUID;
        v_package_id := NULLIF(v_item->>'package_id', '')::UUID;
        v_qty := COALESCE((v_item->>'quantity_received')::NUMERIC, (v_item->>'received_quantity')::NUMERIC);
        v_pack_size := COALESCE((v_item->>'pack_size')::NUMERIC, 1.0000);
        v_unit_cost := COALESCE((v_item->>'unit_cost')::NUMERIC, 0.00);

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'UNMATCHED_PRODUCT: Every received line item must be matched to a catalogue product before posting.';
        END IF;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            CONTINUE; -- Skip zero or negative items
        END IF;

        IF v_pack_size <= 0 THEN
            RAISE EXCEPTION 'INVALID_PACK_SIZE: Pack size must be greater than zero for product %.', v_product_id;
        END IF;

        -- Exact base unit computation with precision check (max 2 decimals)
        v_base := v_qty * v_pack_size;
        IF v_base <> ROUND(v_base, 2) THEN
            RAISE EXCEPTION 'BASE_QUANTITY_PRECISION: % x % = % base units cannot be stored exactly (max 2 decimals)', v_qty, v_pack_size, v_base;
        END IF;

        -- Verify product belongs to workspace
        IF NOT EXISTS (
            SELECT 1 FROM public.retail_products
            WHERE id = v_product_id AND workspace_id = p_workspace_id
        ) THEN
            RAISE EXCEPTION 'CROSS_TENANT_PRODUCT: Product % does not belong to workspace %.', v_product_id, p_workspace_id;
        END IF;

        -- Resolve or create PO item line
        SELECT id INTO v_po_item_id
        FROM public.retail_po_items
        WHERE purchase_order_id = v_po_id AND product_id = v_product_id
        LIMIT 1;

        IF v_po_item_id IS NULL THEN
            INSERT INTO public.retail_po_items (
                purchase_order_id, product_id, quantity_ordered, quantity_received,
                unit_cost, line_total, pack_size, package_id
            ) VALUES (
                v_po_id, v_product_id, v_qty, v_qty,
                v_unit_cost, (v_qty * v_unit_cost), v_pack_size, v_package_id
            ) RETURNING id INTO v_po_item_id;
        ELSE
            UPDATE public.retail_po_items
            SET quantity_received = quantity_received + v_qty
            WHERE id = v_po_item_id;
        END IF;

        -- Row-level locked stock level update
        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO public.retail_stock_levels (
                organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved
            ) VALUES (
                p_organization_id, p_workspace_id, v_product_id, v_base, 0
            ) RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
        ELSE
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_base, updated_at = NOW()
            WHERE id = v_stock_id
            RETURNING quantity_on_hand INTO v_current_stock;
        END IF;

        -- Stock movement ledger (type RECEIVING, reference PURCHASE_ORDER)
        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, 'RECEIVING',
            v_base, v_current_stock, ROUND(v_unit_cost / v_pack_size, 2), 'PURCHASE_ORDER',
            COALESCE(v_po_number, v_receipt_number),
            'Smart Stock Receipt from ' || v_draft.document_type || ' ' || COALESCE(v_draft.extracted_document_number, v_receipt_number)
                || ' (' || v_qty || ' received x factor ' || v_pack_size || ' = ' || v_base || ' base units)',
            p_approved_by
        );

        -- Goods receipt line item
        INSERT INTO public.retail_goods_receipt_items (
            organization_id, workspace_id, goods_receipt_id, po_item_id, product_id,
            quantity_received, pack_size, base_quantity, unit_cost
        ) VALUES (
            p_organization_id, p_workspace_id, v_receipt_id, v_po_item_id, v_product_id,
            v_qty, v_pack_size, v_base, v_unit_cost
        );

        -- Update draft item record if exists
        IF v_line_id IS NOT NULL THEN
            UPDATE public.retail_smart_receipt_items
            SET received_quantity = v_qty,
                calculated_base_quantity = v_base,
                matched_product_id = v_product_id,
                matched_package_id = v_package_id,
                matched_po_item_id = v_po_item_id,
                unit_cost = v_unit_cost,
                match_status = 'EXACT',
                updated_at = NOW()
            WHERE id = v_line_id AND draft_id = p_draft_id;
        END IF;

        v_lines_posted := v_lines_posted + 1;
        v_total_base := v_total_base + v_base;
    END LOOP;

    IF v_lines_posted = 0 THEN
        RAISE EXCEPTION 'EMPTY_RECEIPT: No item with positive received quantity was supplied.';
    END IF;

    -- Update PO status
    IF EXISTS (
        SELECT 1 FROM public.retail_po_items
        WHERE purchase_order_id = v_po_id AND quantity_received < quantity_ordered
    ) THEN
        UPDATE public.retail_purchase_orders SET status = 'PARTIAL_RECEIVED', updated_at = NOW() WHERE id = v_po_id;
    ELSE
        UPDATE public.retail_purchase_orders SET status = 'RECEIVED', updated_at = NOW() WHERE id = v_po_id;
    END IF;

    -- Mark draft as POSTED with durable audit markers
    UPDATE public.retail_smart_receipt_drafts
    SET status = 'POSTED',
        goods_receipt_id = v_receipt_id,
        purchase_order_id = v_po_id,
        posted_by = p_approved_by,
        posted_at = NOW(),
        posting_nonce = p_nonce,
        reviewed_by = COALESCE(reviewed_by, p_approved_by),
        reviewed_at = COALESCE(reviewed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_draft_id;

    RETURN jsonb_build_object(
        'success', true,
        'draft_id', p_draft_id,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'purchase_order_id', v_po_id,
        'po_number', v_po_number,
        'lines_posted', v_lines_posted,
        'base_units_added', v_total_base
    );
END;
$$;

-- Privileges: service_role only
REVOKE EXECUTE ON FUNCTION public.execute_atomic_smart_stock_receipt(UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_smart_stock_receipt(UUID, UUID, UUID, UUID, UUID, TEXT, JSONB) TO service_role;
