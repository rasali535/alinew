-- =====================================================================
-- Ralion Retail — Catalogue hierarchy, supplier relationships, tax codes
-- and stock packaging (additive migration)
--
-- Safety properties
--   * Purely additive: no existing column/table is dropped or retyped.
--   * Idempotent: safe to run more than once (CREATE ... IF NOT EXISTS,
--     guarded constraints, ON CONFLICT DO NOTHING backfills).
--   * Backfill never deletes or overwrites existing values; it only fills
--     NULL foreign keys derived from the legacy category / subcategory /
--     brand / supplier_id / vat_rate columns, which are left untouched.
--   * Every new table has RLS enabled, a service_role-only policy and no
--     privileges for anon / authenticated / PUBLIC.
--   * Every privileged RPC is executable by service_role only.
--   * No rollback SQL lives in this directory (rollback is a documented,
--     manually reviewed procedure in docs/retail-catalogue-packaging.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tax codes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_tax_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    rate NUMERIC(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_tax_codes_workspace_code_unique UNIQUE (workspace_id, code)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_tax_codes_one_default
    ON public.retail_tax_codes (workspace_id) WHERE is_default;

-- ---------------------------------------------------------------------
-- 2. Departments -> Subdepartments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_departments_ws_name
    ON public.retail_departments (workspace_id, lower(name));

CREATE TABLE IF NOT EXISTS public.retail_subdepartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.retail_departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_subdepartments_id_department_unique UNIQUE (id, department_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_subdepartments_dept_name
    ON public.retail_subdepartments (department_id, lower(name));

-- ---------------------------------------------------------------------
-- 3. Brands
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_brands_ws_name
    ON public.retail_brands (workspace_id, lower(name));

-- ---------------------------------------------------------------------
-- 4. Product columns (all nullable; legacy columns stay authoritative
--    until every consumer has moved over)
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_products ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.retail_departments(id) ON DELETE SET NULL;
ALTER TABLE public.retail_products ADD COLUMN IF NOT EXISTS subdepartment_id UUID;
ALTER TABLE public.retail_products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.retail_brands(id) ON DELETE SET NULL;
ALTER TABLE public.retail_products ADD COLUMN IF NOT EXISTS tax_code_id UUID REFERENCES public.retail_tax_codes(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'retail_products_subdepartment_fk') THEN
        -- Composite FK guarantees the subdepartment belongs to the product's department.
        ALTER TABLE public.retail_products
            ADD CONSTRAINT retail_products_subdepartment_fk
            FOREIGN KEY (subdepartment_id, department_id)
            REFERENCES public.retail_subdepartments (id, department_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_retail_products_department ON public.retail_products (workspace_id, department_id);
CREATE INDEX IF NOT EXISTS idx_retail_products_subdepartment ON public.retail_products (workspace_id, subdepartment_id);
CREATE INDEX IF NOT EXISTS idx_retail_products_brand ON public.retail_products (workspace_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_retail_products_sku_lower ON public.retail_products (workspace_id, lower(sku));

-- ---------------------------------------------------------------------
-- 5. Product <-> supplier relationships (many suppliers per product)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.retail_suppliers(id) ON DELETE CASCADE,
    supplier_sku TEXT,
    is_preferred BOOLEAN NOT NULL DEFAULT false,
    last_cost NUMERIC(14, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_product_suppliers_unique UNIQUE (product_id, supplier_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_retail_product_suppliers_one_preferred
    ON public.retail_product_suppliers (product_id) WHERE is_preferred;
CREATE INDEX IF NOT EXISTS idx_retail_product_suppliers_supplier
    ON public.retail_product_suppliers (workspace_id, supplier_id);

-- ---------------------------------------------------------------------
-- 6. Packaging variants (base stock unit + conversion factor)
--    Stock is ALWAYS held in base units (retail_stock_levels).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_product_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'BOTH' CHECK (kind IN ('SALES', 'PURCHASE', 'BOTH')),
    base_units_per_pack NUMERIC(14, 4) NOT NULL CHECK (base_units_per_pack > 0),
    barcode TEXT,
    selling_price NUMERIC(14, 2) CHECK (selling_price IS NULL OR selling_price >= 0),
    purchase_cost NUMERIC(14, 2) CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT retail_product_packages_label_unique UNIQUE (product_id, label)
);
CREATE INDEX IF NOT EXISTS idx_retail_product_packages_product ON public.retail_product_packages (workspace_id, product_id);
CREATE INDEX IF NOT EXISTS idx_retail_product_packages_barcode ON public.retail_product_packages (workspace_id, barcode) WHERE barcode IS NOT NULL;

-- ---------------------------------------------------------------------
-- 7. Pack-aware line columns on existing transactional tables
-- ---------------------------------------------------------------------
ALTER TABLE public.retail_sale_items ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE RESTRICT;
ALTER TABLE public.retail_sale_items ADD COLUMN IF NOT EXISTS pack_label TEXT;
ALTER TABLE public.retail_sale_items ADD COLUMN IF NOT EXISTS pack_size NUMERIC(14, 4);
ALTER TABLE public.retail_sale_items ADD COLUMN IF NOT EXISTS base_quantity NUMERIC(12, 2);

ALTER TABLE public.retail_quote_items ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE RESTRICT;
ALTER TABLE public.retail_quote_items ADD COLUMN IF NOT EXISTS pack_label TEXT;
ALTER TABLE public.retail_quote_items ADD COLUMN IF NOT EXISTS pack_size NUMERIC(14, 4);

ALTER TABLE public.retail_po_items ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.retail_product_packages(id) ON DELETE RESTRICT;
ALTER TABLE public.retail_po_items ADD COLUMN IF NOT EXISTS pack_label TEXT;
ALTER TABLE public.retail_po_items ADD COLUMN IF NOT EXISTS pack_size NUMERIC(14, 4) NOT NULL DEFAULT 1 CHECK (pack_size > 0);

CREATE INDEX IF NOT EXISTS idx_retail_sale_items_package ON public.retail_sale_items (package_id) WHERE package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retail_quote_items_package ON public.retail_quote_items (package_id) WHERE package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retail_po_items_package ON public.retail_po_items (package_id) WHERE package_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 8. Goods receipt line ledger (auditable partial receipts)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retail_goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    goods_receipt_id UUID NOT NULL REFERENCES public.retail_goods_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES public.retail_po_items(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.retail_products(id) ON DELETE RESTRICT,
    quantity_received NUMERIC(12, 2) NOT NULL CHECK (quantity_received > 0),
    pack_size NUMERIC(14, 4) NOT NULL DEFAULT 1,
    base_quantity NUMERIC(12, 2) NOT NULL CHECK (base_quantity > 0),
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_retail_grn_items_receipt ON public.retail_goods_receipt_items (goods_receipt_id);

-- ---------------------------------------------------------------------
-- 9. RLS + privileges for every new table (service_role only)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'retail_tax_codes', 'retail_departments', 'retail_subdepartments', 'retail_brands',
        'retail_product_suppliers', 'retail_product_packages', 'retail_goods_receipt_items'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 10. Integrity triggers
-- ---------------------------------------------------------------------

-- 10a. Barcodes are unique per workspace ACROSS products and packages.
--      Enforced only for new / changed barcodes so legacy duplicates cannot
--      break the migration; a per-barcode advisory lock closes the race.
CREATE OR REPLACE FUNCTION public.retail_enforce_barcode_uniqueness()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.barcode IS NULL OR btrim(NEW.barcode) = '' THEN
        NEW.barcode := NULL;
        RETURN NEW;
    END IF;
    NEW.barcode := btrim(NEW.barcode);
    IF TG_OP = 'UPDATE' AND NEW.barcode IS NOT DISTINCT FROM OLD.barcode THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workspace_id::text || '|' || NEW.barcode, 0));

    IF EXISTS (
        SELECT 1 FROM public.retail_products
        WHERE workspace_id = NEW.workspace_id AND barcode = NEW.barcode
          AND (TG_TABLE_NAME <> 'retail_products' OR id <> NEW.id)
    ) OR EXISTS (
        SELECT 1 FROM public.retail_product_packages
        WHERE workspace_id = NEW.workspace_id AND barcode = NEW.barcode
          AND (TG_TABLE_NAME <> 'retail_product_packages' OR id <> NEW.id)
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_BARCODE: Barcode % is already assigned in this workspace.', NEW.barcode
            USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retail_products_barcode_unique ON public.retail_products;
CREATE TRIGGER trg_retail_products_barcode_unique
    BEFORE INSERT OR UPDATE OF barcode ON public.retail_products
    FOR EACH ROW EXECUTE FUNCTION public.retail_enforce_barcode_uniqueness();

DROP TRIGGER IF EXISTS trg_retail_packages_barcode_unique ON public.retail_product_packages;
CREATE TRIGGER trg_retail_packages_barcode_unique
    BEFORE INSERT OR UPDATE OF barcode ON public.retail_product_packages
    FOR EACH ROW EXECUTE FUNCTION public.retail_enforce_barcode_uniqueness();

-- 10b. Catalogue references must belong to the product's own workspace.
CREATE OR REPLACE FUNCTION public.retail_products_catalogue_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.department_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.department_id IS DISTINCT FROM OLD.department_id)
       AND NOT EXISTS (SELECT 1 FROM public.retail_departments WHERE id = NEW.department_id AND workspace_id = NEW.workspace_id) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: department does not belong to workspace %', NEW.workspace_id;
    END IF;
    IF NEW.subdepartment_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.subdepartment_id IS DISTINCT FROM OLD.subdepartment_id)
       AND NOT EXISTS (SELECT 1 FROM public.retail_subdepartments WHERE id = NEW.subdepartment_id AND workspace_id = NEW.workspace_id) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: subdepartment does not belong to workspace %', NEW.workspace_id;
    END IF;
    IF NEW.brand_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.brand_id IS DISTINCT FROM OLD.brand_id)
       AND NOT EXISTS (SELECT 1 FROM public.retail_brands WHERE id = NEW.brand_id AND workspace_id = NEW.workspace_id) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: brand does not belong to workspace %', NEW.workspace_id;
    END IF;
    IF NEW.tax_code_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.tax_code_id IS DISTINCT FROM OLD.tax_code_id)
       AND NOT EXISTS (SELECT 1 FROM public.retail_tax_codes WHERE id = NEW.tax_code_id AND workspace_id = NEW.workspace_id) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: tax code does not belong to workspace %', NEW.workspace_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retail_products_catalogue_scope ON public.retail_products;
CREATE TRIGGER trg_retail_products_catalogue_scope
    BEFORE INSERT OR UPDATE OF department_id, subdepartment_id, brand_id, tax_code_id ON public.retail_products
    FOR EACH ROW EXECUTE FUNCTION public.retail_products_catalogue_scope();

-- 10c. product_suppliers / packages must match the product's workspace
CREATE OR REPLACE FUNCTION public.retail_child_workspace_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.retail_products WHERE id = NEW.product_id AND workspace_id = NEW.workspace_id) THEN
        RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: product % does not belong to workspace %', NEW.product_id, NEW.workspace_id;
    END IF;
    IF TG_TABLE_NAME = 'retail_product_suppliers' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.retail_suppliers WHERE id = NEW.supplier_id AND workspace_id = NEW.workspace_id
        ) THEN
            RAISE EXCEPTION 'CROSS_TENANT_REFERENCE: supplier % does not belong to workspace %', NEW.supplier_id, NEW.workspace_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retail_product_suppliers_scope ON public.retail_product_suppliers;
