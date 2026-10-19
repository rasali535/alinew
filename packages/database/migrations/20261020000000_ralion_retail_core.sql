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
    payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD_EXTERNAL', 'BANK_TRANSFER', 'SPLIT')),
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
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
-- 14. Service Role Policies for Retail Tables
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
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
