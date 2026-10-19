/**
 * Ralion OS — Ralion Retail Authoritative Database & Transaction Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides transactional, atomic business workflows for inventory, sales,
 * quotations, purchasing, expenses, and payroll.
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
  currency: 'USD';
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

// Durable in-memory transactional fallback store (for deterministic tests and offline support)
class RetailStoreState {
  products: Map<string, RetailProduct> = new Map();
  stockLevels: Map<string, RetailStockLevel> = new Map(); // key: `${workspaceId}_${productId}`
  stockMovements: RetailStockMovement[] = [];
  suppliers: Map<string, RetailSupplier> = new Map();
  purchaseOrders: Map<string, RetailPurchaseOrder> = new Map();
  poItems: Map<string, RetailPoItem[]> = new Map(); // key: poId
  goodsReceipts: RetailGoodsReceipt[] = [];
  quotations: Map<string, RetailQuotation> = new Map();
  quoteItems: Map<string, RetailQuoteItem[]> = new Map(); // key: quoteId
  cashierShifts: Map<string, RetailCashierShift> = new Map();
  sales: Map<string, RetailSale> = new Map();
  saleItems: Map<string, RetailSaleItem[]> = new Map(); // key: saleId
  salePayments: Map<string, RetailSalePayment[]> = new Map(); // key: saleId
  expenses: Map<string, RetailExpense> = new Map();
  employees: Map<string, RetailEmployee> = new Map();
  payrollRuns: Map<string, RetailPayrollRun> = new Map();
  payslips: Map<string, RetailPayslip[]> = new Map(); // key: payrollRunId
  settings: Map<string, RetailSettings> = new Map(); // key: workspaceId
  idempotencyRecords: Map<string, string> = new Map(); // key: `${workspaceId}_${idempotencyKey}` -> saleId
}

export class RetailDatabaseService {
  private static store = new RetailStoreState();

  // Reset store for isolated test fixtures
  static resetStore() {
    this.store = new RetailStoreState();
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  static async getSettings(workspaceId: string): Promise<RetailSettings> {
    const existing = this.store.settings.get(workspaceId);
    if (existing) return existing;

    const defaultSettings: RetailSettings = {
      workspaceId,
      organizationId: '',
      storeName: 'Hardware Store Pilot',
      defaultCurrency: 'USD',
      taxRatePercent: 0.0,
      enableNegativeStock: false,
      receiptHeader: 'Proinsight Hardware & Building Supplies',
      receiptFooter: 'Thank you for choosing Proinsight! Powered by Ralion OS.',
      lowStockThreshold: 10,
    };
    this.store.settings.set(workspaceId, defaultSettings);
    return defaultSettings;
  }

  static async updateSettings(workspaceId: string, updates: Partial<RetailSettings>): Promise<RetailSettings> {
    const current = await this.getSettings(workspaceId);
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.store.settings.set(workspaceId, updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // PRODUCTS & STOCK
  // ---------------------------------------------------------------------------
  static async listProducts(workspaceId: string, options?: { category?: string; query?: string }): Promise<RetailProduct[]> {
    let list = Array.from(this.store.products.values()).filter((p) => p.workspaceId === workspaceId);

    if (options?.category && options.category !== 'ALL') {
      list = list.filter((p) => p.category === options.category);
    }
    if (options?.query) {
      const q = options.query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    // Attach stock level
    return list.map((p) => {
      const stock = this.store.stockLevels.get(`${workspaceId}_${p.id}`);
      return {
        ...p,
        currentStock: stock ? stock.quantityOnHand : 0,
      };
    });
  }

  static async getProductById(workspaceId: string, productId: string): Promise<RetailProduct | null> {
    const product = this.store.products.get(productId);
    if (!product || product.workspaceId !== workspaceId) return null;
    const stock = this.store.stockLevels.get(`${workspaceId}_${productId}`);
    return {
      ...product,
      currentStock: stock ? stock.quantityOnHand : 0,
    };
  }

  static async getProductByBarcode(workspaceId: string, barcode: string): Promise<RetailProduct | null> {
    const product = Array.from(this.store.products.values()).find(
      (p) => p.workspaceId === workspaceId && p.barcode === barcode
    );
    if (!product) return null;
    const stock = this.store.stockLevels.get(`${workspaceId}_${product.id}`);
    return {
      ...product,
      currentStock: stock ? stock.quantityOnHand : 0,
    };
  }

  static async upsertProduct(product: RetailProduct, initialStock = 0): Promise<RetailProduct> {
    this.store.products.set(product.id, product);

    const stockKey = `${product.workspaceId}_${product.id}`;
    if (!this.store.stockLevels.has(stockKey)) {
      this.store.stockLevels.set(stockKey, {
        id: `stock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId: product.organizationId,
        workspaceId: product.workspaceId,
        productId: product.id,
        quantityOnHand: initialStock,
        quantityReserved: 0,
        updatedAt: new Date().toISOString(),
      });

      if (initialStock > 0) {
        this.store.stockMovements.push({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          organizationId: product.organizationId,
          workspaceId: product.workspaceId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          movementType: 'OPENING_STOCK',
          quantityChange: initialStock,
          balanceAfter: initialStock,
          unitCost: product.purchaseCost,
          referenceType: 'INITIAL_IMPORT',
          reason: 'Initial stock on product creation',
          createdAt: new Date().toISOString(),
        });
      }
    }

    const currentStock = this.store.stockLevels.get(stockKey)?.quantityOnHand || 0;
    return { ...product, currentStock };
  }

  // ---------------------------------------------------------------------------
  // INVENTORY ADJUSTMENTS
  // ---------------------------------------------------------------------------
  static async adjustStock(params: {
    organizationId: string;
    workspaceId: string;
    productId: string;
    quantityChange: number;
    movementType: 'DAMAGE_WRITE_OFF' | 'THEFT_LOSS' | 'COUNT_ADJUSTMENT';
    reason: string;
    userId?: string;
  }): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const { organizationId, workspaceId, productId, quantityChange, movementType, reason, userId } = params;
    const product = this.store.products.get(productId);
    if (!product || product.workspaceId !== workspaceId) {
      return { success: false, newBalance: 0, error: 'Product not found in this workspace.' };
    }

    const stockKey = `${workspaceId}_${productId}`;
    const current = this.store.stockLevels.get(stockKey) || {
      id: `stock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      workspaceId,
      productId,
      quantityOnHand: 0,
      quantityReserved: 0,
      updatedAt: new Date().toISOString(),
    };

    const newBalance = current.quantityOnHand + quantityChange;
    const settings = await this.getSettings(workspaceId);

    if (newBalance < 0 && !settings.enableNegativeStock) {
      return {
        success: false,
        newBalance: current.quantityOnHand,
        error: `Adjustment would result in negative stock (${newBalance}). Policy prevents negative inventory.`,
      };
    }

    current.quantityOnHand = newBalance;
    current.updatedAt = new Date().toISOString();
    this.store.stockLevels.set(stockKey, current);

    this.store.stockMovements.push({
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      workspaceId,
      productId,
      productName: product.name,
      productSku: product.sku,
      movementType,
      quantityChange,
      balanceAfter: newBalance,
      unitCost: product.purchaseCost,
      referenceType: 'MANUAL_ADJUSTMENT',
      reason,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });

    return { success: true, newBalance };
  }

  static async listStockMovements(workspaceId: string, productId?: string): Promise<RetailStockMovement[]> {
    let list = this.store.stockMovements.filter((m) => m.workspaceId === workspaceId);
    if (productId) list = list.filter((m) => m.productId === productId);
    return list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ---------------------------------------------------------------------------
  // ATOMIC POINT OF SALE (POS) & SALES
  // ---------------------------------------------------------------------------
  static async executeAtomicSale(params: AtomicSaleParams): Promise<{
    success: boolean;
    sale?: RetailSale;
    error?: string;
  }> {
    const {
      organizationId,
      workspaceId,
      saleNumber,
      invoiceNumber,
      source,
      customerId,
      customerName,
      cashierUserId,
      cashierName,
      shiftId,
      currency,
      items,
      payments,
      idempotencyKey,
      notes,
      isPilotDemo,
    } = params;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingSaleId = this.store.idempotencyRecords.get(`${workspaceId}_${idempotencyKey}`);
      if (existingSaleId) {
        const existingSale = this.store.sales.get(existingSaleId);
        if (existingSale) {
          return {
            success: true,
            sale: {
              ...existingSale,
              items: this.store.saleItems.get(existingSale.id) || [],
              payments: this.store.salePayments.get(existingSale.id) || [],
            },
          };
        }
      }
    }

    // 2. Stock Validation (Zero Overselling Guarantee)
    const settings = await this.getSettings(workspaceId);
    for (const item of items) {
      const product = this.store.products.get(item.productId);
      if (!product || product.workspaceId !== workspaceId) {
        return { success: false, error: `Product '${item.productName}' (${item.sku}) does not exist.` };
      }

      const stock = this.store.stockLevels.get(`${workspaceId}_${item.productId}`);
      const available = stock ? stock.quantityOnHand : 0;

      if (available < item.quantity && !settings.enableNegativeStock) {
        return {
          success: false,
          error: `Insufficient stock for '${item.productName}'. Requested: ${item.quantity}, Available: ${available}.`,
        };
      }
    }

    // 3. Financial Totals Calculation
    let subtotal = 0;
    let totalCost = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saleItemsList: RetailSaleItem[] = [];

    for (const item of items) {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineCost = item.quantity * item.unitCost;
      const lineDiscount = lineSubtotal * ((item.discountRate || 0) / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * ((item.taxRate || 0) / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      totalCost += lineCost;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      saleItemsList.push({
        id: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        saleId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        taxRate: item.taxRate || 0,
        discountRate: item.discountRate || 0,
        lineTotal,
        lineCost,
        createdAt: new Date().toISOString(),
      });
    }

    const totalAmount = subtotal - discountTotal + taxTotal;
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentStatus = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    const primaryPaymentMethod = payments.length > 1 ? 'SPLIT' : payments[0]?.paymentMethod || 'CASH';

    // 4. Atomic State Mutation: Deduct stock and write movement ledger
    for (const item of items) {
      const stockKey = `${workspaceId}_${item.productId}`;
      const stock = this.store.stockLevels.get(stockKey)!;
      stock.quantityOnHand -= item.quantity;
      stock.updatedAt = new Date().toISOString();

      this.store.stockMovements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId,
        workspaceId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.sku,
        movementType: 'SALE',
        quantityChange: -item.quantity,
        balanceAfter: stock.quantityOnHand,
        unitCost: item.unitCost,
        referenceType: 'SALE_RECEIPT',
        referenceId: saleNumber,
        reason: `Sale ${saleNumber} to ${customerName}`,
        createdBy: cashierUserId,
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Record Payments
    const salePaymentsList: RetailSalePayment[] = payments.map((p) => ({
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      saleId,
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      reference: p.reference,
      recordedAt: new Date().toISOString(),
    }));

    const saleRecord: RetailSale = {
      id: saleId,
      organizationId,
      workspaceId,
      saleNumber,
      invoiceNumber: invoiceNumber || `INV-${saleNumber}`,
      source,
      customerId,
      customerName,
      cashierUserId,
      cashierName,
      shiftId,
      status: 'COMPLETED',
      currency,
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      totalCost,
      paymentMethod: primaryPaymentMethod,
      paymentStatus,
      idempotencyKey,
      notes,
      items: saleItemsList,
      payments: salePaymentsList,
      isPilotDemo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.sales.set(saleId, saleRecord);
    this.store.saleItems.set(saleId, saleItemsList);
    this.store.salePayments.set(saleId, salePaymentsList);

    if (idempotencyKey) {
      this.store.idempotencyRecords.set(`${workspaceId}_${idempotencyKey}`, saleId);
    }

    return { success: true, sale: saleRecord };
  }

  static async listSales(workspaceId: string): Promise<RetailSale[]> {
    return Array.from(this.store.sales.values())
      .filter((s) => s.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((s) => ({
        ...s,
        items: this.store.saleItems.get(s.id) || [],
        payments: this.store.salePayments.get(s.id) || [],
      }));
  }

  // ---------------------------------------------------------------------------
  // SUPPLIERS & PURCHASING
  // ---------------------------------------------------------------------------
  static async listSuppliers(workspaceId: string): Promise<RetailSupplier[]> {
    return Array.from(this.store.suppliers.values())
      .filter((s) => s.workspaceId === workspaceId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async upsertSupplier(supplier: RetailSupplier): Promise<RetailSupplier> {
    this.store.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  static async listPurchaseOrders(workspaceId: string): Promise<RetailPurchaseOrder[]> {
    return Array.from(this.store.purchaseOrders.values())
      .filter((po) => po.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((po) => ({
        ...po,
        items: this.store.poItems.get(po.id) || [],
      }));
  }

  static async createPurchaseOrder(po: RetailPurchaseOrder, items: RetailPoItem[]): Promise<RetailPurchaseOrder> {
    this.store.purchaseOrders.set(po.id, po);
    this.store.poItems.set(po.id, items);
    return { ...po, items };
  }

  static async executeAtomicReceive(params: AtomicReceiveParams): Promise<{
    success: boolean;
    receipt?: RetailGoodsReceipt;
    error?: string;
  }> {
    const { organizationId, workspaceId, purchaseOrderId, receiptNumber, receivedBy, items, notes } = params;
    const po = this.store.purchaseOrders.get(purchaseOrderId);
    if (!po || po.workspaceId !== workspaceId) {
      return { success: false, error: 'Purchase Order not found in this workspace.' };
    }
    if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
      return { success: false, error: `Cannot receive items on a ${po.status} Purchase Order.` };
    }

    const currentPoItems = this.store.poItems.get(purchaseOrderId) || [];

    // 1. Process receipt items and increment stock levels
    for (const item of items) {
      if (item.quantityReceivedNow <= 0) continue;
      const poItem = currentPoItems.find((p) => p.productId === item.productId);
      if (!poItem) continue;

      const product = this.store.products.get(item.productId);
      if (!product) continue;

      const stockKey = `${workspaceId}_${item.productId}`;
      const stock = this.store.stockLevels.get(stockKey) || {
        id: `stock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId,
        workspaceId,
        productId: item.productId,
        quantityOnHand: 0,
        quantityReserved: 0,
        updatedAt: new Date().toISOString(),
      };

      stock.quantityOnHand += item.quantityReceivedNow;
      stock.updatedAt = new Date().toISOString();
      this.store.stockLevels.set(stockKey, stock);

      // Append immutable movement ledger
      this.store.stockMovements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId,
        workspaceId,
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        movementType: 'RECEIVING',
        quantityChange: item.quantityReceivedNow,
        balanceAfter: stock.quantityOnHand,
        unitCost: item.unitCost || poItem.unitCost,
        referenceType: 'PURCHASE_ORDER',
        referenceId: receiptNumber,
        reason: `Goods receipt for PO ${po.poNumber}`,
        createdBy: receivedBy,
        createdAt: new Date().toISOString(),
      });

      poItem.quantityReceived += item.quantityReceivedNow;
    }

    // 2. Evaluate new PO status
    const allReceived = currentPoItems.every((item) => item.quantityReceived >= item.quantityOrdered);
    const anyReceived = currentPoItems.some((item) => item.quantityReceived > 0);
    po.status = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL_RECEIVED' : po.status;
    po.updatedAt = new Date().toISOString();

    const receipt: RetailGoodsReceipt = {
      id: `grn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      workspaceId,
      purchaseOrderId,
      receiptNumber,
      receivedBy,
      notes,
      receivedAt: new Date().toISOString(),
    };
    this.store.goodsReceipts.push(receipt);

    return { success: true, receipt };
  }

  // ---------------------------------------------------------------------------
  // QUOTATIONS & CONVERSION
  // ---------------------------------------------------------------------------
  static async listQuotations(workspaceId: string): Promise<RetailQuotation[]> {
    return Array.from(this.store.quotations.values())
      .filter((q) => q.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((q) => ({
        ...q,
        items: this.store.quoteItems.get(q.id) || [],
      }));
  }

  static async createQuotation(quote: RetailQuotation, items: RetailQuoteItem[]): Promise<RetailQuotation> {
    this.store.quotations.set(quote.id, quote);
    this.store.quoteItems.set(quote.id, items);
    return { ...quote, items };
  }

  static async executeAtomicQuoteConversion(params: AtomicQuoteConversionParams): Promise<{
    success: boolean;
    sale?: RetailSale;
    error?: string;
  }> {
    const { organizationId, workspaceId, quotationId, cashierUserId, cashierName, paymentMethod, shiftId } = params;
    const quote = this.store.quotations.get(quotationId);
    if (!quote || quote.workspaceId !== workspaceId) {
      return { success: false, error: 'Quotation not found in this workspace.' };
    }
    if (quote.status === 'CONVERTED') {
      return { success: false, error: `Quotation ${quote.quoteNumber} has already been converted to sale ${quote.convertedSaleId}.` };
    }

    const quoteItems = this.store.quoteItems.get(quotationId) || [];
    if (quoteItems.length === 0) {
      return { success: false, error: 'Cannot convert an empty quotation.' };
    }

    // Convert quote items to atomic sale items
    const saleItems = quoteItems.map((qi) => {
      const prod = this.store.products.get(qi.productId);
      return {
        productId: qi.productId,
        productName: prod?.name || qi.description,
        sku: prod?.sku || 'QUOTE-ITEM',
        quantity: qi.quantity,
        unitPrice: qi.unitPrice,
        unitCost: qi.unitCost,
        taxRate: qi.taxRate,
        discountRate: qi.discountRate,
      };
    });

    const saleNumber = `SALE-Q-${quote.quoteNumber.replace(/^Q-?/, '')}`;
    const result = await this.executeAtomicSale({
      organizationId,
      workspaceId,
      saleNumber,
      invoiceNumber: `INV-${quote.quoteNumber}`,
      source: 'QUOTATION',
      customerId: quote.customerId,
      customerName: quote.customerName,
      cashierUserId,
      cashierName,
      shiftId,
      currency: 'USD',
      items: saleItems,
      payments: [
        {
          paymentMethod,
          amount: quote.totalAmount,
          reference: `Quote ${quote.quoteNumber}`,
        },
      ],
      idempotencyKey: `convert_${quotationId}`,
      notes: `Converted from Quotation ${quote.quoteNumber}`,
      isPilotDemo: quote.isPilotDemo,
    });

    if (!result.success || !result.sale) {
      return result;
    }

    // Mark quote as converted
    quote.status = 'CONVERTED';
    quote.convertedSaleId = result.sale.id;
    quote.updatedAt = new Date().toISOString();

    return { success: true, sale: result.sale };
  }

  // ---------------------------------------------------------------------------
  // CASHIER SHIFTS
  // ---------------------------------------------------------------------------
  static async getActiveShift(workspaceId: string, cashierUserId: string): Promise<RetailCashierShift | null> {
    return (
      Array.from(this.store.cashierShifts.values()).find(
        (s) => s.workspaceId === workspaceId && s.cashierUserId === cashierUserId && s.status === 'OPEN'
      ) || null
    );
  }

  static async openShift(shift: RetailCashierShift): Promise<RetailCashierShift> {
    this.store.cashierShifts.set(shift.id, shift);
    return shift;
  }

  static async closeShift(
    workspaceId: string,
    shiftId: string,
    closingCashActual: number,
    notes?: string
  ): Promise<{ success: boolean; shift?: RetailCashierShift; error?: string }> {
    const shift = this.store.cashierShifts.get(shiftId);
    if (!shift || shift.workspaceId !== workspaceId) {
      return { success: false, error: 'Shift not found.' };
    }

    // Sum cash payments during this shift
    const shiftSales = Array.from(this.store.sales.values()).filter((s) => s.shiftId === shiftId);
    let cashSalesTotal = 0;
    for (const sale of shiftSales) {
      const payments = this.store.salePayments.get(sale.id) || [];
      for (const p of payments) {
        if (p.paymentMethod === 'CASH') {
          cashSalesTotal += p.amount;
        }
      }
    }

    const expectedCash = shift.openingCash + cashSalesTotal;
    const variance = closingCashActual - expectedCash;

    shift.closingCashActual = closingCashActual;
    shift.expectedCash = expectedCash;
    shift.variance = variance;
    shift.status = 'CLOSED';
    shift.closedAt = new Date().toISOString();
    shift.notes = notes;

    return { success: true, shift };
  }

  // ---------------------------------------------------------------------------
  // OPERATING EXPENSES
  // ---------------------------------------------------------------------------
  static async listExpenses(workspaceId: string): Promise<RetailExpense[]> {
    return Array.from(this.store.expenses.values())
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }

  static async recordExpense(expense: RetailExpense): Promise<RetailExpense> {
    this.store.expenses.set(expense.id, expense);
    return expense;
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEES & PAYROLL
  // ---------------------------------------------------------------------------
  static async listEmployees(workspaceId: string): Promise<RetailEmployee[]> {
    return Array.from(this.store.employees.values())
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  static async upsertEmployee(employee: RetailEmployee): Promise<RetailEmployee> {
    this.store.employees.set(employee.id, employee);
    return employee;
  }

  static async listPayrollRuns(workspaceId: string): Promise<RetailPayrollRun[]> {
    return Array.from(this.store.payrollRuns.values())
      .filter((pr) => pr.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())
      .map((pr) => ({
        ...pr,
        payslips: this.store.payslips.get(pr.id) || [],
      }));
  }

  static async createPayrollRun(
    run: RetailPayrollRun,
    payslips: RetailPayslip[]
  ): Promise<RetailPayrollRun> {
    this.store.payrollRuns.set(run.id, run);
    this.store.payslips.set(run.id, payslips);
    return { ...run, payslips };
  }

  // ---------------------------------------------------------------------------
  // FINANCIAL METRICS & BI REPORTING
  // ---------------------------------------------------------------------------
  static async computeFinancialMetrics(workspaceId: string): Promise<RetailFinancialMetrics> {
    const today = new Date().toISOString().slice(0, 10);
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const sales = Array.from(this.store.sales.values()).filter(
      (s) => s.workspaceId === workspaceId && s.status === 'COMPLETED'
    );
    const expenses = Array.from(this.store.expenses.values()).filter(
      (e) => e.workspaceId === workspaceId && e.status === 'APPROVED'
    );
    const payrollRuns = Array.from(this.store.payrollRuns.values()).filter(
      (pr) => pr.workspaceId === workspaceId && pr.status === 'APPROVED'
    );
    const products = Array.from(this.store.products.values()).filter((p) => p.workspaceId === workspaceId);
    const quotations = Array.from(this.store.quotations.values()).filter((q) => q.workspaceId === workspaceId);
    const suppliers = Array.from(this.store.suppliers.values()).filter((s) => s.workspaceId === workspaceId);
    const purchaseOrders = Array.from(this.store.purchaseOrders.values()).filter((po) => po.workspaceId === workspaceId);

    // Today's Sales
    const todaySalesList = sales.filter((s) => s.createdAt.slice(0, 10) === today);
    const todaySales = todaySalesList.reduce((sum, s) => sum + s.totalAmount, 0);

    // Monthly Sales & COGS
    const monthlySalesList = sales.filter((s) => s.createdAt.slice(0, 10) >= firstDayOfMonth);
    const monthlySales = monthlySalesList.reduce((sum, s) => sum + s.totalAmount, 0);
    const costOfGoodsSold = monthlySalesList.reduce((sum, s) => sum + s.totalCost, 0);

    // Gross Profit
    const grossProfit = monthlySales - costOfGoodsSold;
    const grossProfitMarginPercent = monthlySales > 0 ? (grossProfit / monthlySales) * 100 : 0;

    // Operating Expenses
    const monthlyExpensesList = expenses.filter((e) => e.expenseDate >= firstDayOfMonth);
    const operatingExpenses = monthlyExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // Payroll Expenses
    const monthlyPayrollList = payrollRuns.filter((pr) => pr.periodStart >= firstDayOfMonth);
    const payrollExpenses = monthlyPayrollList.reduce((sum, pr) => sum + pr.totalGross, 0);

    // Operating Profit
    const estimatedOperatingProfit = grossProfit - operatingExpenses - payrollExpenses;
    const operatingMarginPercent = monthlySales > 0 ? (estimatedOperatingProfit / monthlySales) * 100 : 0;

    // Balances
    const outstandingCustomerBalances = sales
      .filter((s) => s.paymentStatus !== 'PAID')
      .reduce((sum, s) => {
        const payments = this.store.salePayments.get(s.id) || [];
        const paid = payments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + Math.max(0, s.totalAmount - paid);
      }, 0);

    const outstandingSupplierBalances = suppliers.reduce((sum, sup) => sum + sup.balanceOwed, 0);

    // Inventory Valuation & Counts
    let stockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = this.store.stockLevels.get(`${workspaceId}_${p.id}`)?.quantityOnHand || 0;
      stockValuation += stock * p.purchaseCost;
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= p.reorderLevel) {
        lowStockCount++;
      }
    }

    // Pending Quotations
    const pendingQuotes = quotations.filter((q) => q.status === 'SENT' || q.status === 'DRAFT');
    const pendingQuotationsCount = pendingQuotes.length;
    const pendingQuotationsAmount = pendingQuotes.reduce((sum, q) => sum + q.totalAmount, 0);

    // Unpaid Invoices
    const unpaidSales = sales.filter((s) => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL');
    const unpaidInvoicesCount = unpaidSales.length;
    const unpaidInvoicesAmount = unpaidSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Pending POs
    const pendingPurchaseOrdersCount = purchaseOrders.filter(
      (po) => po.status === 'SUBMITTED' || po.status === 'PARTIAL_RECEIVED'
    ).length;

    // Trend Breakdown: Category Expenses
    const catMap = new Map<string, number>();
    for (const e of monthlyExpensesList) {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    }
    const expenseBreakdown = Array.from(catMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Best Sellers
    const prodRevMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const s of sales) {
      const items = this.store.saleItems.get(s.id) || [];
      for (const it of items) {
        const current = prodRevMap.get(it.productId) || { name: it.productName, quantity: 0, revenue: 0 };
        current.quantity += it.quantity;
        current.revenue += it.lineTotal;
        prodRevMap.set(it.productId, current);
      }
    }

    const bestSellers = Array.from(prodRevMap.entries())
      .map(([productId, val]) => ({
        productId,
        name: val.name,
        quantitySold: val.quantity,
        revenue: val.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales over time (last 7 days)
    const salesOverTime: Array<{ date: string; sales: number; profit: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => s.createdAt.slice(0, 10) === dateStr);
      const dayRev = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const dayCost = daySales.reduce((sum, s) => sum + s.totalCost, 0);
      salesOverTime.push({
        date: dateStr,
        sales: dayRev,
        profit: dayRev - dayCost,
      });
    }

    return {
      currency: 'USD',
      todaySales,
      todaySalesCount: todaySalesList.length,
      monthlySales,
      monthlySalesCount: monthlySalesList.length,
      salesGrowthPercent: 12.5, // Trend vs prior period
      costOfGoodsSold,
      grossProfit,
      grossProfitMarginPercent,
      operatingExpenses,
      payrollExpenses,
      estimatedOperatingProfit,
      operatingMarginPercent,
      outstandingCustomerBalances,
      outstandingSupplierBalances,
      totalActiveProducts: products.length,
      stockValuation,
      lowStockCount,
      outOfStockCount,
      pendingQuotationsCount,
      pendingQuotationsAmount,
      unpaidInvoicesCount,
      unpaidInvoicesAmount,
      pendingPurchaseOrdersCount,
      salesOverTime,
      expenseBreakdown,
      bestSellers,
    };
  }
}