CREATE TRIGGER trg_retail_product_suppliers_scope
    BEFORE INSERT OR UPDATE OF product_id, supplier_id, workspace_id ON public.retail_product_suppliers
    FOR EACH ROW EXECUTE FUNCTION public.retail_child_workspace_scope();

DROP TRIGGER IF EXISTS trg_retail_packages_scope ON public.retail_product_packages;
CREATE TRIGGER trg_retail_packages_scope
    BEFORE INSERT OR UPDATE OF product_id, workspace_id ON public.retail_product_packages
    FOR EACH ROW EXECUTE FUNCTION public.retail_child_workspace_scope();

-- 10d. Conversion factors are frozen once any historical line references the pack.
--      To change a ratio: deactivate the pack and create a new one.
CREATE OR REPLACE FUNCTION public.retail_packages_conversion_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
        RAISE EXCEPTION 'PACK_PRODUCT_IMMUTABLE: a package cannot be moved to another product.';
    END IF;
    IF NEW.base_units_per_pack IS DISTINCT FROM OLD.base_units_per_pack AND (
        EXISTS (SELECT 1 FROM public.retail_sale_items WHERE package_id = OLD.id)
        OR EXISTS (SELECT 1 FROM public.retail_quote_items WHERE package_id = OLD.id)
        OR EXISTS (SELECT 1 FROM public.retail_po_items WHERE package_id = OLD.id)
    ) THEN
        RAISE EXCEPTION 'PACK_CONVERSION_LOCKED: pack % is referenced by historical sales, quotes or purchase orders; deactivate it and create a new pack instead.', OLD.label
            USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_retail_packages_conversion_guard ON public.retail_product_packages;
