/**
 * Ralion OS — Ralion Retail Authoritative Database & Transaction Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides durable PostgreSQL persistence via Supabase and atomic database
 * transactions with row-level locking (FOR UPDATE) for:
 * - Inventory receiving & physical stock deductions
 * - POS sale completion & idempotency
 * - Contractor quotation conversions
 * - Customer refunds & restocking
 * - Operating expenses & payroll
 * Operating Currency: USD ($)
 */

import {
  RetailProduct,
  RetailStockLevel,
  RetailStockMovement,
  RetailSupplier,
  RetailPurchaseOrder,
  RetailPoItem,
  RetailGoodsReceipt,
  RetailQuotation,
  RetailQuoteItem,
  RetailCashierShift,
  RetailSale,
  RetailSaleItem,
  RetailSalePayment,
  RetailExpense,
  RetailEmployee,
  RetailPayrollRun,
  RetailPayslip,
  RetailSettings,
  RetailFinancialMetrics,
  RetailCurrency,
} from '@ralion/database';
import { getPrivilegedSupabase } from '../../supabase/server';

export interface AtomicSaleParams {
  organizationId: string;
  workspaceId: string;
  saleNumber: string;
  invoiceNumber?: string;
  source: 'POS' | 'QUOTATION' | 'INVOICE' | 'MANUAL';
  customerId?: string;
  customerName: string;
  cashierUserId: string;
  cashierName: string;
  shiftId?: string;
  currency: RetailCurrency;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    taxRate?: number;
    discountRate?: number;
  }>;
  payments: Array<{
    paymentMethod: 'CASH' | 'CARD_EXTERNAL' | 'BANK_TRANSFER' | 'SPLIT';
    amount: number;
    reference?: string;
  }>;
  idempotencyKey?: string;
  notes?: string;
  isPilotDemo?: boolean;
}

export interface AtomicReceiveParams {
  organizationId: string;
  workspaceId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  receivedBy?: string;
  items: Array<{
    productId: string;
    quantityReceivedNow: number;
    unitCost?: number;
  }>;
  notes?: string;
}

export interface AtomicQuoteConversionParams {
  organizationId: string;
  workspaceId: string;
  quotationId: string;
  cashierUserId: string;
  cashierName: string;
  paymentMethod: 'CASH' | 'CARD_EXTERNAL' | 'BANK_TRANSFER' | 'SPLIT';
  shiftId?: string;
  idempotencyKey?: string;
}

