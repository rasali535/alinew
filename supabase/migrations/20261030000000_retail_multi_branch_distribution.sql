-- =====================================================================
-- Ralion OS — Ralion Retail Module Migration
-- 20261030000000_retail_multi_branch_distribution.sql
--
-- Multi-Branch Warehouse Replenishment, Internal Stock Transfers,
-- Goods-In-Transit Tracking, Discrepancies & Location-Scoped Inventory
--
-- Closes GitHub Issue #165
-- Coordinated with Issues #161 and #164
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Expand retail_locations (Warehouse & Retail Branch Partitioning)
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_locations
    ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'RETAIL_BRANCH'
        CHECK (location_type IN ('WAREHOUSE', 'RETAIL_BRANCH')),
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS manager_name TEXT,
    ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_retail_locations_type
    ON public.retail_locations (workspace_id, location_type);

-- ---------------------------------------------------------------------
-- 2. Expand retail_stock_levels (In-Transit & Damaged Quarantine Buckets)
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_stock_levels
    ADD COLUMN IF NOT EXISTS quantity_in_transit NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (quantity_in_transit >= 0),
    ADD COLUMN IF NOT EXISTS quantity_damaged NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (quantity_damaged >= 0);

-- Partial index for unassigned location stock
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_stock_levels_ws_prod_null_loc
    ON public.retail_stock_levels (workspace_id, product_id)
    WHERE location_id IS NULL;

-- ---------------------------------------------------------------------
-- 3. Expand retail_stock_movements Reference Types
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_stock_movements
    DROP CONSTRAINT IF EXISTS retail_stock_movements_reference_type_check;

ALTER TABLE public.retail_stock_movements
    ADD CONSTRAINT retail_stock_movements_reference_type_check
    CHECK (reference_type IN (
        'PURCHASE_ORDER',
        'SALE_RECEIPT',
        'MANUAL_ADJUSTMENT',
        'STOCKTAKE',
        'INITIAL_IMPORT',
        'STOCK_TRANSFER',
        'TRANSFER_DISPATCH',
        'TRANSFER_RECEIVE',
        'TRANSFER_DISCREPANCY'
    ));

-- ---------------------------------------------------------------------
-- 4. Tie Cashier Shifts & Sales to Physical Locations
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_cashier_shifts
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.retail_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_retail_cashier_shifts_loc
    ON public.retail_cashier_shifts (workspace_id, location_id);

ALTER TABLE public.retail_sales
    ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.retail_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_retail_sales_loc
    ON public.retail_sales (workspace_id, location_id);