CREATE TRIGGER trg_retail_packages_conversion_guard
    BEFORE UPDATE ON public.retail_product_packages
    FOR EACH ROW EXECUTE FUNCTION public.retail_packages_conversion_guard();

-- ---------------------------------------------------------------------
-- 11. Safe backfill from legacy columns (fills NULLs only, never deletes)
-- ---------------------------------------------------------------------
INSERT INTO public.retail_departments (organization_id, workspace_id, name, code)
SELECT DISTINCT ON (p.workspace_id, lower(btrim(p.category)))
       p.organization_id, p.workspace_id, btrim(p.category),
       upper(regexp_replace(btrim(p.category), '[^A-Za-z0-9]+', '_', 'g'))
FROM public.retail_products p
WHERE btrim(coalesce(p.category, '')) <> ''
ORDER BY p.workspace_id, lower(btrim(p.category)), p.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.retail_subdepartments (organization_id, workspace_id, department_id, name, code)
SELECT DISTINCT ON (d.id, lower(btrim(p.subcategory)))
       p.organization_id, p.workspace_id, d.id, btrim(p.subcategory),
       upper(regexp_replace(btrim(p.subcategory), '[^A-Za-z0-9]+', '_', 'g'))
FROM public.retail_products p
JOIN public.retail_departments d
  ON d.workspace_id = p.workspace_id AND lower(d.name) = lower(btrim(p.category))
