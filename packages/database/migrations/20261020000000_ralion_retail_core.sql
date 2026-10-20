-- =====================================================================
-- Ralion OS — Ralion Retail Module Core Migration
-- Module: Ralion Retail (Hardware Store Management System)
-- Operating Currency Default: USD ($)
-- Pilot Customer: Proinsight
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tenant Module Entitlements Table (Exclusive Tenant Gating)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_module_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING')),
    tier TEXT NOT NULL DEFAULT 'PILOT' CHECK (tier IN ('PILOT', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE')),
    default_currency TEXT NOT NULL DEFAULT 'USD',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tenant_module_entitlements_workspace_module_unique UNIQUE (workspace_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_lookup
    ON public.tenant_module_entitlements (workspace_id, module_key, status);

ALTER TABLE public.tenant_module_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_module_entitlements_service_role" ON public.tenant_module_entitlements;
CREATE POLICY "tenant_module_entitlements_service_role"
    ON public.tenant_module_entitlements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 2. Retail Locations / Branches
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_locations_workspace_code_unique UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_retail_locations_workspace ON public.retail_locations (workspace_id);
ALTER TABLE public.retail_locations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 3. Retail Suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    payment_terms TEXT DEFAULT '30_DAYS',
    currency TEXT NOT NULL DEFAULT 'USD',
    balance_owed NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_suppliers_workspace_name_unique UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_retail_suppliers_workspace ON public.retail_suppliers (workspace_id);
ALTER TABLE public.retail_suppliers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. Retail Products (Hardware Store Catalogue)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    brand TEXT,
    supplier_id UUID REFERENCES public.retail_suppliers(id) ON DELETE SET NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'EACH',
    purchase_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    min_selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONTINUED', 'DRAFT')),
    image_url TEXT,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_products_workspace_sku_unique UNIQUE (workspace_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_retail_products_workspace ON public.retail_products (workspace_id);
CREATE INDEX IF NOT EXISTS idx_retail_products_barcode ON public.retail_products (workspace_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retail_products_category ON public.retail_products (workspace_id, category);
ALTER TABLE public.retail_products ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. Retail Stock Levels (Per Location Snapshot)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.retail_locations(id) ON DELETE CASCADE,
    quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_stock_levels_workspace_product_location UNIQUE (workspace_id, product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_levels_ws_prod ON public.retail_stock_levels (workspace_id, product_id);
ALTER TABLE public.retail_stock_levels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 6. Retail Stock Movement Ledger (Append-Only Audit Trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.retail_locations(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'RECEIVING', 'SALE', 'SALE_REFUND', 'DAMAGE_WRITE_OFF', 'THEFT_LOSS', 'COUNT_ADJUSTMENT', 'TRANSFER', 'OPENING_STOCK'
    )),
    quantity_change NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_type TEXT CHECK (reference_type IN ('PURCHASE_ORDER', 'SALE_RECEIPT', 'MANUAL_ADJUSTMENT', 'STOCKTAKE', 'INITIAL_IMPORT')),
    reference_id TEXT,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_stock_movements_ws_prod ON public.retail_stock_movements (workspace_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_stock_movements_ws_ref ON public.retail_stock_movements (workspace_id, reference_type, reference_id);
ALTER TABLE public.retail_stock_movements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 7. Retail Purchase Orders & Goods Receiving
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.retail_suppliers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED')),
    currency TEXT NOT NULL DEFAULT 'USD',
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    expected_date DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_purchase_orders_workspace_num_unique UNIQUE (workspace_id, po_number)
);

CREATE TABLE IF NOT EXISTS public.retail_po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.retail_purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    quantity_ordered NUMERIC(12, 2) NOT NULL,
    quantity_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES public.retail_purchase_orders(id) ON DELETE RESTRICT,
    receipt_number TEXT NOT NULL,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_goods_receipts_workspace_num UNIQUE (workspace_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_retail_purchase_orders_ws ON public.retail_purchase_orders (workspace_id);
ALTER TABLE public.retail_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_goods_receipts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 8. Retail Quotations & Quote Items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED')),
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    valid_until DATE,
    notes TEXT,
    converted_sale_id UUID,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_quotations_workspace_num_unique UNIQUE (workspace_id, quote_number)
);

CREATE TABLE IF NOT EXISTS public.retail_quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.retail_quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_quotations_ws ON public.retail_quotations (workspace_id);
ALTER TABLE public.retail_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_quote_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 9. Retail Cashier Shifts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_cashier_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    cashier_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cashier_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    closing_cash_actual NUMERIC(14, 2),
    expected_cash NUMERIC(14, 2),
    variance NUMERIC(14, 2),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_cashier_shifts_ws ON public.retail_cashier_shifts (workspace_id, cashier_user_id, status);
ALTER TABLE public.retail_cashier_shifts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 10. Retail Sales, Items & Payments (Shared Ledger)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    sale_number TEXT NOT NULL,
    invoice_number TEXT,
    source TEXT NOT NULL DEFAULT 'POS' CHECK (source IN ('POS', 'QUOTATION', 'INVOICE', 'MANUAL')),
    customer_id TEXT,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cashier_name TEXT,
    shift_id UUID REFERENCES public.retail_cashier_shifts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PARTIALLY_PAID', 'PENDING', 'CANCELLED', 'REFUNDED')),
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'CARD_EXTERNAL', 'BANK_TRANSFER', 'SPLIT')),
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED')),
    idempotency_key TEXT,
    notes TEXT,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_sales_workspace_sale_num UNIQUE (workspace_id, sale_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_sales_ws_idempotency
    ON public.retail_sales (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.retail_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(14, 2) NOT NULL,
    line_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.retail_sales(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    reference TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_sales_ws_created ON public.retail_sales (workspace_id, created_at DESC);
ALTER TABLE public.retail_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_sale_payments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 11. Retail Operating Expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'RENT', 'ELECTRICITY', 'WATER', 'INTERNET', 'TRANSPORT_FUEL', 'MAINTENANCE',
        'MARKETING', 'OFFICE_SUPPLIES', 'INSURANCE', 'SECURITY', 'PROFESSIONAL_SERVICES', 'OTHER'
    )),
    payee TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('RECORDED', 'APPROVED', 'PAID', 'REJECTED')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    receipt_url TEXT,
    notes TEXT,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_expenses_workspace_num UNIQUE (workspace_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_retail_expenses_ws_date ON public.retail_expenses (workspace_id, expense_date DESC);
ALTER TABLE public.retail_expenses ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 12. Retail Employees & Confidential Payroll
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'SALES',
    employment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED')),
    employment_type TEXT NOT NULL DEFAULT 'FULL_TIME' CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'HOURLY')),
    base_salary_monthly NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    pay_frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (pay_frequency IN ('MONTHLY', 'BI_WEEKLY', 'WEEKLY')),
    payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    bank_name TEXT,
    bank_account_masked TEXT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PAID')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payment_recorded_at TIMESTAMPTZ,
    notes TEXT,
    is_pilot_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.retail_payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.retail_employees(id) ON DELETE RESTRICT,
    employee_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    base_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    deductions_statutory NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    deductions_other NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gross_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retail_employees_ws ON public.retail_employees (workspace_id);
CREATE INDEX IF NOT EXISTS idx_retail_payroll_runs_ws ON public.retail_payroll_runs (workspace_id, period_start DESC);
ALTER TABLE public.retail_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_payslips ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 13. Retail Settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL DEFAULT 'Hardware Store',
    default_currency TEXT NOT NULL DEFAULT 'USD',
    tax_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    enable_negative_stock BOOLEAN NOT NULL DEFAULT false,
    receipt_header TEXT,
    receipt_footer TEXT DEFAULT 'Thank you for your business!',
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_settings_workspace_unique UNIQUE (workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_retail_settings_ws ON public.retail_settings (workspace_id);
ALTER TABLE public.retail_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- 14. Service Role Policies for Retail Tables
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'tenant_module_entitlements',
        'retail_locations',
        'retail_suppliers',
        'retail_products',
        'retail_stock_levels',
        'retail_stock_movements',
        'retail_purchase_orders',
        'retail_po_items',
        'retail_goods_receipts',
        'retail_quotations',
        'retail_quote_items',
        'retail_cashier_shifts',
        'retail_sales',
        'retail_sale_items',
        'retail_sale_payments',
        'retail_expenses',
        'retail_employees',
        'retail_payroll_runs',
        'retail_payslips',
        'retail_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 15. Real PostgreSQL Atomic Transaction Functions (Row-Level Locking)
-- ---------------------------------------------------------------------

-- Function 1: Atomic Retail Sale & POS Checkout with Row-Level Locking
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

-- Function 2: Atomic Goods Receipt Posting (Row-Level Locking & Asset Capitalization)
CREATE OR REPLACE FUNCTION public.execute_atomic_goods_receipt(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_po_id UUID,
    p_receipt_number TEXT,
    p_received_by UUID,
    p_notes TEXT,
    p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt_id UUID;
    v_po_status TEXT;
    v_po_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_quantity_received NUMERIC;
    v_unit_cost NUMERIC;
    v_current_stock NUMERIC;
    v_stock_id UUID;
    v_po_item_id UUID;
    v_all_received BOOLEAN := true;
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

    -- 1. Lock Purchase Order FOR UPDATE
    SELECT status, po_number INTO v_po_status, v_po_number
    FROM public.retail_purchase_orders
    WHERE id = p_po_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_po_status IS NULL THEN
        RAISE EXCEPTION 'PURCHASE_ORDER_NOT_FOUND: PO % does not exist in workspace', p_po_id;
    END IF;

    IF v_po_status IN ('CANCELLED', 'RECEIVED') THEN
        RAISE EXCEPTION 'INVALID_PO_STATUS: Cannot receive goods against a % PO', v_po_status;
    END IF;

    -- 2. Create Goods Receipt Header
    INSERT INTO public.retail_goods_receipts (
        organization_id, workspace_id, purchase_order_id, receipt_number,
        received_by, notes
    ) VALUES (
        p_organization_id, p_workspace_id, p_po_id, p_receipt_number,
        p_received_by, p_notes
    ) RETURNING id INTO v_receipt_id;

    -- 3. For each received item: lock stock row, increment stock, append RECEIVING movement, update PO item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity_received := (v_item->>'quantity_received')::NUMERIC;
        v_unit_cost := (v_item->>'unit_cost')::NUMERIC;

        IF v_quantity_received <= 0 THEN
            CONTINUE;
        END IF;

        -- Lock PO Item
        SELECT id INTO v_po_item_id
        FROM public.retail_po_items
        WHERE purchase_order_id = p_po_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_po_item_id IS NOT NULL THEN
            UPDATE public.retail_po_items
            SET quantity_received = quantity_received + v_quantity_received
            WHERE id = v_po_item_id;
        END IF;

        -- Lock and increment stock level
        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO public.retail_stock_levels (
                organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved
            ) VALUES (
                p_organization_id, p_workspace_id, v_product_id, v_quantity_received, 0
            ) RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
        ELSE
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_quantity_received,
                updated_at = NOW()
            WHERE id = v_stock_id
            RETURNING quantity_on_hand INTO v_current_stock;
        END IF;

        -- Append to stock movements ledger (capitalizes inventory asset, does NOT create OPEX)
        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, 'RECEIVING',
            v_quantity_received, v_current_stock, v_unit_cost, 'PURCHASE_ORDER',
            v_po_number, 'Goods received for PO ' || v_po_number, p_received_by
        );
    END LOOP;

    -- 4. Evaluate PO completion
    IF EXISTS (
        SELECT 1 FROM public.retail_po_items
        WHERE purchase_order_id = p_po_id AND quantity_received < quantity_ordered
    ) THEN
        UPDATE public.retail_purchase_orders
        SET status = 'PARTIAL_RECEIVED', updated_at = NOW()
        WHERE id = p_po_id;
    ELSE
        UPDATE public.retail_purchase_orders
        SET status = 'RECEIVED', updated_at = NOW()
        WHERE id = p_po_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', p_receipt_number
    );
END;
$$;

-- Function 3: Atomic Quotation Conversion to Sale (Row-Level Locking)
CREATE OR REPLACE FUNCTION public.execute_atomic_quotation_conversion(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_quotation_id UUID,
    p_cashier_user_id UUID,
    p_cashier_name TEXT,
    p_payment_method TEXT,
    p_shift_id UUID,
    p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quote_status TEXT;
    v_quote_number TEXT;
    v_customer_id TEXT;
    v_customer_name TEXT;
    v_subtotal NUMERIC;
    v_tax_total NUMERIC;
    v_discount_total NUMERIC;
    v_total_amount NUMERIC;
    v_currency TEXT;
    v_total_cost NUMERIC := 0;
    v_sale_number TEXT;
    v_sale_id UUID;
    v_items JSONB := '[]'::JSONB;
    v_payments JSONB := '[]'::JSONB;
    v_qitem RECORD;
    v_sale_result JSONB;
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

    -- 1. Lock Quotation FOR UPDATE
    SELECT status, quote_number, customer_id, customer_name,
           subtotal, tax_total, discount_total, total_amount, currency
    INTO v_quote_status, v_quote_number, v_customer_id, v_customer_name,
         v_subtotal, v_tax_total, v_discount_total, v_total_amount, v_currency
    FROM public.retail_quotations
    WHERE id = p_quotation_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_quote_status IS NULL THEN
        RAISE EXCEPTION 'QUOTATION_NOT_FOUND: Quote % does not exist in workspace', p_quotation_id;
    END IF;

    IF v_quote_status = 'CONVERTED' THEN
        RAISE EXCEPTION 'QUOTATION_ALREADY_CONVERTED: Quote % has already been converted to a sale', v_quote_number;
    END IF;

    -- 2. Build items payload from quote items
    FOR v_qitem IN
        SELECT qi.product_id, qi.description, qi.quantity, qi.unit_price,
               qi.unit_cost, qi.tax_rate, qi.discount_rate, qi.line_total,
               p.name AS product_name, p.sku
        FROM public.retail_quote_items qi
        JOIN public.retail_products p ON p.id = qi.product_id
        WHERE qi.quotation_id = p_quotation_id
    LOOP
        v_total_cost := v_total_cost + (v_qitem.quantity * v_qitem.unit_cost);
        v_items := v_items || jsonb_build_object(
            'product_id', v_qitem.product_id,
            'product_name', v_qitem.product_name,
            'sku', v_qitem.sku,
            'quantity', v_qitem.quantity,
            'unit_price', v_qitem.unit_price,
            'unit_cost', v_qitem.unit_cost,
            'tax_rate', v_qitem.tax_rate,
            'discount_rate', v_qitem.discount_rate,
            'line_total', v_qitem.line_total,
            'line_cost', (v_qitem.quantity * v_qitem.unit_cost)
        );
    END LOOP;

    -- 3. Build payment payload
    v_payments := jsonb_build_array(jsonb_build_object(
        'payment_method', p_payment_method,
        'amount', v_total_amount,
        'reference', 'Quote ' || v_quote_number
    ));

    v_sale_number := 'SALE-Q-' || v_quote_number;

    -- 4. Invoke atomic sale function with row-level locks
    v_sale_result := public.execute_atomic_retail_sale(
        p_organization_id, p_workspace_id, v_sale_number, 'INV-' || v_quote_number,
        'QUOTATION', v_customer_id, v_customer_name, p_cashier_user_id,
        p_cashier_name, p_shift_id, v_currency, v_subtotal, v_tax_total,
        v_discount_total, v_total_amount, v_total_cost, p_payment_method,
        'PAID', p_idempotency_key, 'Converted from Quote ' || v_quote_number,
        v_items, v_payments, false
    );

    v_sale_id := (v_sale_result->>'sale_id')::UUID;

    -- 5. Atomically update Quotation status
    UPDATE public.retail_quotations
    SET status = 'CONVERTED',
        converted_sale_id = v_sale_id,
        updated_at = NOW()
    WHERE id = p_quotation_id;

    RETURN jsonb_build_object(
        'success', true,
        'quotation_id', p_quotation_id,
        'sale_id', v_sale_id,
        'sale_number', v_sale_number
    );
END;
$$;

-- Function 4: Atomic Sale Refund (Row-Level Locking & Restocking)
CREATE OR REPLACE FUNCTION public.execute_atomic_sale_refund(
    p_organization_id UUID,
    p_workspace_id UUID,
    p_sale_id UUID,
    p_refund_reason TEXT,
    p_restock BOOLEAN,
    p_refunded_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_status TEXT;
    v_sale_number TEXT;
    v_customer_name TEXT;
    v_item RECORD;
    v_current_stock NUMERIC;
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

    -- 1. Lock Sale FOR UPDATE
    SELECT status, sale_number, customer_name
    INTO v_sale_status, v_sale_number, v_customer_name
    FROM public.retail_sales
    WHERE id = p_sale_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_sale_status IS NULL THEN
        RAISE EXCEPTION 'SALE_NOT_FOUND: Sale % does not exist in workspace', p_sale_id;
    END IF;

    IF v_sale_status = 'REFUNDED' THEN
        RAISE EXCEPTION 'SALE_ALREADY_REFUNDED: Sale % is already refunded', v_sale_number;
    END IF;

    -- 2. Restock inventory if requested
    IF p_restock THEN
        FOR v_item IN
            SELECT product_id, quantity, unit_cost
            FROM public.retail_sale_items
            WHERE sale_id = p_sale_id
        LOOP
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_item.quantity,
                updated_at = NOW()
            WHERE workspace_id = p_workspace_id AND product_id = v_item.product_id
            RETURNING quantity_on_hand INTO v_current_stock;

            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, movement_type,
                quantity_change, balance_after, unit_cost, reference_type,
                reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_item.product_id, 'SALE_REFUND',
                v_item.quantity, v_current_stock, v_item.unit_cost, 'SALE_RECEIPT',
                v_sale_number, 'Refund for ' || v_sale_number || ': ' || p_refund_reason,
                p_refunded_by
            );
        END LOOP;
    END IF;

    -- 3. Update Sale status
    UPDATE public.retail_sales
    SET status = 'REFUNDED',
        payment_status = 'REFUNDED',
        notes = COALESCE(notes || '; ', '') || 'Refunded: ' || p_refund_reason,
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'sale_number', v_sale_number,
        'restocked', p_restock
    );
END;
$$;

-- Security hardening: Revoke execute from public and anon on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.execute_atomic_retail_sale FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_atomic_goods_receipt FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.execute_atomic_sale_refund FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.execute_atomic_retail_sale TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_goods_receipt TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_sale_refund TO service_role, authenticated;


