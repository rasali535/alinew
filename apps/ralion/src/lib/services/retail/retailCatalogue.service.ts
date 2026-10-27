/**
 * Ralion Retail — Catalogue hierarchy, tax codes, brands, supplier relationships,
 * packaging variants and unified (cashier-safe) catalogue search.
 *
 * Every function is workspace-scoped by an explicit workspaceId that API routes
 * derive from the authenticated session (never from the request body). The
 * database additionally enforces tenant ownership through triggers and the
 * service-role-only privilege model.
 */
import { getPrivilegedSupabase } from '../../supabase/server';

export type CatalogueChannel = 'SALES' | 'PURCHASE';

export class CatalogueError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) {
    super(message);
    this.name = 'CatalogueError';
  }
}

/** Translate raw Postgres/PostgREST errors into stable API error codes. */
export function mapDbError(err: { message?: string; code?: string } | null | undefined): CatalogueError {
  const message = err?.message || 'Database error';
  const known = [
    ['DUPLICATE_BARCODE', 409],
    ['CROSS_TENANT_REFERENCE', 403],
    ['PACK_CONVERSION_LOCKED', 409],
    ['PACK_PRODUCT_IMMUTABLE', 409],
    ['PRODUCT_SUPPLIER_NOT_FOUND', 404],
    ['INVALID_PACKAGE', 400],
    ['BASE_QUANTITY_PRECISION', 400],
  ] as const;
  for (const [code, status] of known) if (message.includes(code)) return new CatalogueError(code, message, status);
  if (err?.code === '23505') return new CatalogueError('DUPLICATE_RECORD', message, 409);
  if (err?.code === '23503') return new CatalogueError('REFERENCE_IN_USE', message, 409);
  if (err?.code === '23514') return new CatalogueError('CONSTRAINT_VIOLATION', message, 400);
  return new CatalogueError('DATABASE_ERROR', message, 500);
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const optStr = (v: unknown) => {
  const s = str(v);
  return s === '' ? null : s;
};
const num = (v: unknown, label: string, opts: { min?: number; max?: number; required?: boolean } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new CatalogueError('INVALID_NUMBER', `${label} is required.`);
    return null;
  }
  const n = Number(v);
  if (typeof v === 'boolean' || !Number.isFinite(n)) throw new CatalogueError('INVALID_NUMBER', `${label} must be a finite number.`);
  if (opts.min !== undefined && n < opts.min) throw new CatalogueError('INVALID_NUMBER', `${label} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw new CatalogueError('INVALID_NUMBER', `${label} must be at most ${opts.max}.`);
  return n;
};

export interface CatalogueSearchParams {
  workspaceId: string;
  query?: string;
  departmentId?: string;
  subdepartmentId?: string;
  brandId?: string;
  supplierId?: string;
  inStockOnly?: boolean;
  limit?: number;
  channel?: CatalogueChannel;
}

export interface CatalogueSearchHit {
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  brand: string | null;
  departmentId: string | null;
  departmentName: string | null;
  subdepartmentId: string | null;
  subdepartmentName: string | null;
  preferredSupplierName: string | null;
  unitOfMeasure: string;
  sellingPrice: number;
  taxRate: number;
  stockOnHand: number;
  status: string;
  matchedPackId: string | null;
  matchRank: number;
  packs: Array<{ id: string; label: string; baseUnitsPerPack: number; barcode: string | null; sellingPrice: number }>;
}

export class RetailCatalogueService {
  // ------------------------------------------------------------------ search
  /** Cashier-safe: the database function projects NO cost columns. */
  static async search(params: CatalogueSearchParams): Promise<CatalogueSearchHit[]> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase.rpc('retail_search_catalogue', {
      p_workspace_id: params.workspaceId,
      p_query: params.query?.slice(0, 120) || null,
      p_department_id: params.departmentId || null,
      p_subdepartment_id: params.subdepartmentId || null,
      p_brand_id: params.brandId || null,
      p_supplier_id: params.supplierId || null,
      p_in_stock_only: Boolean(params.inStockOnly),
      p_limit: Math.min(Math.max(Number(params.limit) || 40, 1), 200),
      p_channel: params.channel === 'PURCHASE' ? 'PURCHASE' : 'SALES',
    });
    if (error) throw mapDbError(error);
    return (data || []).map((r: any) => ({
      productId: r.product_id,
      name: r.name,
      sku: r.sku,
      barcode: r.barcode,
      brand: r.brand,
      departmentId: r.department_id,
      departmentName: r.department_name,
      subdepartmentId: r.subdepartment_id,
      subdepartmentName: r.subdepartment_name,
      preferredSupplierName: r.preferred_supplier_name,
      unitOfMeasure: r.unit_of_measure,
      sellingPrice: Number(r.selling_price),
      taxRate: Number(r.tax_rate),
      stockOnHand: Number(r.stock_on_hand),
      status: r.status,
      matchedPackId: r.matched_pack_id,
      matchRank: r.match_rank,
      packs: (r.packs || []).map((p: any) => ({
        id: p.id,
        label: p.label,
        baseUnitsPerPack: Number(p.base_units_per_pack),
        barcode: p.barcode,
        sellingPrice: Number(p.selling_price),
      })),
    }));
  }

  /** Lookup lists for filters (names only — no costs). */
  static async filterOptions(workspaceId: string) {
    const supabase = getPrivilegedSupabase();
    const [d, s, b, sup] = await Promise.all([
      supabase.from('retail_departments').select('id, name').eq('workspace_id', workspaceId).eq('is_active', true).order('sort_order').order('name'),
      supabase.from('retail_subdepartments').select('id, name, department_id').eq('workspace_id', workspaceId).eq('is_active', true).order('sort_order').order('name'),
      supabase.from('retail_brands').select('id, name').eq('workspace_id', workspaceId).eq('is_active', true).order('name'),
      supabase.from('retail_suppliers').select('id, name').eq('workspace_id', workspaceId).order('name'),
    ]);
    for (const r of [d, s, b, sup]) if (r.error) throw mapDbError(r.error);
    return {
      departments: d.data || [],
      subdepartments: (s.data || []).map((x: any) => ({ id: x.id, name: x.name, departmentId: x.department_id })),
      brands: b.data || [],
      suppliers: sup.data || [],
    };
  }

  // -------------------------------------------------------------- departments
  static async listHierarchy(workspaceId: string) {
    const supabase = getPrivilegedSupabase();
    const [d, s] = await Promise.all([
      supabase.from('retail_departments').select('*').eq('workspace_id', workspaceId).order('sort_order').order('name'),
      supabase.from('retail_subdepartments').select('*').eq('workspace_id', workspaceId).order('sort_order').order('name'),
    ]);
    for (const r of [d, s]) if (r.error) throw mapDbError(r.error);
    return (d.data || []).map((dep: any) => ({
      id: dep.id,
      name: dep.name,
      code: dep.code,
      sortOrder: dep.sort_order,
      isActive: dep.is_active,
      subdepartments: (s.data || [])
        .filter((x: any) => x.department_id === dep.id)
        .map((x: any) => ({ id: x.id, name: x.name, code: x.code, sortOrder: x.sort_order, isActive: x.is_active })),
    }));
  }

  static async saveDepartment(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const name = str(body.name);
    if (!name) throw new CatalogueError('NAME_REQUIRED', 'Department name is required.');
    const supabase = getPrivilegedSupabase();
    const row: any = {
      organization_id: ctx.organizationId,
      workspace_id: ctx.workspaceId,
      name,
      code: optStr(body.code),
      sort_order: num(body.sortOrder, 'sortOrder', { min: 0 }) ?? 0,
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    };
    const q = body.id
      ? supabase.from('retail_departments').update(row).eq('id', body.id).eq('workspace_id', ctx.workspaceId)
      : supabase.from('retail_departments').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw mapDbError(error);
    return data;
  }

  static async saveSubdepartment(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const name = str(body.name);
    const departmentId = str(body.departmentId);
    if (!name || !departmentId) throw new CatalogueError('INVALID_INPUT', 'name and departmentId are required.');
    const supabase = getPrivilegedSupabase();
    const { data: dep } = await supabase.from('retail_departments').select('id').eq('id', departmentId).eq('workspace_id', ctx.workspaceId).maybeSingle();
    if (!dep) throw new CatalogueError('CROSS_TENANT_REFERENCE', 'Department not found in this workspace.', 403);
    const row: any = {
      organization_id: ctx.organizationId,
      workspace_id: ctx.workspaceId,
      department_id: departmentId,
      name,
      code: optStr(body.code),
      sort_order: num(body.sortOrder, 'sortOrder', { min: 0 }) ?? 0,
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    };
    const q = body.id
      ? supabase.from('retail_subdepartments').update(row).eq('id', body.id).eq('workspace_id', ctx.workspaceId)
      : supabase.from('retail_subdepartments').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw mapDbError(error);
    return data;
  }

  // ---------------------------------------------------------------- tax codes
  static async listTaxCodes(workspaceId: string) {
    const { data, error } = await getPrivilegedSupabase().from('retail_tax_codes').select('*').eq('workspace_id', workspaceId).order('code');
    if (error) throw mapDbError(error);
    return (data || []).map((t: any) => ({ id: t.id, code: t.code, name: t.name, rate: Number(t.rate), isDefault: t.is_default, isActive: t.is_active }));
  }

  static async saveTaxCode(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const code = str(body.code).toUpperCase();
    const name = str(body.name);
    const rate = num(body.rate, 'rate', { min: 0, max: 100, required: true })!;
    if (!code || !name) throw new CatalogueError('INVALID_INPUT', 'code and name are required.');
    const supabase = getPrivilegedSupabase();
    if (body.isDefault) {
      await supabase.from('retail_tax_codes').update({ is_default: false }).eq('workspace_id', ctx.workspaceId).eq('is_default', true);
    }
    const row: any = {
      organization_id: ctx.organizationId,
      workspace_id: ctx.workspaceId,
      code,
      name,
      rate,
      is_default: Boolean(body.isDefault),
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    };
    const q = body.id
      ? supabase.from('retail_tax_codes').update(row).eq('id', body.id).eq('workspace_id', ctx.workspaceId)
      : supabase.from('retail_tax_codes').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw mapDbError(error);
    // Keep the legacy per-product vat_rate in step so existing readers stay correct.
    if (body.id) {
      await supabase.from('retail_products').update({ vat_rate: rate }).eq('workspace_id', ctx.workspaceId).eq('tax_code_id', body.id);
    }
    return data;
  }

  // ------------------------------------------------------------------- brands
  static async listBrands(workspaceId: string) {
    const { data, error } = await getPrivilegedSupabase().from('retail_brands').select('*').eq('workspace_id', workspaceId).order('name');
    if (error) throw mapDbError(error);
    return (data || []).map((b: any) => ({ id: b.id, name: b.name, isActive: b.is_active }));
  }

  static async saveBrand(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const name = str(body.name);
    if (!name) throw new CatalogueError('NAME_REQUIRED', 'Brand name is required.');
    const supabase = getPrivilegedSupabase();
    const row: any = {
      organization_id: ctx.organizationId,
      workspace_id: ctx.workspaceId,
      name,
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
      updated_at: new Date().toISOString(),
    };
    const q = body.id
      ? supabase.from('retail_brands').update(row).eq('id', body.id).eq('workspace_id', ctx.workspaceId)
      : supabase.from('retail_brands').insert(row);
    const { data, error } = await q.select().single();
    if (error) throw mapDbError(error);
    return data;
  }

  // ----------------------------------------------------------------- packages
  static async listPackages(workspaceId: string, productId: string) {
    const { data, error } = await getPrivilegedSupabase()
      .from('retail_product_packages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('product_id', productId)
      .order('base_units_per_pack');
    if (error) throw mapDbError(error);
    return (data || []).map((p: any) => ({
      id: p.id,
      productId: p.product_id,
      label: p.label,
      kind: p.kind,
      baseUnitsPerPack: Number(p.base_units_per_pack),
      barcode: p.barcode,
      sellingPrice: p.selling_price === null ? null : Number(p.selling_price),
      purchaseCost: p.purchase_cost === null ? null : Number(p.purchase_cost),
      isActive: p.is_active,
    }));
  }

  /** Create/update a pack. The DB refuses ratio changes once the pack has history. */
  static async savePackage(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const supabase = getPrivilegedSupabase();
    const label = str(body.label);
    const kind = ['SALES', 'PURCHASE', 'BOTH'].includes(body.kind) ? body.kind : 'BOTH';
    const factor = num(body.baseUnitsPerPack, 'baseUnitsPerPack', { min: 0.0001, required: true })!;
    if (!label) throw new CatalogueError('INVALID_INPUT', 'label is required.');
    const row: any = {
      label,
      kind,
      base_units_per_pack: factor,
      barcode: optStr(body.barcode),
      selling_price: num(body.sellingPrice, 'sellingPrice', { min: 0 }),
      purchase_cost: num(body.purchaseCost, 'purchaseCost', { min: 0 }),
      is_active: body.isActive === undefined ? true : Boolean(body.isActive),
    };
    let q;
    if (body.id) {
      q = supabase.from('retail_product_packages').update(row).eq('id', body.id).eq('workspace_id', ctx.workspaceId);
    } else {
      const productId = str(body.productId);
      if (!productId) throw new CatalogueError('INVALID_INPUT', 'productId is required.');
      q = supabase.from('retail_product_packages').insert({ ...row, organization_id: ctx.organizationId, workspace_id: ctx.workspaceId, product_id: productId });
    }
    const { data, error } = await q.select().single();
    if (error) throw mapDbError(error);
    return data;
  }

  // -------------------------------------------------------- product suppliers
  static async listProductSuppliers(workspaceId: string, productId: string) {
    const { data, error } = await getPrivilegedSupabase()
      .from('retail_product_suppliers')
      .select('*, retail_suppliers(name)')
      .eq('workspace_id', workspaceId)
      .eq('product_id', productId)
      .order('is_preferred', { ascending: false });
    if (error) throw mapDbError(error);
    return (data || []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      supplierId: r.supplier_id,
      supplierName: r.retail_suppliers?.name,
      supplierSku: r.supplier_sku,
      isPreferred: r.is_preferred,
      lastCost: r.last_cost === null ? null : Number(r.last_cost),
    }));
  }

  static async linkSupplier(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const productId = str(body.productId);
    const supplierId = str(body.supplierId);
    if (!productId || !supplierId) throw new CatalogueError('INVALID_INPUT', 'productId and supplierId are required.');
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_product_suppliers')
      .upsert(
        {
          organization_id: ctx.organizationId,
          workspace_id: ctx.workspaceId,
          product_id: productId,
          supplier_id: supplierId,
          supplier_sku: optStr(body.supplierSku),
          last_cost: num(body.lastCost, 'lastCost', { min: 0 }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,supplier_id' }
      )
      .select()
      .single();
    if (error) throw mapDbError(error);
    const { count } = await supabase
      .from('retail_product_suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('is_preferred', true);
    if (body.isPreferred || !count) {
      const { error: rpcErr } = await supabase.rpc('retail_set_preferred_supplier', {
        p_workspace_id: ctx.workspaceId,
        p_product_id: productId,
        p_supplier_id: supplierId,
      });
      if (rpcErr) throw mapDbError(rpcErr);
    }
    return data;
  }

  static async unlinkSupplier(workspaceId: string, productId: string, supplierId: string) {
    const supabase = getPrivilegedSupabase();
    const { error } = await supabase
      .from('retail_product_suppliers')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('product_id', productId)
      .eq('supplier_id', supplierId);
    if (error) throw mapDbError(error);
  }

  // ---------------------------------------------- product creation (purchasing)
  /**
   * Create a catalogue product from the purchase-order workflow.
   * - Never creates stock: inventory rises only through goods receipt.
   * - Rejects duplicate SKU (case-insensitive) and duplicate barcode (products AND packs)
   *   with a pointer to the existing product so the buyer can use Add Existing instead.
   */
  static async createProductForPurchasing(ctx: { organizationId: string; workspaceId: string }, body: any) {
    const supabase = getPrivilegedSupabase();
    const name = str(body.name);
    const sku = str(body.sku).toUpperCase();
    const barcode = optStr(body.barcode);
    if (!name || !sku) throw new CatalogueError('INVALID_INPUT', 'name and sku are required.');
    const sellingPrice = num(body.sellingPrice, 'sellingPrice', { min: 0, required: true })!;
    const purchaseCost = num(body.purchaseCost, 'purchaseCost', { min: 0 }) ?? 0;

    const dupSku = await supabase.from('retail_products').select('id, name, sku').eq('workspace_id', ctx.workspaceId).ilike('sku', sku.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1);
    if (dupSku.data?.length) throw new CatalogueError('DUPLICATE_SKU', `SKU ${sku} already exists.`, 409, { existing: dupSku.data[0] });
    if (barcode) {
      const [p, k] = await Promise.all([
        supabase.from('retail_products').select('id, name, sku').eq('workspace_id', ctx.workspaceId).eq('barcode', barcode).limit(1),
        supabase.from('retail_product_packages').select('id, product_id, label').eq('workspace_id', ctx.workspaceId).eq('barcode', barcode).limit(1),
      ]);
      if (p.data?.length) throw new CatalogueError('DUPLICATE_BARCODE', `Barcode ${barcode} already belongs to ${p.data[0].name}.`, 409, { existing: p.data[0] });
      if (k.data?.length) throw new CatalogueError('DUPLICATE_BARCODE', `Barcode ${barcode} already belongs to pack ${k.data[0].label}.`, 409, { existing: k.data[0] });
    }

    const [dep, sub, brand, tax] = await Promise.all([
      body.departmentId ? supabase.from('retail_departments').select('id, name').eq('id', body.departmentId).eq('workspace_id', ctx.workspaceId).maybeSingle() : null,
      body.subdepartmentId ? supabase.from('retail_subdepartments').select('id, name, department_id').eq('id', body.subdepartmentId).eq('workspace_id', ctx.workspaceId).maybeSingle() : null,
      body.brandId ? supabase.from('retail_brands').select('id, name').eq('id', body.brandId).eq('workspace_id', ctx.workspaceId).maybeSingle() : null,
      body.taxCodeId ? supabase.from('retail_tax_codes').select('id, rate').eq('id', body.taxCodeId).eq('workspace_id', ctx.workspaceId).maybeSingle() : null,
    ]);
    if (body.departmentId && !dep?.data) throw new CatalogueError('CROSS_TENANT_REFERENCE', 'Department not found in this workspace.', 403);
    if (body.subdepartmentId && !sub?.data) throw new CatalogueError('CROSS_TENANT_REFERENCE', 'Subdepartment not found in this workspace.', 403);
    if (sub?.data && dep?.data && sub.data.department_id !== dep.data.id) throw new CatalogueError('INVALID_HIERARCHY', 'Subdepartment does not belong to the chosen department.');
    if (body.brandId && !brand?.data) throw new CatalogueError('CROSS_TENANT_REFERENCE', 'Brand not found in this workspace.', 403);
    if (body.taxCodeId && !tax?.data) throw new CatalogueError('CROSS_TENANT_REFERENCE', 'Tax code not found in this workspace.', 403);

    const { data: product, error } = await supabase
      .from('retail_products')
      .insert({
        organization_id: ctx.organizationId,
        workspace_id: ctx.workspaceId,
        name,
        sku,
        barcode,
        category: dep?.data?.name || 'General Supplies',
        subcategory: sub?.data?.name || null,
        brand: brand?.data?.name || null,
        department_id: dep?.data?.id || null,
        subdepartment_id: sub?.data?.id || null,
        brand_id: brand?.data?.id || null,
        tax_code_id: tax?.data?.id || null,
        vat_rate: tax?.data ? Number(tax.data.rate) : Number(body.vatRate || 0),
        unit_of_measure: str(body.unitOfMeasure) || 'EACH',
        purchase_cost: purchaseCost,
        selling_price: sellingPrice,
        min_selling_price: sellingPrice,
        reorder_level: num(body.reorderLevel, 'reorderLevel', { min: 0 }) ?? 10,
        description: optStr(body.description),
        status: 'ACTIVE',
      })
      .select('id, name, sku, barcode')
      .single();
    if (error) throw mapDbError(error);

    if (body.supplierId) {
      await RetailCatalogueService.linkSupplier(ctx, {
        productId: product.id,
        supplierId: body.supplierId,
        supplierSku: body.supplierSku,
        lastCost: purchaseCost || null,
        isPreferred: true,
      });
    }
    // Intentionally NO retail_stock_levels / retail_stock_movements row: stock is added by goods receipt only.
    return { ...product, stockOnHand: 0 };
  }
}