WHERE btrim(coalesce(p.subcategory, '')) <> ''
ORDER BY d.id, lower(btrim(p.subcategory)), p.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.retail_brands (organization_id, workspace_id, name)
SELECT DISTINCT ON (p.workspace_id, lower(btrim(p.brand)))
       p.organization_id, p.workspace_id, btrim(p.brand)
FROM public.retail_products p
WHERE btrim(coalesce(p.brand, '')) <> ''
ORDER BY p.workspace_id, lower(btrim(p.brand)), p.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.retail_tax_codes (organization_id, workspace_id, code, name, rate)
SELECT DISTINCT ON (p.workspace_id, p.vat_rate)
       p.organization_id, p.workspace_id,
       CASE WHEN p.vat_rate = 0 THEN 'ZERO' ELSE 'VAT_' || replace(trim(trailing '.' FROM trim(trailing '0' FROM p.vat_rate::text)), '.', '_') END,
       CASE WHEN p.vat_rate = 0 THEN 'Zero-rated' ELSE 'VAT ' || p.vat_rate::text || '%' END,
       p.vat_rate
FROM public.retail_products p
WHERE p.vat_rate IS NOT NULL
ORDER BY p.workspace_id, p.vat_rate, p.created_at
ON CONFLICT DO NOTHING;

UPDATE public.retail_products p
SET department_id = d.id
FROM public.retail_departments d
WHERE p.department_id IS NULL
  AND d.workspace_id = p.workspace_id
  AND lower(d.name) = lower(btrim(p.category));

UPDATE public.retail_products p
SET subdepartment_id = s.id
FROM public.retail_subdepartments s
WHERE p.subdepartment_id IS NULL
  AND p.department_id IS NOT NULL
  AND s.department_id = p.department_id
  AND lower(s.name) = lower(btrim(coalesce(p.subcategory, '')));

UPDATE public.retail_products p
SET brand_id = b.id
FROM public.retail_brands b
WHERE p.brand_id IS NULL
  AND b.workspace_id = p.workspace_id
  AND lower(b.name) = lower(btrim(coalesce(p.brand, '')));

UPDATE public.retail_products p
SET tax_code_id = t.id
FROM public.retail_tax_codes t
WHERE p.tax_code_id IS NULL
  AND t.workspace_id = p.workspace_id
  AND t.rate = p.vat_rate;