-- ---------------------------------------------------------------------
-- 5. User-to-Location Permissions (Branch Staff vs Regional Overseers)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.retail_locations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'STAFF'
        CHECK (role IN ('STAFF', 'CASHIER', 'WAREHOUSE_OPERATOR', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_user_locations_user_loc_unique UNIQUE (workspace_id, user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_user_locations_user
    ON public.retail_user_locations (workspace_id, user_id);

ALTER TABLE public.retail_user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_user_locations_tenant_isolation" ON public.retail_user_locations;
CREATE POLICY "retail_user_locations_tenant_isolation"
    ON public.retail_user_locations
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------
-- 6. Branch Replenishment Stock Requests
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_number TEXT NOT NULL,
    source_location_id UUID NOT NULL REFERENCES public.retail_locations(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES public.retail_locations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'REQUESTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'ALLOCATED', 'FULFILLED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    required_date DATE,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_stock_requests_ws_num UNIQUE (workspace_id, request_number),
    CONSTRAINT retail_stock_requests_loc_distinct CHECK (source_location_id <> destination_location_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_requests_ws_status
    ON public.retail_stock_requests (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_retail_stock_requests_dest
    ON public.retail_stock_requests (workspace_id, destination_location_id);
CREATE INDEX IF NOT EXISTS idx_retail_stock_requests_src
    ON public.retail_stock_requests (workspace_id, source_location_id);

ALTER TABLE public.retail_stock_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_stock_requests_tenant_isolation" ON public.retail_stock_requests;
CREATE POLICY "retail_stock_requests_tenant_isolation"
    ON public.retail_stock_requests
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Line items for stock requests
CREATE TABLE IF NOT EXISTS public.retail_stock_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.retail_stock_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE SET NULL,
    pack_label TEXT,
    pack_size NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (pack_size > 0),
    quantity_requested NUMERIC(12, 2) NOT NULL CHECK (quantity_requested > 0),
    base_quantity_requested NUMERIC(12, 2) NOT NULL CHECK (base_quantity_requested > 0),
    quantity_approved NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_approved >= 0),
    base_quantity_approved NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_approved >= 0),
    quantity_fulfilled NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_fulfilled >= 0),
    base_quantity_fulfilled NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_fulfilled >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_request_items_req
    ON public.retail_stock_request_items (request_id);

ALTER TABLE public.retail_stock_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_stock_request_items_tenant_isolation" ON public.retail_stock_request_items;
CREATE POLICY "retail_stock_request_items_tenant_isolation"
    ON public.retail_stock_request_items
    FOR ALL
    USING (
        request_id IN (
            SELECT id FROM public.retail_stock_requests
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- ---------------------------------------------------------------------
-- 7. Internal Stock Transfers & Goods In Transit
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    request_id UUID REFERENCES public.retail_stock_requests(id) ON DELETE SET NULL,
    source_location_id UUID NOT NULL REFERENCES public.retail_locations(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES public.retail_locations(id) ON DELETE RESTRICT,
    transfer_type TEXT NOT NULL DEFAULT 'WAREHOUSE_TO_BRANCH'
        CHECK (transfer_type IN ('WAREHOUSE_TO_BRANCH', 'BRANCH_TO_BRANCH', 'BRANCH_TO_WAREHOUSE_RETURN', 'WAREHOUSE_TO_WAREHOUSE')),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT', 'REQUESTED', 'APPROVED', 'ALLOCATED', 'PICKING',
            'DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED',
            'CLOSED', 'CANCELLED', 'EXCEPTION'
        )),
    dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dispatched_by_name TEXT,
    dispatched_at TIMESTAMPTZ,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_by_name TEXT,
    received_at TIMESTAMPTZ,
    carrier_name TEXT,
    vehicle_registration TEXT,
    tracking_number TEXT,
    estimated_arrival TIMESTAMPTZ,
    total_lines INTEGER NOT NULL DEFAULT 0,
    total_units_dispatched NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_units_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_units_damaged NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_units_shortage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_valuation NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    dispatch_nonce TEXT,
    receive_nonce TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_stock_transfers_ws_num UNIQUE (workspace_id, transfer_number),
    CONSTRAINT retail_stock_transfers_loc_distinct CHECK (source_location_id <> destination_location_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_transfers_ws_status
    ON public.retail_stock_transfers (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_retail_stock_transfers_dest
    ON public.retail_stock_transfers (workspace_id, destination_location_id);
CREATE INDEX IF NOT EXISTS idx_retail_stock_transfers_src
    ON public.retail_stock_transfers (workspace_id, source_location_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_stock_transfers_dispatch_nonce
    ON public.retail_stock_transfers (workspace_id, dispatch_nonce)
    WHERE dispatch_nonce IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_stock_transfers_receive_nonce
    ON public.retail_stock_transfers (workspace_id, receive_nonce)
    WHERE receive_nonce IS NOT NULL;

ALTER TABLE public.retail_stock_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_stock_transfers_tenant_isolation" ON public.retail_stock_transfers;
CREATE POLICY "retail_stock_transfers_tenant_isolation"
    ON public.retail_stock_transfers
    FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Line items for stock transfers
CREATE TABLE IF NOT EXISTS public.retail_stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.retail_stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE SET NULL,
    pack_label TEXT,
    pack_size NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (pack_size > 0),
    quantity_dispatched NUMERIC(12, 2) NOT NULL CHECK (quantity_dispatched >= 0),
    base_quantity_dispatched NUMERIC(12, 2) NOT NULL CHECK (base_quantity_dispatched >= 0),
    quantity_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_received >= 0),
    base_quantity_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_received >= 0),
    quantity_damaged NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_damaged >= 0),
    base_quantity_damaged NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_damaged >= 0),
    quantity_shortage NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_shortage >= 0),
    base_quantity_shortage NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_shortage >= 0),
    quantity_surplus NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_surplus >= 0),
    base_quantity_surplus NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_quantity_surplus >= 0),
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_transfer_items_trf
    ON public.retail_stock_transfer_items (transfer_id);