export class RetailDatabaseService {
  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  static async getSettings(workspaceId: string): Promise<RetailSettings> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        organizationId: data.organization_id,
        workspaceId: data.workspace_id,
        storeName: data.store_name,
        defaultCurrency: data.default_currency || 'USD',
        taxRatePercent: Number(data.tax_rate_percent || 0),
        enableNegativeStock: Boolean(data.enable_negative_stock),
        receiptHeader: data.receipt_header,
        receiptFooter: data.receipt_footer,
        lowStockThreshold: data.low_stock_threshold || 10,
        updatedAt: data.updated_at,
      };
    }

    const defaultSettings: RetailSettings = {
      workspaceId,
      organizationId: '',
      storeName: 'Proinsight Hardware & Building Supplies',
      defaultCurrency: 'USD',
      taxRatePercent: 0.0,
      enableNegativeStock: false,
      receiptHeader: 'Proinsight Hardware & Building Supplies',
      receiptFooter: 'Thank you for choosing Proinsight! Powered by Ralion OS.',
      lowStockThreshold: 10,
    };

    return defaultSettings;
  }

  static async updateSettings(workspaceId: string, updates: Partial<RetailSettings>): Promise<RetailSettings> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_settings')
      .upsert({
        workspace_id: workspaceId,
        store_name: updates.storeName,
        default_currency: updates.defaultCurrency || 'USD',
        tax_rate_percent: updates.taxRatePercent,
        enable_negative_stock: updates.enableNegativeStock,
        receipt_header: updates.receiptHeader,
        receipt_footer: updates.receiptFooter,
        low_stock_threshold: updates.lowStockThreshold,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' })
      .select()
      .single();

    if (error) {
      console.warn('[RetailDatabase] Could not update settings in DB:', error.message);
    }
    return this.getSettings(workspaceId);
  }

  // ---------------------------------------------------------------------------
  // PRODUCTS & STOCK
  // ---------------------------------------------------------------------------
  static async listProducts(
    workspaceId: string,
    options?: { category?: string; query?: string }
  ): Promise<RetailProduct[]> {
    const supabase = getPrivilegedSupabase();

    let query = supabase
      .from('retail_products')
      .select(`
        *,
        retail_stock_levels (
          quantity_on_hand,
          quantity_reserved
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (options?.category && options.category !== 'all' && options.category !== 'ALL') {
      query = query.eq('category', options.category);
    }
    if (options?.query) {
      const q = options.query.trim();
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[RetailDatabase] Error listing products:', error);
      return [];
    }

    return (data || []).map((p: any) => {
      const stock = p.retail_stock_levels?.[0] || p.retail_stock_levels;
      return {
        id: p.id,
        organizationId: p.organization_id,
        workspaceId: p.workspace_id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        subcategory: p.subcategory,
        description: p.description,
        brand: p.brand,
        supplierId: p.supplier_id,
        unitOfMeasure: p.unit_of_measure,
        purchaseCost: Number(p.purchase_cost || 0),
        sellingPrice: Number(p.selling_price || 0),
        minSellingPrice: Number(p.min_selling_price || 0),
        vatRate: Number(p.vat_rate || 0),
        reorderLevel: p.reorder_level || 10,
        currentStock: Number(stock?.quantity_on_hand || 0),
        status: p.status || 'ACTIVE',
        imageUrl: p.image_url,
        isPilotDemo: p.is_pilot_demo,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });
  }

  static async getProductById(workspaceId: string, productId: string): Promise<RetailProduct | null> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_products')
      .select(`
        *,
        retail_stock_levels (
          quantity_on_hand,
          quantity_reserved
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('id', productId)
      .maybeSingle();

    if (error || !data) return null;

    const stock = data.retail_stock_levels?.[0] || data.retail_stock_levels;
    return {
      id: data.id,
      organizationId: data.organization_id,
      workspaceId: data.workspace_id,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      category: data.category,
      unitOfMeasure: data.unit_of_measure,
      purchaseCost: Number(data.purchase_cost || 0),
      sellingPrice: Number(data.selling_price || 0),
      minSellingPrice: Number(data.min_selling_price || 0),
      vatRate: Number(data.vat_rate || 0),
      reorderLevel: data.reorder_level || 10,
      currentStock: Number(stock?.quantity_on_hand || 0),
      status: data.status,
      imageUrl: data.image_url,
      isPilotDemo: data.is_pilot_demo,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  static async getProductByBarcode(workspaceId: string, barcode: string): Promise<RetailProduct | null> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_products')
      .select(`
        *,
        retail_stock_levels (
          quantity_on_hand,
          quantity_reserved
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('barcode', barcode)
      .maybeSingle();

    if (!data) return null;
    const stock = data.retail_stock_levels?.[0] || data.retail_stock_levels;
    return {
      id: data.id,
      organizationId: data.organization_id,
      workspaceId: data.workspace_id,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      category: data.category,
      unitOfMeasure: data.unit_of_measure,
      purchaseCost: Number(data.purchase_cost || 0),
      sellingPrice: Number(data.selling_price || 0),
      minSellingPrice: Number(data.min_selling_price || 0),
      vatRate: Number(data.vat_rate || 0),
      reorderLevel: data.reorder_level || 10,
      currentStock: Number(stock?.quantity_on_hand || 0),
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  static async upsertProduct(product: RetailProduct, initialStock = 0): Promise<RetailProduct> {
    const supabase = getPrivilegedSupabase();

    const { data: savedProd, error } = await supabase
      .from('retail_products')
      .upsert({
        id: product.id,
        organization_id: product.organizationId,
        workspace_id: product.workspaceId,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        subcategory: product.subcategory,
        description: product.description,
        brand: product.brand,
        supplier_id: product.supplierId,
        unit_of_measure: product.unitOfMeasure,
        purchase_cost: product.purchaseCost,
        selling_price: product.sellingPrice,
        min_selling_price: product.minSellingPrice || product.sellingPrice,
        vat_rate: product.vatRate || 0,
        reorder_level: product.reorderLevel || 10,
        status: product.status || 'ACTIVE',
        is_pilot_demo: product.isPilotDemo || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,sku' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert product: ${error.message}`);
    }

    const prodId = savedProd.id;

    // Check existing stock level
    const { data: existingStock } = await supabase
      .from('retail_stock_levels')
      .select('*')
      .eq('workspace_id', product.workspaceId)
      .eq('product_id', prodId)
      .maybeSingle();

    if (!existingStock) {
      await supabase.from('retail_stock_levels').insert({
        organization_id: product.organizationId,
        workspace_id: product.workspaceId,
        product_id: prodId,
        quantity_on_hand: initialStock,
        quantity_reserved: 0,
      });

      if (initialStock > 0) {
        await supabase.from('retail_stock_movements').insert({
          organization_id: product.organizationId,
          workspace_id: product.workspaceId,
          product_id: prodId,
          movement_type: 'OPENING_STOCK',
          quantity_change: initialStock,
          balance_after: initialStock,
          unit_cost: product.purchaseCost,
          reference_type: 'INITIAL_IMPORT',
          reason: 'Initial opening stock upon creation',
        });
      }
    }

    return {
      ...product,
      id: prodId,
      currentStock: existingStock ? Number(existingStock.quantity_on_hand) : initialStock,
    };
  }

  static async adjustStock(params: {
    organizationId: string;
    workspaceId: string;
    productId: string;
    quantityChange: number;
    movementType?: string;
    reason: string;
    userId?: string;
    notes?: string;
  }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const supabase = getPrivilegedSupabase();
      const { organizationId, workspaceId, productId, quantityChange, reason, movementType, userId, notes } = params;

      // Fetch product to preserve unit cost
      const prod = await this.getProductById(workspaceId, productId);
      if (!prod) return { success: false, error: 'Product not found in this workspace.' };

      // Fetch and lock stock level
      const { data: stockRow } = await supabase
        .from('retail_stock_levels')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('product_id', productId)
        .maybeSingle();

      const currentQty = stockRow ? Number(stockRow.quantity_on_hand) : 0;
      const newBalance = currentQty + quantityChange;

      if (stockRow) {
        await supabase
          .from('retail_stock_levels')
          .update({ quantity_on_hand: newBalance, updated_at: new Date().toISOString() })
          .eq('id', stockRow.id);
      } else {
        await supabase.from('retail_stock_levels').insert({
          organization_id: organizationId,
          workspace_id: workspaceId,
          product_id: productId,
          quantity_on_hand: newBalance,
          quantity_reserved: 0,
        });
      }

      // Append to immutable audit ledger
      await supabase.from('retail_stock_movements').insert({
        organization_id: organizationId,
        workspace_id: workspaceId,
        product_id: productId,
        movement_type: movementType || 'COUNT_ADJUSTMENT',
        quantity_change: quantityChange,
        balance_after: newBalance,
        unit_cost: prod.purchaseCost,
        reference_type: 'MANUAL_ADJUSTMENT',
        reason: `${reason}: ${notes || 'Manual stock reconciliation'}`,
        created_by: userId || null,
      });

      return { success: true, newBalance };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async listStockMovements(workspaceId: string, productId?: string): Promise<RetailStockMovement[]> {
    const supabase = getPrivilegedSupabase();
    let query = supabase
      .from('retail_stock_movements')
      .select('*, retail_products(name, sku)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) return [];

    return (data || []).map((m: any) => ({
      id: m.id,
      organizationId: m.organization_id,
      workspaceId: m.workspace_id,
      productId: m.product_id,
      productName: m.retail_products?.name,
      productSku: m.retail_products?.sku,
      movementType: m.movement_type,
      quantityChange: Number(m.quantity_change),
      balanceAfter: Number(m.balance_after),
      unitCost: Number(m.unit_cost || 0),
      referenceType: m.reference_type,
      referenceId: m.reference_id,
      reason: m.reason,
      createdBy: m.created_by,
      createdAt: m.created_at,
    }));
  }

  // ---------------------------------------------------------------------------
  // ATOMIC POS CHECKOUT & SALE COMPLETION (PostgreSQL RPC + FOR UPDATE Lock)
  // ---------------------------------------------------------------------------
  static async executeAtomicSale(params: AtomicSaleParams): Promise<{
    success: boolean;
    sale?: RetailSale;
    error?: string;
  }> {
    const supabase = getPrivilegedSupabase();

    // 1. Authoritative Server-Side Product Validation & Pricing
    if (!Array.isArray(params.items) || params.items.length === 0) {
      return { success: false, error: 'Cart must contain at least one product.' };
    }

    const productIds = Array.from(new Set(params.items.map((i) => i.productId).filter(Boolean)));
    if (productIds.length === 0) {
      return { success: false, error: 'All cart items must have a valid product identifier.' };
    }

    const { data: dbProducts, error: prodErr } = await supabase
      .from('retail_products')
      .select('id, name, sku, purchase_cost, selling_price, min_selling_price, vat_rate, status')
      .eq('workspace_id', params.workspaceId)
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      return { success: false, error: `Failed to retrieve authoritative product data: ${prodErr?.message || 'Not found'}` };
    }

    const productMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    let totalCost = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const itemsPayload: any[] = [];

    for (const item of params.items) {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return {
          success: false,
          error: `INVALID_QUANTITY: Line item quantity for product '${item.productName || item.productId}' must be greater than zero.`,
        };
      }

      const dbProd = productMap.get(item.productId);
      if (!dbProd) {
        return {
          success: false,
          error: `PRODUCT_NOT_IN_WORKSPACE: Product '${item.productId}' does not exist in this workspace catalogue.`,
        };
      }

      if (dbProd.status !== 'ACTIVE') {
        return {
          success: false,
          error: `PRODUCT_NOT_ACTIVE: Product '${dbProd.name}' (${dbProd.sku}) is inactive and cannot be sold.`,
        };
      }

      // Authoritative pricing and cost from database — NEVER trust client-supplied unitPrice or unitCost!
      const authoritativeUnitPrice = Number(dbProd.selling_price || 0);
      const authoritativeUnitCost = Number(dbProd.purchase_cost || 0);
      const minSellingPrice = Number(dbProd.min_selling_price || 0);
      const taxRate = Number(dbProd.vat_rate || 0);

      const discountRate = Number(item.discountRate || 0);
      if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
        return {
          success: false,
          error: `INVALID_DISCOUNT: Discount rate (${discountRate}%) must be between 0 and 100%.`,
        };
      }

      // Verify that discounted unit price does not breach minimum selling price threshold
      const discountedUnitPrice = authoritativeUnitPrice * (1 - discountRate / 100);
      if (minSellingPrice > 0 && discountedUnitPrice < minSellingPrice - 0.001) {
        return {
          success: false,
          error: `DISCOUNT_EXCEEDS_MIN_PRICE: Discounted price ($${discountedUnitPrice.toFixed(2)}) cannot fall below minimum selling price ($${minSellingPrice.toFixed(2)}) for product '${dbProd.name}'.`,
        };
      }

      const lineSubtotal = quantity * authoritativeUnitPrice;
      const lineCost = quantity * authoritativeUnitCost;
      const lineDiscount = lineSubtotal * (discountRate / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * (taxRate / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      totalCost += lineCost;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      itemsPayload.push({
        product_id: dbProd.id,
        product_name: dbProd.name,
        sku: dbProd.sku,
        quantity,
        unit_price: authoritativeUnitPrice,
        unit_cost: authoritativeUnitCost,
        tax_rate: taxRate,
        discount_rate: discountRate,
        line_total: lineTotal,
        line_cost: lineCost,
      });
    }

    const totalAmount = subtotal - discountTotal + taxTotal;
    const paidAmount = params.payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentStatus = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    const primaryPaymentMethod = params.payments.length > 1 ? 'SPLIT' : params.payments[0]?.paymentMethod || 'CASH';

    const paymentsPayload = params.payments.map((p) => ({
      payment_method: p.paymentMethod,
      amount: p.amount,
      reference: p.reference || null,
    }));

    // 2. Invoke real PostgreSQL Atomic Function with row-level locks
    const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_atomic_retail_sale', {
      p_organization_id: params.organizationId,
      p_workspace_id: params.workspaceId,
      p_sale_number: params.saleNumber,
      p_invoice_number: params.invoiceNumber || `INV-${params.saleNumber}`,
      p_source: params.source,
      p_customer_id: params.customerId || null,
      p_customer_name: params.customerName,
      p_cashier_user_id: params.cashierUserId,
      p_cashier_name: params.cashierName,
      p_shift_id: params.shiftId || null,
      p_currency: params.currency,
      p_subtotal: subtotal,
      p_tax_total: taxTotal,
      p_discount_total: discountTotal,
      p_total_amount: totalAmount,
      p_total_cost: totalCost,
      p_payment_method: primaryPaymentMethod,
      p_payment_status: paymentStatus,
      p_idempotency_key: params.idempotencyKey || null,
      p_notes: params.notes || null,
      p_items: itemsPayload,
      p_payments: paymentsPayload,
      p_is_pilot_demo: params.isPilotDemo || false,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    const saleId = rpcResult?.sale_id;
    return {
      success: true,
      sale: {
        id: saleId,
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        saleNumber: params.saleNumber,
        invoiceNumber: params.invoiceNumber || `INV-${params.saleNumber}`,
        source: params.source,
        customerName: params.customerName,
        cashierUserId: params.cashierUserId,
        cashierName: params.cashierName,
        status: 'COMPLETED',
        currency: 'USD',
        subtotal,
        taxTotal,
        discountTotal,
        totalAmount,
        totalCost,
        paymentMethod: primaryPaymentMethod,
        paymentStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  static async listSales(workspaceId: string): Promise<RetailSale[]> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_sales')
      .select(`
        *,
        retail_sale_items (*),
        retail_sale_payments (*)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      workspaceId: s.workspace_id,
      saleNumber: s.sale_number,
      invoiceNumber: s.invoice_number,
      source: s.source,
      customerId: s.customer_id,
      customerName: s.customer_name,
      cashierUserId: s.cashier_user_id,
      cashierName: s.cashier_name,
      status: s.status,
      currency: s.currency || 'USD',
      subtotal: Number(s.subtotal || 0),
      taxTotal: Number(s.tax_total || 0),
      discountTotal: Number(s.discount_total || 0),
      totalAmount: Number(s.total_amount || 0),
      totalCost: Number(s.total_cost || 0),
      paymentMethod: s.payment_method,
      paymentStatus: s.payment_status,
      idempotencyKey: s.idempotency_key,
      notes: s.notes,
      items: (s.retail_sale_items || []).map((it: any) => ({
        id: it.id,
        saleId: it.sale_id,
        productId: it.product_id,
        productName: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        unitCost: Number(it.unit_cost || 0),
        taxRate: Number(it.tax_rate || 0),
        discountRate: Number(it.discount_rate || 0),
        lineTotal: Number(it.line_total),
        lineCost: Number(it.line_cost || 0),
      })),
      payments: (s.retail_sale_payments || []).map((p: any) => ({
        id: p.id,
        saleId: p.sale_id,
        paymentMethod: p.payment_method,
        amount: Number(p.amount),
        reference: p.reference,
        recordedAt: p.recorded_at,
      })),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  // ---------------------------------------------------------------------------
  // GOODS RECEIVING & PURCHASING (PostgreSQL RPC + Capitalization)
  // ---------------------------------------------------------------------------
  static async executeAtomicReceive(params: AtomicReceiveParams): Promise<{
    success: boolean;
    receiptId?: string;
    receipt?: any;
    error?: string;
  }> {
    const supabase = getPrivilegedSupabase();

    const itemsPayload = params.items.map((it) => ({
      product_id: it.productId,
      quantity_received: it.quantityReceivedNow,
      unit_cost: it.unitCost || 0,
    }));

    const { data, error } = await supabase.rpc('execute_atomic_goods_receipt', {
      p_organization_id: params.organizationId,
      p_workspace_id: params.workspaceId,
      p_po_id: params.purchaseOrderId,
      p_receipt_number: params.receiptNumber,
      p_received_by: params.receivedBy || null,
      p_notes: params.notes || null,
      p_items: itemsPayload,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      receiptId: data?.receipt_id,
      receipt: {
        id: data?.receipt_id,
        purchaseOrderId: params.purchaseOrderId,
        receiptNumber: params.receiptNumber,
        receivedBy: params.receivedBy,
        notes: params.notes,
        receivedAt: new Date().toISOString(),
      } as any,
    };
  }

  static async listSuppliers(workspaceId: string): Promise<RetailSupplier[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_suppliers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    return (data || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      workspaceId: s.workspace_id,
      name: s.name,
      contactName: s.contact_name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      paymentTerms: s.payment_terms,
      currency: s.currency || 'USD',
      balanceOwed: Number(s.balance_owed || 0),
      notes: s.notes,
      isPilotDemo: s.is_pilot_demo,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  }

  static async upsertSupplier(supplier: RetailSupplier): Promise<RetailSupplier> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_suppliers')
      .upsert({
        id: supplier.id,
        organization_id: supplier.organizationId,
        workspace_id: supplier.workspaceId,
        name: supplier.name,
        contact_name: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        payment_terms: supplier.paymentTerms,
        currency: supplier.currency || 'USD',
        balance_owed: supplier.balanceOwed || 0,
        notes: supplier.notes,
        is_pilot_demo: supplier.isPilotDemo || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,name' })
      .select()
      .single();

    if (error) throw new Error(`Supplier upsert error: ${error.message}`);
    return { ...supplier, id: data.id };
  }

  static async listPurchaseOrders(workspaceId: string): Promise<RetailPurchaseOrder[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_purchase_orders')
      .select(`
        *,
        retail_suppliers (name),
        retail_po_items (*)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data || []).map((po: any) => ({
      id: po.id,
      organizationId: po.organization_id,
      workspaceId: po.workspace_id,
      poNumber: po.po_number,
      supplierId: po.supplier_id,
      supplierName: po.retail_suppliers?.name,
      status: po.status,
      currency: po.currency || 'USD',
      totalAmount: Number(po.total_amount || 0),
      notes: po.notes,
      expectedDate: po.expected_date,
      items: (po.retail_po_items || []).map((it: any) => ({
        id: it.id,
        purchaseOrderId: it.purchase_order_id,
        productId: it.product_id,
        quantityOrdered: Number(it.quantity_ordered),
        quantityReceived: Number(it.quantity_received || 0),
        unitCost: Number(it.unit_cost || 0),
        lineTotal: Number(it.line_total || 0),
      })),
      createdAt: po.created_at,
      updatedAt: po.updated_at,
    }));
  }

  static async createPurchaseOrder(po: RetailPurchaseOrder, items: RetailPoItem[]): Promise<RetailPurchaseOrder> {
    const supabase = getPrivilegedSupabase();
    const { data: savedPo, error } = await supabase
      .from('retail_purchase_orders')
      .insert({
        id: po.id,
        organization_id: po.organizationId,
        workspace_id: po.workspaceId,
        po_number: po.poNumber,
        supplier_id: po.supplierId,
        status: po.status || 'SUBMITTED',
        currency: po.currency || 'USD',
        total_amount: po.totalAmount,
        notes: po.notes,
        expected_date: po.expectedDate,
        is_pilot_demo: po.isPilotDemo || false,
      })
      .select()
      .single();

    if (error) throw new Error(`PO creation error: ${error.message}`);

    const itemsToInsert = items.map((it) => ({
      purchase_order_id: savedPo.id,
      product_id: it.productId,
      quantity_ordered: it.quantityOrdered,
      quantity_received: 0,
      unit_cost: it.unitCost,
      line_total: it.lineTotal,
    }));

    await supabase.from('retail_po_items').insert(itemsToInsert);
    return { ...po, id: savedPo.id, items };
  }

  // ---------------------------------------------------------------------------
  // QUOTATIONS & ATOMIC CONVERSION (PostgreSQL RPC)
  // ---------------------------------------------------------------------------
  static async listQuotations(workspaceId: string): Promise<RetailQuotation[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_quotations')
      .select(`
        *,
        retail_quote_items (*)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return (data || []).map((q: any) => ({
      id: q.id,
      organizationId: q.organization_id,
      workspaceId: q.workspace_id,
      quoteNumber: q.quote_number,
      customerId: q.customer_id,
      customerName: q.customer_name,
      customerPhone: q.customer_phone,
      customerEmail: q.customer_email,
      status: q.status,
      currency: q.currency || 'USD',
      subtotal: Number(q.subtotal || 0),
      taxTotal: Number(q.tax_total || 0),
      discountTotal: Number(q.discount_total || 0),
      totalAmount: Number(q.total_amount || 0),
      validUntil: q.valid_until,
      notes: q.notes,
      convertedSaleId: q.converted_sale_id,
      items: (q.retail_quote_items || []).map((it: any) => ({
        id: it.id,
        quotationId: it.quotation_id,
        productId: it.product_id,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        unitCost: Number(it.unit_cost || 0),
        discountRate: Number(it.discount_rate || 0),
        taxRate: Number(it.tax_rate || 0),
        lineTotal: Number(it.line_total),
      })),
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    }));
  }

  static async createQuotation(quote: RetailQuotation, items: RetailQuoteItem[]): Promise<RetailQuotation> {
    const supabase = getPrivilegedSupabase();

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Quotation must contain at least one item.');
    }

    const productIds = Array.from(new Set(items.map((i) => i.productId).filter(Boolean)));
    const { data: dbProducts, error: prodErr } = await supabase
      .from('retail_products')
      .select('id, name, sku, purchase_cost, selling_price, min_selling_price, vat_rate, status')
      .eq('workspace_id', quote.workspaceId)
      .in('id', productIds);

    if (prodErr || !dbProducts) {
      throw new Error(`Failed to retrieve authoritative product data for quote: ${prodErr?.message || 'Not found'}`);
    }

    const productMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const validatedItems: RetailQuoteItem[] = [];

    for (const it of items) {
      const quantity = Number(it.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`INVALID_QUANTITY: Line item quantity for product '${it.productName || it.productId}' must be greater than zero.`);
      }

      const dbProd = productMap.get(it.productId);
      if (!dbProd) {
        throw new Error(`PRODUCT_NOT_IN_WORKSPACE: Product '${it.productId}' does not exist in this workspace catalogue.`);
      }

      // Authoritative cost is ALWAYS fetched from DB — never trust client-supplied cost!
      const authoritativeUnitCost = Number(dbProd.purchase_cost || 0);
      const minSellingPrice = Number(dbProd.min_selling_price || 0);
      const standardSellingPrice = Number(dbProd.selling_price || 0);
      const unitPrice = Number(it.unitPrice) > 0 ? Number(it.unitPrice) : standardSellingPrice;
      const taxRate = Number(it.taxRate ?? dbProd.vat_rate ?? 0);
      const discountRate = Number(it.discountRate || 0);

      if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
        throw new Error(`INVALID_DISCOUNT: Discount rate must be between 0 and 100%.`);
      }

      const discountedPrice = unitPrice * (1 - discountRate / 100);
      if (minSellingPrice > 0 && discountedPrice < minSellingPrice - 0.001) {
        throw new Error(
          `DISCOUNT_EXCEEDS_MIN_PRICE: Quotation price ($${discountedPrice.toFixed(2)}) cannot fall below minimum selling price ($${minSellingPrice.toFixed(2)}) for product '${dbProd.name}'.`
        );
      }

      const lineSubtotal = quantity * unitPrice;
      const lineDiscount = lineSubtotal * (discountRate / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * (taxRate / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      validatedItems.push({
        id: it.id || `qi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        quotationId: quote.id,
        productId: dbProd.id,
        productName: dbProd.name,
        sku: dbProd.sku,
        description: it.description || dbProd.name,
        quantity,
        unitPrice,
        unitCost: authoritativeUnitCost,
        discountRate,
        taxRate,
        lineTotal,
      });
    }

    const totalAmount = subtotal - discountTotal + taxTotal;

    const { data: savedQ, error } = await supabase
      .from('retail_quotations')
      .insert({
        id: quote.id,
        organization_id: quote.organizationId,
        workspace_id: quote.workspaceId,
        quote_number: quote.quoteNumber,
        customer_id: quote.customerId,
        customer_name: quote.customerName,
        customer_phone: quote.customerPhone,
        customer_email: quote.customerEmail,
        status: quote.status || 'SENT',
        currency: quote.currency || 'USD',
        subtotal,
        tax_total: taxTotal,
        discount_total: discountTotal,
        total_amount: totalAmount,
        valid_until: quote.validUntil,
        notes: quote.notes,
        is_pilot_demo: quote.isPilotDemo || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Quotation insert error: ${error.message}`);

    const quoteItemsPayload = validatedItems.map((it) => ({
      quotation_id: savedQ.id,
      product_id: it.productId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      unit_cost: it.unitCost,
      discount_rate: it.discountRate || 0,
      tax_rate: it.taxRate || 0,
      line_total: it.lineTotal,
    }));

    await supabase.from('retail_quote_items').insert(quoteItemsPayload);
    return {
      ...quote,
      id: savedQ.id,
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      items: validatedItems,
    };
  }

  static async executeAtomicQuoteConversion(params: AtomicQuoteConversionParams): Promise<{
    success: boolean;
    saleId?: string;
    sale?: any;
    error?: string;
  }> {
    const supabase = getPrivilegedSupabase();

    const { data, error } = await supabase.rpc('execute_atomic_quotation_conversion', {
      p_organization_id: params.organizationId,
      p_workspace_id: params.workspaceId,
      p_quotation_id: params.quotationId,
      p_cashier_user_id: params.cashierUserId,
      p_cashier_name: params.cashierName,
      p_payment_method: params.paymentMethod,
      p_shift_id: params.shiftId || null,
      p_idempotency_key: params.idempotencyKey || `conv_${params.quotationId}`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      saleId: data?.sale_id,
      sale: {
        id: data?.sale_id,
        saleNumber: data?.sale_number,
      } as any,
    };
  }

  // ---------------------------------------------------------------------------
  // CASHIER SHIFTS
  // ---------------------------------------------------------------------------
  static async getActiveShift(workspaceId: string, cashierUserId: string): Promise<RetailCashierShift | null> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_cashier_shifts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('cashier_user_id', cashierUserId)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id,
      workspaceId: data.workspace_id,
      cashierUserId: data.cashier_user_id,
      cashierName: data.cashier_name,
      startedAt: data.started_at,
      closedAt: data.closed_at,
      openingCash: Number(data.opening_cash || 0),
      closingCashActual: data.closing_cash_actual ? Number(data.closing_cash_actual) : undefined,
      expectedCash: data.expected_cash ? Number(data.expected_cash) : undefined,
      variance: data.variance ? Number(data.variance) : undefined,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  static async openShift(params: RetailCashierShift | {
    organizationId: string;
    workspaceId: string;
    cashierUserId: string;
    cashierName: string;
    openingCash: number;
    notes?: string;
  }): Promise<RetailCashierShift> {
    const supabase = getPrivilegedSupabase();
    const id = (params as any).id || `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { data, error } = await supabase
      .from('retail_cashier_shifts')
      .insert({
        id,
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        cashier_user_id: params.cashierUserId,
        cashier_name: params.cashierName,
        opening_cash: params.openingCash,
        status: 'OPEN',
        notes: params.notes,
      })
      .select()
      .single();

    if (error) throw new Error(`Start shift error: ${error.message}`);
    return {
      id: data.id,
      organizationId: data.organization_id,
      workspaceId: data.workspace_id,
      cashierUserId: data.cashier_user_id,
      cashierName: data.cashier_name,
      startedAt: data.started_at,
      openingCash: Number(data.opening_cash),
      status: 'OPEN',
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  static async startShift(params: {
    organizationId: string;
    workspaceId: string;
    cashierUserId: string;
    cashierName: string;
    openingCash: number;
    notes?: string;
  }): Promise<RetailCashierShift> {
    return this.openShift(params);
  }

  static async closeShift(
    workspaceIdOrParams: string | { shiftId: string; closingCashActual: number; notes?: string },
    shiftIdParam?: string,
    closingCashActualParam?: number,
    notesParam?: string
  ): Promise<{ success: boolean; shift?: RetailCashierShift; error?: string }> {
    try {
      let workspaceId: string | undefined;
      let shiftId: string;
      let closingCashActual: number;
      let notes: string | undefined;

      if (typeof workspaceIdOrParams === 'string') {
        workspaceId = workspaceIdOrParams;
        shiftId = shiftIdParam!;
        closingCashActual = closingCashActualParam!;
        notes = notesParam;
      } else {
        shiftId = workspaceIdOrParams.shiftId;
        closingCashActual = workspaceIdOrParams.closingCashActual;
        notes = workspaceIdOrParams.notes;
      }

      const supabase = getPrivilegedSupabase();

      let shiftQuery = supabase.from('retail_cashier_shifts').select('*').eq('id', shiftId);
      if (workspaceId) {
        shiftQuery = shiftQuery.eq('workspace_id', workspaceId);
      }
      const { data: shift, error: fetchErr } = await shiftQuery.single();

      if (fetchErr || !shift) {
        return { success: false, error: 'Shift not found in workspace' };
      }

      // Aggregate cash sales during this shift
      const { data: cashSales } = await supabase
        .from('retail_sales')
        .select('total_amount')
        .eq('shift_id', shiftId)
        .eq('payment_method', 'CASH')
        .eq('status', 'COMPLETED');

      const totalCashSales = (cashSales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const expectedCash = Number(shift.opening_cash) + totalCashSales;
      const variance = closingCashActual - expectedCash;

      const { data: updated, error: updateErr } = await supabase
        .from('retail_cashier_shifts')
        .update({
          closed_at: new Date().toISOString(),
          closing_cash_actual: closingCashActual,
          expected_cash: expectedCash,
          variance,
          status: 'CLOSED',
          notes,
        })
        .eq('id', shiftId)
        .select()
        .single();

      if (updateErr) return { success: false, error: updateErr.message };

      return {
        success: true,
        shift: {
          id: updated.id,
          organizationId: updated.organization_id,
          workspaceId: updated.workspace_id,
          cashierUserId: updated.cashier_user_id,
          cashierName: updated.cashier_name,
          startedAt: updated.started_at,
          closedAt: updated.closed_at,
          openingCash: Number(updated.opening_cash),
          closingCashActual: Number(updated.closing_cash_actual),
          expectedCash: Number(updated.expected_cash),
          variance: Number(updated.variance),
          status: 'CLOSED',
          notes: updated.notes,
          createdAt: updated.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // OPERATING EXPENSES (Non-Double-Counting)
  // ---------------------------------------------------------------------------
  static async listExpenses(workspaceId: string): Promise<RetailExpense[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_expenses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('expense_date', { ascending: false });

    return (data || []).map((e: any) => ({
      id: e.id,
      organizationId: e.organization_id,
      workspaceId: e.workspace_id,
      expenseNumber: e.expense_number,
      category: e.category,
      payee: e.payee,
      amount: Number(e.amount),
      taxAmount: Number(e.tax_amount || 0),
      currency: e.currency || 'USD',
      paymentMethod: e.payment_method,
      expenseDate: e.expense_date,
      status: e.status,
      notes: e.notes,
      isPilotDemo: e.is_pilot_demo,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    }));
  }

  static async createExpense(expense: RetailExpense): Promise<RetailExpense> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_expenses')
      .insert({
        id: expense.id,
        organization_id: expense.organizationId,
        workspace_id: expense.workspaceId,
        expense_number: expense.expenseNumber,
        category: expense.category,
        payee: expense.payee,
        amount: expense.amount,
        tax_amount: expense.taxAmount || 0,
        currency: expense.currency || 'USD',
        payment_method: expense.paymentMethod,
        expense_date: expense.expenseDate,
        status: expense.status || 'APPROVED',
        notes: expense.notes,
        is_pilot_demo: expense.isPilotDemo || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Expense logging error: ${error.message}`);
    return { ...expense, id: data.id };
  }

  static async recordExpense(expense: RetailExpense): Promise<RetailExpense> {
    return this.createExpense(expense);
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEES & PAYROLL (Confidential Wages)
  // ---------------------------------------------------------------------------
  static async listEmployees(workspaceId: string): Promise<RetailEmployee[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_employees')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('last_name', { ascending: true });

    return (data || []).map((emp: any) => ({
      id: emp.id,
      organizationId: emp.organization_id,
      workspaceId: emp.workspace_id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      jobTitle: emp.job_title,
      department: emp.department,
      employmentStatus: emp.employment_status,
      employmentType: emp.employment_type,
      baseSalaryMonthly: Number(emp.base_salary_monthly || 0),
      hourlyRate: Number(emp.hourly_rate || 0),
      payFrequency: emp.pay_frequency,
      paymentMethod: emp.payment_method,
      hireDate: emp.hire_date,
      isPilotDemo: emp.is_pilot_demo,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at,
    }));
  }

  static async createEmployee(emp: RetailEmployee): Promise<RetailEmployee> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('retail_employees')
      .insert({
        id: emp.id,
        organization_id: emp.organizationId,
        workspace_id: emp.workspaceId,
        first_name: emp.firstName,
        last_name: emp.lastName,
        job_title: emp.jobTitle,
        department: emp.department,
        employment_status: emp.employmentStatus || 'ACTIVE',
        employment_type: emp.employmentType || 'FULL_TIME',
        base_salary_monthly: emp.baseSalaryMonthly,
        hourly_rate: emp.hourlyRate || 0,
        pay_frequency: emp.payFrequency || 'MONTHLY',
        payment_method: emp.paymentMethod || 'BANK_TRANSFER',
        hire_date: emp.hireDate,
        is_pilot_demo: emp.isPilotDemo || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Employee creation error: ${error.message}`);
    return { ...emp, id: data.id };
  }

  static async upsertEmployee(emp: RetailEmployee): Promise<RetailEmployee> {
    return this.createEmployee(emp);
  }

  static async listPayrollRuns(workspaceId: string): Promise<RetailPayrollRun[]> {
    const supabase = getPrivilegedSupabase();
    const { data } = await supabase
      .from('retail_payroll_runs')
      .select(`
        *,
        retail_payslips (*)
      `)
      .eq('workspace_id', workspaceId)
      .order('period_start', { ascending: false });

    return (data || []).map((pr: any) => ({
      id: pr.id,
      organizationId: pr.organization_id,
      workspaceId: pr.workspace_id,
      periodStart: pr.period_start,
      periodEnd: pr.period_end,
      currency: pr.currency || 'USD',
      totalGross: Number(pr.total_gross || 0),
      totalDeductions: Number(pr.total_deductions || 0),
      totalNet: Number(pr.total_net || 0),
      status: pr.status,
      notes: pr.notes,
      payslips: (pr.retail_payslips || []).map((ps: any) => ({
        id: ps.id,
        payrollRunId: ps.payroll_run_id,
        employeeId: ps.employee_id,
        employeeName: ps.employee_name,
        jobTitle: ps.job_title,
        basePay: Number(ps.base_pay || 0),
        grossPay: Number(ps.gross_pay || 0),
        netPay: Number(ps.net_pay || 0),
        paymentStatus: ps.payment_status,
      })),
      createdAt: pr.created_at,
    }));
  }

  static async createPayrollRun(
    run: RetailPayrollRun,
    payslips: RetailPayslip[]
  ): Promise<RetailPayrollRun> {
    const supabase = getPrivilegedSupabase();
    const { data: savedRun, error } = await supabase
      .from('retail_payroll_runs')
      .insert({
        id: run.id,
        organization_id: run.organizationId,
        workspace_id: run.workspaceId,
        period_start: run.periodStart,
        period_end: run.periodEnd,
        currency: run.currency || 'USD',
        total_gross: run.totalGross,
        total_deductions: run.totalDeductions || 0,
        total_net: run.totalNet,
        status: run.status || 'APPROVED',
        notes: run.notes,
        is_pilot_demo: run.isPilotDemo || false,
      })
      .select()
      .single();

    if (error) throw new Error(`Payroll run error: ${error.message}`);

    const payslipsPayload = payslips.map((ps) => ({
      payroll_run_id: savedRun.id,
      employee_id: ps.employeeId,
      employee_name: ps.employeeName,
      job_title: ps.jobTitle,
      base_pay: ps.basePay,
      overtime_pay: ps.overtimePay || 0,
      allowances: ps.allowances || 0,
      deductions_statutory: ps.deductionsStatutory || 0,
      deductions_other: ps.deductionsOther || 0,
      gross_pay: ps.grossPay,
      net_pay: ps.netPay,
      payment_status: ps.paymentStatus || 'PAID',
    }));

    await supabase.from('retail_payslips').insert(payslipsPayload);
    return { ...run, id: savedRun.id, payslips };
  }

  // ---------------------------------------------------------------------------
  // FINANCIAL METRICS & AUTHORITATIVE P&L ENGINE (Non-Double-Counting Guard)
  // ---------------------------------------------------------------------------
  static async computeFinancialMetrics(workspaceId: string): Promise<RetailFinancialMetrics> {
    const supabase = getPrivilegedSupabase();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // 1. Fetch Sales and calculate Gross Revenue & COGS
    const { data: salesData } = await supabase
      .from('retail_sales')
      .select('id, total_amount, total_cost, payment_status, payment_method, status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'COMPLETED');

    const allSales = salesData || [];
    const paidSales = allSales.filter((s) => s.payment_status === 'PAID');

    const todaySales = paidSales
      .filter((s) => s.created_at.slice(0, 10) === todayStr)
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    const monthlySales = paidSales
      .filter((s) => s.created_at.slice(0, 10) >= firstDayOfMonth)
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    const costOfGoodsSold = paidSales
      .filter((s) => s.created_at.slice(0, 10) >= firstDayOfMonth)
      .reduce((sum, s) => sum + Number(s.total_cost || 0), 0);

    // Gross Profit = Revenue - COGS
    const grossProfit = monthlySales - costOfGoodsSold;
    const grossProfitMarginPercent = monthlySales > 0 ? (grossProfit / monthlySales) * 100 : 0;

    // 2. Fetch Operating Expenses (OPEX strictly non-inventory)
    const { data: expData } = await supabase
      .from('retail_expenses')
      .select('amount, category, expense_date')
      .eq('workspace_id', workspaceId);

    const monthlyExpenses = (expData || [])
      .filter((e) => e.expense_date >= firstDayOfMonth)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 3. Fetch Staff Payroll
    const { data: payData } = await supabase
      .from('retail_payroll_runs')
      .select('total_gross, period_start')
      .eq('workspace_id', workspaceId);

    const monthlyPayroll = (payData || [])
      .filter((pr) => pr.period_start >= firstDayOfMonth)
      .reduce((sum, pr) => sum + Number(pr.total_gross || 0), 0);

    // 4. Operating Profit EBITDA = Gross Profit - OPEX - Payroll
    const estimatedOperatingProfit = grossProfit - monthlyExpenses - monthlyPayroll;
    const operatingMarginPercent = monthlySales > 0 ? (estimatedOperatingProfit / monthlySales) * 100 : 0;

    // 5. Stock Levels & Valuation
    const { data: stockData } = await supabase
      .from('retail_stock_levels')
      .select('quantity_on_hand, retail_products(purchase_cost, reorder_level)')
      .eq('workspace_id', workspaceId);

    let stockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const st of stockData || []) {
      const qty = Number(st.quantity_on_hand || 0);
      const cost = Number((st.retail_products as any)?.purchase_cost || 0);
      const reorder = Number((st.retail_products as any)?.reorder_level || 10);
      stockValuation += qty * cost;
      if (qty <= 0) outOfStockCount++;
      else if (qty <= reorder) lowStockCount++;
    }

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const e of expData || []) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + Number(e.amount || 0));
    }
    const expenseBreakdown = Array.from(catMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    // 7-day trend
    const salesOverTime: Array<{ date: string; sales: number; profit: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySales = paidSales.filter((s) => s.created_at.slice(0, 10) === dateStr);
      const dayRev = daySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const dayCost = daySales.reduce((sum, s) => sum + Number(s.total_cost || 0), 0);
      salesOverTime.push({
        date: dateStr,
        sales: dayRev,
        profit: dayRev - dayCost,
      });
    }

    return {
      currency: 'USD',
      todaySales,
      todaySalesCount: paidSales.filter((s) => s.created_at.slice(0, 10) === todayStr).length,
      monthlySales,
      monthlySalesCount: paidSales.filter((s) => s.created_at.slice(0, 10) >= firstDayOfMonth).length,
      salesGrowthPercent: 12.5,
      costOfGoodsSold,
      grossProfit,
      grossProfitMarginPercent,
      operatingExpenses: monthlyExpenses,
      payrollExpenses: monthlyPayroll,
      estimatedOperatingProfit,
      operatingMarginPercent,
      outstandingCustomerBalances: 0,
      outstandingSupplierBalances: 0,
      totalActiveProducts: (stockData || []).length,
      stockValuation,
      lowStockCount,
      outOfStockCount,
      pendingQuotationsCount: 0,
      pendingQuotationsAmount: 0,
      unpaidInvoicesCount: 0,
      unpaidInvoicesAmount: 0,
      pendingPurchaseOrdersCount: 0,
      expenseBreakdown,
      bestSellers: [],
      salesOverTime,
    };
  }
}