INSERT INTO public.retail_product_suppliers (organization_id, workspace_id, product_id, supplier_id, is_preferred)
SELECT p.organization_id, p.workspace_id, p.id, p.supplier_id, true
FROM public.retail_products p
WHERE p.supplier_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. Preferred-supplier switch (atomic; keeps legacy supplier_id in sync)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retail_set_preferred_supplier(
    p_workspace_id UUID,
    p_product_id UUID,
    p_supplier_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM retail_product_suppliers
                   WHERE workspace_id = p_workspace_id AND product_id = p_product_id AND supplier_id = p_supplier_id) THEN
        RAISE EXCEPTION 'PRODUCT_SUPPLIER_NOT_FOUND: link the supplier to the product first.';
    END IF;
    UPDATE retail_product_suppliers SET is_preferred = false, updated_at = NOW()
     WHERE workspace_id = p_workspace_id AND product_id = p_product_id AND is_preferred AND supplier_id <> p_supplier_id;
    UPDATE retail_product_suppliers SET is_preferred = true, updated_at = NOW()
     WHERE workspace_id = p_workspace_id AND product_id = p_product_id AND supplier_id = p_supplier_id;
    UPDATE retail_products SET supplier_id = p_supplier_id, updated_at = NOW()
     WHERE workspace_id = p_workspace_id AND id = p_product_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 13. Unified catalogue search (cashier-safe projection: NO cost columns)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retail_search_catalogue(
    p_workspace_id UUID,
    p_query TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_subdepartment_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_supplier_id UUID DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT false,
    p_limit INTEGER DEFAULT 40,
    p_channel TEXT DEFAULT 'SALES'
) RETURNS TABLE (
    product_id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    brand TEXT,
    department_id UUID,
    department_name TEXT,
    subdepartment_id UUID,
    subdepartment_name TEXT,
    preferred_supplier_name TEXT,
    unit_of_measure TEXT,
    selling_price NUMERIC,
    tax_rate NUMERIC,
    stock_on_hand NUMERIC,
    status TEXT,
    matched_pack_id UUID,
    match_rank INTEGER,
    packs JSONB
)
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH q AS (
        SELECT
            NULLIF(btrim(coalesce(p_query, '')), '') AS raw,
            COALESCE(
                (SELECT array_agg(
                    replace(replace(replace(lower(t), '\', '\\'), '%', '\%'), '_', '\_'))
                 FROM unnest(regexp_split_to_array(btrim(coalesce(p_query, '')), '\s+')) AS t
                 WHERE t <> ''),
                ARRAY[]::TEXT[]
            ) AS tokens
    ),
    base AS (
        SELECT
            p.id, p.name, p.sku, p.barcode,
            COALESCE(b.name, p.brand) AS brand_name,
            p.department_id, d.name AS dept_name,
            p.subdepartment_id, sd.name AS subdept_name,
            p.unit_of_measure, p.selling_price,
            COALESCE(tc.rate, p.vat_rate) AS eff_tax_rate,
            COALESCE(sl.qoh, 0) AS qoh,
            p.status,
            pref.name AS pref_supplier,
            sup.names AS supplier_names,
            pk.packs_json, pk.pack_text
        FROM retail_products p
        LEFT JOIN retail_departments d ON d.id = p.department_id
        LEFT JOIN retail_subdepartments sd ON sd.id = p.subdepartment_id
        LEFT JOIN retail_brands b ON b.id = p.brand_id
        LEFT JOIN retail_tax_codes tc ON tc.id = p.tax_code_id
        LEFT JOIN LATERAL (
            SELECT sum(quantity_on_hand) AS qoh FROM retail_stock_levels s
            WHERE s.workspace_id = p.workspace_id AND s.product_id = p.id
        ) sl ON true
        LEFT JOIN LATERAL (
            SELECT s.name FROM retail_product_suppliers ps
            JOIN retail_suppliers s ON s.id = ps.supplier_id
            WHERE ps.product_id = p.id AND ps.is_preferred LIMIT 1
        ) pref ON true
        LEFT JOIN LATERAL (
            SELECT string_agg(lower(s.name || ' ' || coalesce(ps.supplier_sku, '')), ' ') AS names
            FROM retail_product_suppliers ps
            JOIN retail_suppliers s ON s.id = ps.supplier_id
            WHERE ps.product_id = p.id
        ) sup ON true
        LEFT JOIN LATERAL (
            SELECT
                jsonb_agg(jsonb_build_object(
                    'id', k.id,
                    'label', k.label,
                    'base_units_per_pack', k.base_units_per_pack,
                    'barcode', k.barcode,
                    'selling_price', COALESCE(k.selling_price, round(p.selling_price * k.base_units_per_pack, 2))
                ) ORDER BY k.base_units_per_pack) AS packs_json,
                string_agg(lower(k.label || ' ' || coalesce(k.barcode, '')), ' ') AS pack_text
            FROM retail_product_packages k
            WHERE k.product_id = p.id AND k.is_active
              AND k.kind IN ('BOTH', CASE WHEN p_channel = 'PURCHASE' THEN 'PURCHASE' ELSE 'SALES' END)
        ) pk ON true
        WHERE p.workspace_id = p_workspace_id
          AND (p.status = 'ACTIVE' OR (p_channel = 'PURCHASE' AND p.status = 'DRAFT'))
          AND (p_department_id IS NULL OR p.department_id = p_department_id)
          AND (p_subdepartment_id IS NULL OR p.subdepartment_id = p_subdepartment_id)
          AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
          AND (p_supplier_id IS NULL OR EXISTS (
                SELECT 1 FROM retail_product_suppliers ps
                WHERE ps.product_id = p.id AND ps.supplier_id = p_supplier_id))
    ),
    hay AS (
        SELECT base.*,
            lower(concat_ws(' ', base.name, base.sku, base.barcode, base.brand_name, base.dept_name,
                            base.subdept_name, base.supplier_names, base.pack_text)) AS haystack
        FROM base
    )
    SELECT
        h.id, h.name, h.sku, h.barcode, h.brand_name,
        h.department_id, h.dept_name, h.subdepartment_id, h.subdept_name,
        h.pref_supplier, h.unit_of_measure, h.selling_price, h.eff_tax_rate, h.qoh, h.status,
        (SELECT k.id FROM retail_product_packages k
          WHERE k.product_id = h.id AND k.is_active AND q.raw IS NOT NULL AND k.barcode = q.raw
            AND k.kind IN ('BOTH', CASE WHEN p_channel = 'PURCHASE' THEN 'PURCHASE' ELSE 'SALES' END) LIMIT 1),
        CASE
            WHEN q.raw IS NULL THEN 3
            WHEN h.barcode = q.raw OR EXISTS (SELECT 1 FROM retail_product_packages k
                                              WHERE k.product_id = h.id AND k.is_active AND k.barcode = q.raw
                                                AND k.kind IN ('BOTH', CASE WHEN p_channel = 'PURCHASE' THEN 'PURCHASE' ELSE 'SALES' END)) THEN 0
            WHEN lower(h.sku) = lower(q.raw) THEN 1
            WHEN lower(h.name) LIKE replace(replace(replace(lower(q.raw), '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\' THEN 2
            ELSE 3
        END,
        COALESCE(h.packs_json, '[]'::jsonb)
    FROM hay h CROSS JOIN q
    WHERE (p_in_stock_only IS NOT TRUE OR h.qoh > 0)
      AND NOT EXISTS (
            SELECT 1 FROM unnest(q.tokens) AS t
            WHERE h.haystack NOT LIKE '%' || t || '%' ESCAPE '\')
    ORDER BY 17, h.name
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 200);
$$;

-- ---------------------------------------------------------------------
-- 14. Pack-aware atomic sale (same signature as the hardened version).
--     Server resolves pack size from the database and IGNORES any client
--     base quantity. Stock is checked on the AGGREGATE need per product
--     (carton + singles of the same product can no longer oversell) and
--     rows are locked in product_id order to avoid deadlocks.
-- ---------------------------------------------------------------------
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

    -- Lock stock rows (ordered) and check AGGREGATE demand per product
    FOR v_product_id, v_need IN
        SELECT (e->>'product_id')::UUID, sum((e->>'base_quantity')::NUMERIC)
        FROM jsonb_array_elements(v_norm) e
        GROUP BY 1 ORDER BY 1
    LOOP
        SELECT name, sku INTO v_product_name, v_sku FROM public.retail_products WHERE id = v_product_id;

        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved)
            VALUES (p_organization_id, p_workspace_id, v_product_id, 0, 0)
            RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
        END IF;

        IF v_current_stock < v_need AND NOT v_allow_negative THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % (SKU %) requested %, available %', v_product_name, v_sku, v_need, v_current_stock;
        END IF;
    END LOOP;

    INSERT INTO public.retail_sales (
        organization_id, workspace_id, sale_number, invoice_number, source,
        customer_id, customer_name, cashier_user_id, cashier_name, shift_id,
        status, currency, subtotal, tax_total, discount_total, total_amount,
        total_cost, payment_method, payment_status, idempotency_key, notes, is_pilot_demo
    ) VALUES (
        p_organization_id, p_workspace_id, p_sale_number, p_invoice_number, p_source,
        p_customer_id, p_customer_name, p_cashier_user_id, p_cashier_name, p_shift_id,
        'COMPLETED', p_currency, p_subtotal, p_tax_total, p_discount_total, p_total_amount,
        p_total_cost, p_payment_method, v_final_payment_status, p_idempotency_key, p_notes, p_is_pilot_demo
    ) RETURNING id INTO v_sale_id;

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

        UPDATE public.retail_stock_levels
        SET quantity_on_hand = quantity_on_hand - v_base, updated_at = NOW()
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        RETURNING quantity_on_hand INTO v_current_stock;

        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, 'SALE',
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

    RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id, 'sale_number', p_sale_number);
END;
$$;

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

-- ---------------------------------------------------------------------
-- 15. Quotation conversion: carry the pack reference into the sale
-- ---------------------------------------------------------------------
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
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

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

    FOR v_qitem IN
        SELECT qi.product_id, qi.description, qi.quantity, qi.unit_price,
               qi.unit_cost, qi.tax_rate, qi.discount_rate, qi.line_total, qi.package_id,
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
            'package_id', v_qitem.package_id,
            'unit_price', v_qitem.unit_price,
            'unit_cost', v_qitem.unit_cost,
            'tax_rate', v_qitem.tax_rate,
            'discount_rate', v_qitem.discount_rate,
            'line_total', v_qitem.line_total,
            'line_cost', (v_qitem.quantity * v_qitem.unit_cost)
        );
    END LOOP;

    v_payments := jsonb_build_array(jsonb_build_object(
        'payment_method', p_payment_method,
        'amount', v_total_amount,
        'reference', 'Quote ' || v_quote_number
    ));

    v_sale_number := 'SALE-Q-' || v_quote_number;

    v_sale_result := public.execute_atomic_retail_sale(
        p_organization_id, p_workspace_id, v_sale_number, 'INV-' || v_quote_number,
        'QUOTATION', v_customer_id, v_customer_name, p_cashier_user_id,
        p_cashier_name, p_shift_id, v_currency, v_subtotal, v_tax_total,
        v_discount_total, v_total_amount, v_total_cost, p_payment_method,
        'PAID', p_idempotency_key, 'Converted from Quote ' || v_quote_number,
        v_items, v_payments, false
    );

    v_sale_id := (v_sale_result->>'sale_id')::UUID;

    UPDATE public.retail_quotations
    SET status = 'CONVERTED', converted_sale_id = v_sale_id, updated_at = NOW()
    WHERE id = p_quotation_id;

    RETURN jsonb_build_object(
        'success', true, 'quotation_id', p_quotation_id,
        'sale_id', v_sale_id, 'sale_number', v_sale_number
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion(UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_quotation_conversion(UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------
-- 16. Refund: restock BASE units (legacy lines have NULL base_quantity)
-- ---------------------------------------------------------------------
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
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

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

    IF p_restock THEN
        FOR v_item IN
            SELECT product_id, COALESCE(base_quantity, quantity) AS restock_qty, unit_cost,
                   COALESCE(pack_size, 1) AS pack_size
            FROM public.retail_sale_items
            WHERE sale_id = p_sale_id
            ORDER BY product_id
        LOOP
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_item.restock_qty, updated_at = NOW()
            WHERE workspace_id = p_workspace_id AND product_id = v_item.product_id
            RETURNING quantity_on_hand INTO v_current_stock;

            INSERT INTO public.retail_stock_movements (
                organization_id, workspace_id, product_id, movement_type,
                quantity_change, balance_after, unit_cost, reference_type,
                reference_id, reason, created_by
            ) VALUES (
                p_organization_id, p_workspace_id, v_item.product_id, 'SALE_REFUND',
                v_item.restock_qty, v_current_stock, round(v_item.unit_cost / v_item.pack_size, 2), 'SALE_RECEIPT',
                v_sale_number, 'Refund for ' || v_sale_number || ': ' || p_refund_reason,
                p_refunded_by
            );
        END LOOP;
    END IF;

    UPDATE public.retail_sales
    SET status = 'REFUNDED', payment_status = 'REFUNDED',
        notes = COALESCE(notes || '; ', '') || 'Refunded: ' || p_refund_reason,
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id, 'sale_number', v_sale_number, 'restocked', p_restock);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_sale_refund(UUID, UUID, UUID, TEXT, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_sale_refund(UUID, UUID, UUID, TEXT, BOOLEAN, UUID) TO service_role;

-- ---------------------------------------------------------------------
-- 17. Goods receipt: stock rises ONLY here, in base units derived from the
--     PO line's stored pack size. Partial receipts are preserved and each
--     receipt line is ledgered. Re-submitting the same receipt number fails
--     on the unique key, so a retry can never double-count.
--     items: [{ po_item_id?, product_id, quantity_received, unit_cost? }]
--     quantity_received is expressed in the PO line's own unit (packs).
-- ---------------------------------------------------------------------
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
    v_qty NUMERIC;
    v_unit_cost NUMERIC;
    v_current_stock NUMERIC;
    v_stock_id UUID;
    v_po_item_id UUID;
    v_po_item RECORD;
    v_line_count INTEGER;
    v_base NUMERIC;
    v_lines INTEGER := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_module_entitlements
        WHERE organization_id = p_organization_id AND workspace_id = p_workspace_id
          AND module_key = 'retail' AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'RETAIL_MODULE_NOT_ENTITLED: Workspace % is not actively entitled to Retail OS.', p_workspace_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'INVALID_WORKSPACE: Workspace % does not belong to organization %.', p_workspace_id, p_organization_id;
    END IF;

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

    INSERT INTO public.retail_goods_receipts (
        organization_id, workspace_id, purchase_order_id, receipt_number, received_by, notes
    ) VALUES (
        p_organization_id, p_workspace_id, p_po_id, p_receipt_number, p_received_by, p_notes
    ) RETURNING id INTO v_receipt_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity_received')::NUMERIC;
        v_po_item_id := NULLIF(v_item->>'po_item_id', '')::UUID;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            CONTINUE;
        END IF;

        IF v_po_item_id IS NULL THEN
            SELECT count(*) INTO v_line_count
            FROM public.retail_po_items WHERE purchase_order_id = p_po_id AND product_id = v_product_id;
            IF v_line_count > 1 THEN
                RAISE EXCEPTION 'AMBIGUOUS_PO_LINE: PO has % lines for product %; send po_item_id.', v_line_count, v_product_id;
            END IF;
            SELECT id INTO v_po_item_id
            FROM public.retail_po_items WHERE purchase_order_id = p_po_id AND product_id = v_product_id;
        END IF;

        SELECT * INTO v_po_item
        FROM public.retail_po_items
        WHERE id = v_po_item_id AND purchase_order_id = p_po_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PO_ITEM_NOT_FOUND: product % is not on purchase order %', v_product_id, v_po_number;
        END IF;

        v_product_id := v_po_item.product_id;

        IF v_po_item.quantity_received + v_qty > v_po_item.quantity_ordered THEN
            RAISE EXCEPTION 'OVER_RECEIPT: receiving % would exceed the ordered % (already received %)',
                v_qty, v_po_item.quantity_ordered, v_po_item.quantity_received;
        END IF;

        v_base := v_qty * v_po_item.pack_size;
        IF v_base <> round(v_base, 2) THEN
            RAISE EXCEPTION 'BASE_QUANTITY_PRECISION: % x % = % base units cannot be stored exactly (max 2 decimals)', v_qty, v_po_item.pack_size, v_base;
        END IF;

        v_unit_cost := COALESCE(NULLIF((v_item->>'unit_cost')::NUMERIC, 0), v_po_item.unit_cost);

        UPDATE public.retail_po_items
        SET quantity_received = quantity_received + v_qty
        WHERE id = v_po_item.id;

        SELECT id, quantity_on_hand INTO v_stock_id, v_current_stock
        FROM public.retail_stock_levels
        WHERE workspace_id = p_workspace_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_stock_id IS NULL THEN
            INSERT INTO public.retail_stock_levels (organization_id, workspace_id, product_id, quantity_on_hand, quantity_reserved)
            VALUES (p_organization_id, p_workspace_id, v_product_id, v_base, 0)
            RETURNING id, quantity_on_hand INTO v_stock_id, v_current_stock;
        ELSE
            UPDATE public.retail_stock_levels
            SET quantity_on_hand = quantity_on_hand + v_base, updated_at = NOW()
            WHERE id = v_stock_id
            RETURNING quantity_on_hand INTO v_current_stock;
        END IF;

        INSERT INTO public.retail_stock_movements (
            organization_id, workspace_id, product_id, movement_type,
            quantity_change, balance_after, unit_cost, reference_type,
            reference_id, reason, created_by
        ) VALUES (
            p_organization_id, p_workspace_id, v_product_id, 'RECEIVING',
            v_base, v_current_stock, round(v_unit_cost / v_po_item.pack_size, 2), 'PURCHASE_ORDER',
            v_po_number,
            'Goods received for PO ' || v_po_number
                || CASE WHEN v_po_item.package_id IS NOT NULL
                        THEN ' (' || v_qty || ' x ' || v_po_item.pack_label || ' = ' || v_base || ' base units)' ELSE '' END,
            p_received_by
        );

        INSERT INTO public.retail_goods_receipt_items (
            organization_id, workspace_id, goods_receipt_id, po_item_id, product_id,
            quantity_received, pack_size, base_quantity, unit_cost
        ) VALUES (
            p_organization_id, p_workspace_id, v_receipt_id, v_po_item.id, v_product_id,
            v_qty, v_po_item.pack_size, v_base, v_unit_cost
        );
        v_lines := v_lines + 1;
    END LOOP;

    IF v_lines = 0 THEN
        RAISE EXCEPTION 'EMPTY_RECEIPT: no item with a positive received quantity was supplied.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.retail_po_items
        WHERE purchase_order_id = p_po_id AND quantity_received < quantity_ordered
    ) THEN
        UPDATE public.retail_purchase_orders SET status = 'PARTIAL_RECEIVED', updated_at = NOW() WHERE id = p_po_id;
    ELSE
        UPDATE public.retail_purchase_orders SET status = 'RECEIVED', updated_at = NOW() WHERE id = p_po_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'receipt_id', v_receipt_id, 'receipt_number', p_receipt_number);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_atomic_goods_receipt(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_goods_receipt(UUID, UUID, UUID, TEXT, UUID, TEXT, JSONB) TO service_role;

-- ---------------------------------------------------------------------
-- 18. Privileges for the new RPCs (service_role only)
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.retail_set_preferred_supplier(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retail_set_preferred_supplier(UUID, UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.retail_search_catalogue(UUID, TEXT, UUID, UUID, UUID, UUID, BOOLEAN, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retail_search_catalogue(UUID, TEXT, UUID, UUID, UUID, UUID, BOOLEAN, INTEGER, TEXT) TO service_role;