ALTER TABLE public.retail_stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_stock_transfer_items_tenant_isolation" ON public.retail_stock_transfer_items;
CREATE POLICY "retail_stock_transfer_items_tenant_isolation"
    ON public.retail_stock_transfer_items
    FOR ALL
    USING (
        transfer_id IN (
            SELECT id FROM public.retail_stock_transfers
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- ---------------------------------------------------------------------
-- 8. Transfer Discrepancies & Damage Audit
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_transfer_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.retail_stock_transfers(id) ON DELETE CASCADE,
    transfer_item_id UUID NOT NULL REFERENCES public.retail_stock_transfer_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    discrepancy_type TEXT NOT NULL
        CHECK (discrepancy_type IN ('DAMAGED', 'SHORTAGE', 'SURPLUS', 'REJECTED', 'WRONG_ITEM')),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    base_quantity NUMERIC(12, 2) NOT NULL CHECK (base_quantity > 0),
    resolution_action TEXT NOT NULL DEFAULT 'QUARANTINE'
        CHECK (resolution_action IN ('QUARANTINE', 'WRITE_OFF', 'RETURN_TO_WAREHOUSE', 'SUPPLIER_CLAIM', 'ADJUST_INVENTORY')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_transfer_discrepancies_trf
    ON public.retail_transfer_discrepancies (transfer_id);

ALTER TABLE public.retail_transfer_discrepancies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_transfer_discrepancies_tenant_isolation" ON public.retail_transfer_discrepancies;
CREATE POLICY "retail_transfer_discrepancies_tenant_isolation"
    ON public.retail_transfer_discrepancies
    FOR ALL
    USING (
        transfer_id IN (
            SELECT id FROM public.retail_stock_transfers
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- ---------------------------------------------------------------------
-- 9. Atomic Stored Procedure: Dispatch Stock Transfer
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_atomic_dispatch_stock_transfer(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_transfer_id UUID,
    p_dispatched_by UUID,
    p_dispatched_by_name TEXT,
    p_carrier_name TEXT DEFAULT NULL,
    p_vehicle_registration TEXT DEFAULT NULL,
    p_tracking_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_dispatch_nonce TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trf RECORD;
    v_item RECORD;
    v_stock_id UUID;
    v_current_stock NUMERIC;
    v_product_name TEXT;
    v_sku TEXT;
    v_total_units NUMERIC := 0;
    v_total_val NUMERIC := 0;
    v_lines INT := 0;
BEGIN
    -- 1. Lock and validate transfer record
    SELECT * INTO v_trf
    FROM public.retail_stock_transfers
    WHERE id = p_transfer_id
      AND workspace_id = p_workspace_id
      AND organization_id = p_organization_id
    FOR UPDATE;

    IF v_trf.id IS NULL THEN
        RAISE EXCEPTION 'TRANSFER_NOT_FOUND: Stock transfer % does not exist in this workspace.', p_transfer_id;
    END IF;

    -- Check idempotency nonce
    IF p_dispatch_nonce IS NOT NULL AND v_trf.dispatch_nonce = p_dispatch_nonce THEN
        RETURN jsonb_build_object(
            'success', true,
            'transfer_id', v_trf.id,
            'transfer_number', v_trf.transfer_number,
            'status', v_trf.status,
            'idempotent_replay', true,
            'message', 'Transfer was already dispatched with this nonce.'
        );
    END IF;

    IF v_trf.status IN ('DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED') THEN
        RAISE EXCEPTION 'TRANSFER_ALREADY_DISPATCHED: Transfer % is currently in % status and cannot be dispatched again.',
            v_trf.transfer_number, v_trf.status;
    END IF;

    IF v_trf.status IN ('CANCELLED', 'REJECTED') THEN
        RAISE EXCEPTION 'TRANSFER_INACTIVE: Cannot dispatch a cancelled or rejected transfer.';
    END IF;

    -- 2. Validate and deduct stock from source location
    FOR v_item IN
        SELECT ti.*, p.name AS prod_name, p.sku AS prod_sku, p.purchase_cost
        FROM public.retail_stock_transfer_items ti
        JOIN public.retail_products p ON p.id = ti.product_id
        WHERE ti.transfer_id = p_transfer_id
        ORDER BY ti.product_id
    LOOP
        v_lines := v_lines + 1;
        v_total_units := v_total_units + v_item.base_quantity_dispatched;
        v_total_val := v_total_val + (v_item.base_quantity_dispatched * v_item.purchase_cost);

        -- Lock source location stock row
        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id
          AND product_id = v_item.product_id
          AND location_id = v_trf.source_location_id
        FOR UPDATE;

        IF v_stock_id IS NULL OR v_current_stock < v_item.base_quantity_dispatched THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % (SKU %) has available % at source location, requested dispatch %',
                v_item.prod_name, v_item.prod_sku, COALESCE(v_current_stock, 0), v_item.base_quantity_dispatched;
        END IF;

        -- Decrement source location quantity on hand exactly once
        UPDATE public.retail_stock_levels
        SET quantity_on_hand = quantity_on_hand - v_item.base_quantity_dispatched,
            updated_at = NOW()
        WHERE id = v_stock_id;

        -- Log source location decrement in immutable stock movements ledger
        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, location_id,
            movement_type, quantity_change, balance_after, unit_cost,
            reference_type, reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_item.product_id, v_trf.source_location_id,
            'TRANSFER', -v_item.base_quantity_dispatched, v_current_stock - v_item.base_quantity_dispatched,
            v_item.purchase_cost, 'TRANSFER_DISPATCH', v_trf.transfer_number,
            'Dispatched in transfer ' || v_trf.transfer_number || ' to destination branch',
            p_dispatched_by
        );

        -- Track goods in transit on destination location stock record
        INSERT INTO public.retail_stock_levels (
            organization_id, workspace_id, product_id, location_id,
            quantity_on_hand, quantity_reserved, quantity_in_transit, quantity_damaged
        ) VALUES (
            p_organization_id, p_workspace_id, v_item.product_id, v_trf.destination_location_id,
            0, 0, v_item.base_quantity_dispatched, 0
        )
        ON CONFLICT (workspace_id, product_id, location_id)
        DO UPDATE SET
            quantity_in_transit = public.retail_stock_levels.quantity_in_transit + EXCLUDED.quantity_in_transit,
            updated_at = NOW();
    END LOOP;

    IF v_lines = 0 THEN
        RAISE EXCEPTION 'EMPTY_TRANSFER: Cannot dispatch transfer % with zero items.', v_trf.transfer_number;
    END IF;

    -- 3. Update transfer status to IN_TRANSIT
    UPDATE public.retail_stock_transfers
    SET status = 'IN_TRANSIT',
        dispatched_by = p_dispatched_by,
        dispatched_by_name = p_dispatched_by_name,
        dispatched_at = NOW(),
        carrier_name = COALESCE(p_carrier_name, carrier_name),
        vehicle_registration = COALESCE(p_vehicle_registration, vehicle_registration),
        tracking_number = COALESCE(p_tracking_number, tracking_number),
        total_lines = v_lines,
        total_units_dispatched = v_total_units,
        total_valuation = v_total_val,
        dispatch_nonce = p_dispatch_nonce,
        notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || ' | ', '') || p_notes ELSE notes END,
        updated_at = NOW()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'transfer_number', v_trf.transfer_number,
        'status', 'IN_TRANSIT',
        'total_lines', v_lines,
        'total_units_dispatched', v_total_units,
        'total_valuation', v_total_val
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 10. Atomic Stored Procedure: Receive Stock Transfer
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_atomic_receive_stock_transfer(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_transfer_id UUID,
    p_received_by UUID,
    p_received_by_name TEXT,
    p_receipt_lines JSONB,
    p_notes TEXT DEFAULT NULL,
    p_receive_nonce TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trf RECORD;
    v_line JSONB;
    v_item RECORD;
    v_item_id UUID;
    v_qty_rec NUMERIC;
    v_qty_dam NUMERIC;
    v_qty_short NUMERIC;
    v_base_rec NUMERIC;
    v_base_dam NUMERIC;
    v_base_short NUMERIC;
    v_total_rec NUMERIC := 0;
    v_total_dam NUMERIC := 0;
    v_total_short NUMERIC := 0;
    v_dest_stock RECORD;
    v_has_shortages BOOLEAN := false;
BEGIN
    -- 1. Lock and validate transfer record
    SELECT * INTO v_trf
    FROM public.retail_stock_transfers
    WHERE id = p_transfer_id
      AND workspace_id = p_workspace_id
      AND organization_id = p_organization_id
    FOR UPDATE;

    IF v_trf.id IS NULL THEN
        RAISE EXCEPTION 'TRANSFER_NOT_FOUND: Transfer % does not exist in this workspace.', p_transfer_id;
    END IF;

    -- Check idempotency nonce
    IF p_receive_nonce IS NOT NULL AND v_trf.receive_nonce = p_receive_nonce THEN
        RETURN jsonb_build_object(
            'success', true,
            'transfer_id', v_trf.id,
            'transfer_number', v_trf.transfer_number,
            'status', v_trf.status,
            'idempotent_replay', true,
            'message', 'Transfer was already received with this nonce.'
        );
    END IF;

    IF v_trf.status NOT IN ('IN_TRANSIT', 'DISPATCHED', 'PARTIALLY_RECEIVED') THEN
        RAISE EXCEPTION 'INVALID_TRANSFER_STATUS: Transfer % is currently in % status and cannot be received.',
            v_trf.transfer_number, v_trf.status;
    END IF;

    -- 2. Process each received line item
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_receipt_lines)
    LOOP
        v_item_id := (v_line->>'item_id')::UUID;
        v_qty_rec := COALESCE((v_line->>'quantity_received')::NUMERIC, 0);
        v_qty_dam := COALESCE((v_line->>'quantity_damaged')::NUMERIC, 0);

        IF v_qty_rec < 0 OR v_qty_dam < 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Received and damaged quantities cannot be negative.';
        END IF;

        -- Fetch transfer item
        SELECT ti.*, p.purchase_cost, p.name AS prod_name, p.sku AS prod_sku
        INTO v_item
        FROM public.retail_stock_transfer_items ti
        JOIN public.retail_products p ON p.id = ti.product_id
        WHERE ti.id = v_item_id AND ti.transfer_id = p_transfer_id
        FOR UPDATE;

        IF v_item.id IS NULL THEN
            RAISE EXCEPTION 'TRANSFER_ITEM_NOT_FOUND: Transfer line % not found in transfer %.', v_item_id, v_trf.transfer_number;
        END IF;

        v_base_rec := v_qty_rec * v_item.pack_size;
        v_base_dam := v_qty_dam * v_item.pack_size;

        -- Shortage calculation: dispatched - (received + damaged)
        IF v_base_rec + v_base_dam > v_item.base_quantity_dispatched THEN
            RAISE EXCEPTION 'OVER_DELIVERY_REJECTED: Received % + damaged % (% base) exceeds dispatched % base for product %.',
                v_qty_rec, v_qty_dam, (v_base_rec + v_base_dam), v_item.base_quantity_dispatched, v_item.prod_name;
        END IF;

        v_base_short := v_item.base_quantity_dispatched - (v_base_rec + v_base_dam);
        v_qty_short := v_base_short / v_item.pack_size;

        IF v_base_short > 0 THEN
            v_has_shortages := true;
        END IF;

        v_total_rec := v_total_rec + v_base_rec;
        v_total_dam := v_total_dam + v_base_dam;
        v_total_short := v_total_short + v_base_short;

        -- Update transfer item metrics
        UPDATE public.retail_stock_transfer_items
        SET quantity_received = v_qty_rec,
            base_quantity_received = v_base_rec,
            quantity_damaged = v_qty_dam,
            base_quantity_damaged = v_base_dam,
            quantity_shortage = v_qty_short,
            base_quantity_shortage = v_base_short
        WHERE id = v_item.id;

        -- Lock destination location stock level
        SELECT * INTO v_dest_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id
          AND product_id = v_item.product_id
          AND location_id = v_trf.destination_location_id
        FOR UPDATE;

        -- Decrement in-transit, increment sellable on-hand by good units, increment damaged quarantine
        UPDATE public.retail_stock_levels
        SET quantity_in_transit = GREATEST(0, quantity_in_transit - v_item.base_quantity_dispatched),
            quantity_on_hand = quantity_on_hand + v_base_rec,
            quantity_damaged = quantity_damaged + v_base_dam,
            updated_at = NOW()
        WHERE id = v_dest_stock.id;

        -- Append to stock movements for good received units
        IF v_base_rec > 0 THEN
            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, location_id,
                movement_type, quantity_change, balance_after, unit_cost,
                reference_type, reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_item.product_id, v_trf.destination_location_id,
                'TRANSFER', v_base_rec, v_dest_stock.quantity_on_hand + v_base_rec,
                v_item.purchase_cost, 'TRANSFER_RECEIVE', v_trf.transfer_number,
                'Received in transfer ' || v_trf.transfer_number || ' from source warehouse',
                p_received_by
            );
        END IF;

        -- Record damages in discrepancy audit table and log movement
        IF v_base_dam > 0 THEN
            INSERT INTO public.retail_transfer_discrepancies (
                transfer_id, transfer_item_id, product_id, discrepancy_type,
                quantity, base_quantity, resolution_action, resolution_notes, resolved_by, resolved_at
            ) VALUES (
                p_transfer_id, v_item.id, v_item.product_id, 'DAMAGED',
                v_qty_dam, v_base_dam, 'QUARANTINE',
                'Transit damage reported at destination receiving', p_received_by, NOW()
            );

            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, location_id,
                movement_type, quantity_change, balance_after, unit_cost,
                reference_type, reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_item.product_id, v_trf.destination_location_id,
                'DAMAGE_WRITE_OFF', 0, v_dest_stock.quantity_on_hand + v_base_rec,
                v_item.purchase_cost, 'TRANSFER_DISCREPANCY', v_trf.transfer_number,
                'Transit damage quarantined: ' || v_qty_dam || ' units (' || v_base_dam || ' base)',
                p_received_by
            );
        END IF;

        -- Record shortage in discrepancy table if any
        IF v_base_short > 0 THEN
            INSERT INTO public.retail_transfer_discrepancies (
                transfer_id, transfer_item_id, product_id, discrepancy_type,
                quantity, base_quantity, resolution_action, resolution_notes, resolved_by, resolved_at
            ) VALUES (
                p_transfer_id, v_item.id, v_item.product_id, 'SHORTAGE',
                v_qty_short, v_base_short, 'ADJUST_INVENTORY',
                'Shortage in transit: missing ' || v_qty_short || ' units upon destination receiving',
                p_received_by, NOW()
            );
        END IF;

        -- If linked to request, update request item fulfilled count
        IF v_trf.request_id IS NOT NULL THEN
            UPDATE public.retail_stock_request_items
            SET quantity_fulfilled = quantity_fulfilled + v_qty_rec,
                base_quantity_fulfilled = base_quantity_fulfilled + v_base_rec
            WHERE request_id = v_trf.request_id AND product_id = v_item.product_id;
        END IF;
    END LOOP;

    -- 3. Update transfer status
    UPDATE public.retail_stock_transfers
    SET status = CASE WHEN v_has_shortages THEN 'PARTIALLY_RECEIVED' ELSE 'RECEIVED' END,
        received_by = p_received_by,
        received_by_name = p_received_by_name,
        received_at = NOW(),
        total_units_received = v_total_rec,
        total_units_damaged = v_total_dam,
        total_units_shortage = v_total_short,
        receive_nonce = p_receive_nonce,
        notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes || ' | ', '') || p_notes ELSE notes END,
        updated_at = NOW()
    WHERE id = p_transfer_id;

    -- Update linked request status if all fulfilled
    IF v_trf.request_id IS NOT NULL THEN
        UPDATE public.retail_stock_requests
        SET status = CASE WHEN v_has_shortages THEN 'PARTIALLY_APPROVED' ELSE 'FULFILLED' END,
            updated_at = NOW()
        WHERE id = v_trf.request_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', p_transfer_id,
        'transfer_number', v_trf.transfer_number,
        'status', CASE WHEN v_has_shortages THEN 'PARTIALLY_RECEIVED' ELSE 'RECEIVED' END,
        'total_units_received', v_total_rec,
        'total_units_damaged', v_total_dam,
        'total_units_shortage', v_total_short
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 11. Drop Prior execute_atomic_retail_sale To Prevent Overloading Ambiguity
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.execute_atomic_retail_sale(
    UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID,
    TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT,
    JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ
);

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
    p_approval_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_existing_sale_id UUID;
    v_item JSONB;
    v_norm JSONB := '[]'::jsonb;
    v_payment JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_base NUMERIC;
    v_need NUMERIC;
    v_pkg_id UUID;
    v_pack_size NUMERIC;
    v_pack_label TEXT;
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
    v_effective_location_id UUID := p_location_id;
    v_loc_name TEXT := 'Default Location';
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id
          AND workspace_id = p_workspace_id
          AND module_key = 'retail'
          AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

    -- Resolve cashier shift location if location was not explicitly provided
    IF v_effective_location_id IS NULL AND p_shift_id IS NOT NULL THEN
        SELECT location_id INTO v_effective_location_id
        FROM public.retail_cashier_shifts
        WHERE id = p_shift_id;
    END IF;

    IF v_effective_location_id IS NOT NULL THEN
        SELECT name INTO v_loc_name
        FROM public.retail_locations
        WHERE id = v_effective_location_id;
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_sale_id
        FROM public.retail_sales
        WHERE workspace_id = p_workspace_id AND idempotency_key = p_idempotency_key;

        IF v_existing_sale_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'sale_id', v_existing_sale_id, 'idempotent_replay', true);
        END IF;
    END IF;

    IF p_approval_token_id IS NOT NULL THEN
        IF p_approval_expires_at IS NOT NULL AND p_approval_expires_at < NOW() THEN
            RAISE EXCEPTION 'APPROVAL_TOKEN_EXPIRED: Manager approval token has expired.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.retail_pos_consumed_tokens WHERE token_id = p_approval_token_id) THEN
            RAISE EXCEPTION 'TOKEN_ALREADY_CONSUMED: Manager approval token % has already been consumed.', p_approval_token_id;
        END IF;
    END IF;

    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        IF (v_payment->>'payment_method') IN ('CARD_EXTERNAL', 'BANK_TRANSFER') AND v_final_payment_status = 'PAID' THEN
            v_final_payment_status := 'PARTIAL';
        END IF;
    END LOOP;

    SELECT enable_negative_stock INTO v_allow_negative
    FROM public.retail_settings WHERE workspace_id = p_workspace_id;
    IF v_allow_negative IS NULL THEN v_allow_negative := false; END IF;

    -- Normalise lines: validate, resolve pack from the DB, compute base quantity
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_product_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := COALESCE(v_item->>'sku', '');

        IF v_quantity IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be greater than zero for product % (SKU %)', v_product_name, v_sku;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.retail_products WHERE id = v_product_id AND workspace_id = p_workspace_id) THEN
            RAISE EXCEPTION 'PRODUCT_NOT_IN_WORKSPACE: Product % does not belong to workspace %', v_product_id, p_workspace_id;
        END IF;

        v_pkg_id := NULLIF(v_item->>'package_id', '')::UUID;
        v_pack_size := 1;
        v_pack_label := NULL;
        IF v_pkg_id IS NOT NULL THEN
            SELECT base_units_per_pack, label INTO v_pack_size, v_pack_label
            FROM public.retail_product_packages
            WHERE id = v_pkg_id AND product_id = v_product_id AND workspace_id = p_workspace_id
              AND is_active AND kind IN ('SALES', 'BOTH');
            IF NOT FOUND THEN
                RAISE EXCEPTION 'INVALID_PACKAGE: package % is not an active sales pack of product % in this workspace', v_pkg_id, v_product_id;
            END IF;
        END IF;

        v_base := v_quantity * v_pack_size;
        IF v_base <> round(v_base, 2) THEN
            RAISE EXCEPTION 'BASE_QUANTITY_PRECISION: % x % = % base units cannot be stored exactly (max 2 decimals)', v_quantity, v_pack_size, v_base;
        END IF;

        v_norm := v_norm || (v_item || jsonb_build_object(
            'package_id', v_pkg_id,
            'pack_label', v_pack_label,
            'pack_size', v_pack_size,
            'base_quantity', v_base
        ));
    END LOOP;

    -- Lock stock rows (ordered) and check AGGREGATE demand per product at this location
    FOR v_product_id, v_need IN
        SELECT (e->>'product_id')::UUID, sum((e->>'base_quantity')::NUMERIC)
        FROM jsonb_array_elements(v_norm) e
        GROUP BY 1 ORDER BY 1
    LOOP
        SELECT name, sku INTO v_product_name, v_sku FROM public.retail_products WHERE id = v_product_id;

        IF v_effective_location_id IS NOT NULL THEN
            SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
            FROM public.retail_stock_levels
            WHERE workspace_id = p_workspace_id
              AND product_id = v_product_id
              AND location_id = v_effective_location_id
            FOR UPDATE;

            IF v_stock_id IS NULL THEN
                INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, location_id, quantity_on_hand, quantity_reserved)
                VALUES (p_organization_id, p_workspace_id, v_product_id, v_effective_location_id, 0, 0)
                RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
            END IF;
        ELSE
            SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
            FROM public.retail_stock_levels
            WHERE workspace_id = p_workspace_id
              AND product_id = v_product_id
              AND location_id IS NULL
            FOR UPDATE;

            IF v_stock_id IS NULL THEN
                INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, location_id, quantity_on_hand, quantity_reserved)
                VALUES (p_organization_id, p_workspace_id, v_product_id, NULL, 0, 0)
                RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
            END IF;
        END IF;

        IF v_current_stock < v_need AND NOT v_allow_negative THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % (SKU %) requested %, available % at branch location %',
                v_product_name, v_sku, v_need, v_current_stock, COALESCE(v_loc_name, 'Assigned Branch');
        END IF;
    END LOOP;

    INSERT INTO public.retail_sales (
        organization_id, workspace_id, sale_number, invoice_number, source,
        customer_id, customer_name, cashier_user_id, cashier_name, shift_id,
        status, currency, subtotal, tax_total, discount_total, total_amount,
        total_cost, payment_method, payment_status, idempotency_key, notes, is_pilot_demo,
        location_id
    ) VALUES (
        p_organization_id, p_workspace_id, p_sale_number, p_invoice_number, p_source,
        p_customer_id, p_customer_name, p_cashier_user_id, p_cashier_name, p_shift_id,
        'COMPLETED', p_currency, p_subtotal, p_tax_total, p_discount_total, p_total_amount,
        p_total_cost, p_payment_method, v_final_payment_status, p_idempotency_key, p_notes, p_is_pilot_demo,
        v_effective_location_id
    ) RETURNING id INTO v_sale_id;

    IF p_approval_token_id IS NOT NULL THEN
        INSERT INTO public.retail_pos_consumed_tokens (
            token_id, workspace_id, organization_id, cashier_user_id,
            action, action_payload_hash, terminal_id, sale_id
        ) VALUES (
            p_approval_token_id, p_workspace_id, p_organization_id, p_cashier_user_id,
            COALESCE(p_approval_action, 'DISCOUNT_OVERRIDE'),
            COALESCE(p_approval_action_payload_hash, 'UNKNOWN'),
            p_approval_terminal_id, v_sale_id
        );
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_norm)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        v_base := (v_item->>'base_quantity')::NUMERIC;
        v_pkg_id := NULLIF(v_item->>'package_id', '')::UUID;
        v_pack_size := (v_item->>'pack_size')::NUMERIC;
        v_pack_label := v_item->>'pack_label';
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_unit_cost := (v_item->>'unit_cost')::NUMERIC;
        v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);
        v_discount_rate := COALESCE((v_item->>'discount_rate')::NUMERIC, 0);
        v_line_total := (v_item->>'line_total')::NUMERIC;
        v_line_cost := (v_item->>'line_cost')::NUMERIC;
        v_product_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := COALESCE(v_item->>'sku', '');

        IF v_effective_location_id IS NOT NULL THEN
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand - v_base, updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND product_id = v_product_id
              AND location_id = v_effective_location_id
            RETURNING quantity_on_hand INTO v_current_stock;
        ELSE
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand - v_base, updated_at = NOW()
            WHERE workspace_id = p_workspace_id
              AND product_id = v_product_id
              AND location_id IS NULL
            RETURNING quantity_on_hand INTO v_current_stock;
        END IF;

        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, location_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, v_effective_location_id, 'SALE',
            -v_base, v_current_stock, round(v_unit_cost / v_pack_size, 2), 'SALE_RECEIPT',
            p_sale_number,
            'Sale ' || p_sale_number || ' to ' || p_customer_name
                || CASE WHEN v_pkg_id IS NOT NULL THEN ' (' || v_quantity || ' x ' || v_pack_label || ' = ' || v_base || ' base units)' ELSE '' END,
            p_cashier_user_id
        );

        INSERT INTO public.retail_sale_items (
            sale_id, product_id, product_name, sku, quantity,
            unit_price, unit_cost, tax_rate, discount_rate, line_total, line_cost,
            package_id, pack_label, pack_size, base_quantity
        ) VALUES (
            v_sale_id, v_product_id, v_product_name, v_sku, v_quantity,
            v_unit_price, v_unit_cost, v_tax_rate, v_discount_rate, v_line_total, v_line_cost,
            v_pkg_id, v_pack_label, v_pack_size, v_base
        );
    END LOOP;

    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.retail_sale_payments (sale_id, payment_method, amount, reference)
        VALUES (v_sale_id, v_payment->>'payment_method', (v_payment->>'amount')::NUMERIC, v_payment->>'reference');
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'sale_number', p_sale_number,
        'total_amount', p_total_amount,
        'payment_status', v_final_payment_status,
        'location_id', v_effective_location_id
    );
END;
$$;

-- ---------------------------------------------------------------------
-- 12. Explicit Revocations and Grants
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.execute_atomic_dispatch_stock_transfer(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_dispatch_stock_transfer(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_receive_stock_transfer(UUID, UUID, UUID, UUID, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_receive_stock_transfer(UUID, UUID, UUID, UUID, TEXT, JSONB, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_retail_sale(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_retail_sale(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, BOOLEAN, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID) TO service_role;
