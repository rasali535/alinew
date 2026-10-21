/**
 * Ralion Retail OS — Canonical Data Contract Adapters & Typed Normalizers
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides authoritative bidirectional mapping between API payloads and UI components,
 * strict finite numeric validation (preventing silent zero substitution), safe property
 * accessors (preventing undefined.toFixed / toLowerCase crashes), and graceful handling
 * of empty datasets for sandbox / clean-slate tenants.
 */

// ---------------------------------------------------------------------------
// 1. Strict Numeric Validation & Formatting Utilities
// ---------------------------------------------------------------------------

export function isValidFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

/**
 * Strictly parses a numeric value.
 * Unlike loose "Number(val) || 0", this does NOT silently replace missing or invalid
 * financial data with 0. If value is null, undefined, or unparseable, it returns null.
 */
export function parseStrictNumber(
  value: unknown,
  fieldName?: string
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return null;
  }
  return num;
}

/**
 * Validates that a required financial field is a strictly valid finite number.
 * Throws a TypeError if invalid, preventing silent corruption of prices / costs.
 */
export function parseRequiredStrictNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number }
): number {
  const parsed = parseStrictNumber(value, fieldName);
  if (parsed === null) {
    throw new TypeError(
      `Strict Numeric Validation Failed: ${fieldName} is required and must be a valid finite number, received: ${JSON.stringify(value)}`
    );
  }
  if (options?.min !== undefined && parsed < options.min) {
    throw new RangeError(
      `Strict Numeric Validation Failed: ${fieldName} (${parsed}) must be greater than or equal to ${options.min}`
    );
  }
  return parsed;
}

/**
 * Safe currency formatter in USD ($).
 * If value is missing / null / not finite, returns '—' rather than masking with '$0.00'.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD'
): string {
  if (value === null || value === undefined || !isValidFiniteNumber(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Safe price formatter with dollar symbol ($).
 * If value is missing / null / not finite, returns '—'.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !isValidFiniteNumber(value)) {
    return '—';
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Safe number formatter with specified decimal places.
 * If value is missing / null / not finite, returns '—'.
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || !isValidFiniteNumber(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

export function safeString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function safeLowerCase(value: unknown): string {
  return safeString(value).toLowerCase();
}

export function safeReplace(
  value: unknown,
  pattern: RegExp | string,
  replacement: string
): string {
  return safeString(value).replace(pattern, replacement);
}

// ---------------------------------------------------------------------------
// 2. Canonical Product Contract & Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedRetailProduct {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  unitOfMeasure: string;
  unit_of_measure: string; // legacy alias
  purchaseCost: number;
  unit_cost: number; // legacy alias
  sellingPrice: number;
  selling_price: number; // legacy alias
  minSellingPrice: number;
  vatRate: number;
  reorderLevel: number;
  min_stock_level: number; // legacy alias
  currentStock: number;
  current_stock: number; // legacy alias
  status: string;
  is_active: boolean;
  imageUrl?: string;
  isPilotDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeProduct(raw: any): NormalizedRetailProduct {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize product from non-object source');
  }

  const purchaseCostNum = parseStrictNumber(raw.purchaseCost ?? raw.unit_cost ?? raw.cost_price);
  const sellingPriceNum = parseStrictNumber(raw.sellingPrice ?? raw.selling_price);
  const currentStockNum = parseStrictNumber(raw.currentStock ?? raw.current_stock) ?? 0;
  const reorderLevelNum = parseStrictNumber(raw.reorderLevel ?? raw.min_stock_level) ?? 10;
  const vatRateNum = parseStrictNumber(raw.vatRate ?? raw.tax_rate) ?? 0;
  const minSellingPriceNum = parseStrictNumber(raw.minSellingPrice ?? raw.min_selling_price) ?? (sellingPriceNum ?? 0);

  const unitOfMeasure = safeString(raw.unitOfMeasure || raw.unit_of_measure, 'pcs');

  return {
    id: safeString(raw.id),
    sku: safeString(raw.sku),
    barcode: raw.barcode ? safeString(raw.barcode) : undefined,
    name: safeString(raw.name, 'Unnamed Product'),
    category: safeString(raw.category, 'General Supplies'),
    subcategory: raw.subcategory ? safeString(raw.subcategory) : undefined,
    description: raw.description ? safeString(raw.description) : undefined,
    brand: raw.brand ? safeString(raw.brand) : undefined,
    supplierId: raw.supplierId || raw.supplier_id || undefined,
    supplierName: raw.supplierName || raw.supplier_name || undefined,
    unitOfMeasure,
    unit_of_measure: unitOfMeasure,
    purchaseCost: purchaseCostNum ?? 0,
    unit_cost: purchaseCostNum ?? 0,
    sellingPrice: sellingPriceNum ?? 0,
    selling_price: sellingPriceNum ?? 0,
    minSellingPrice: minSellingPriceNum,
    vatRate: vatRateNum,
    reorderLevel: reorderLevelNum,
    min_stock_level: reorderLevelNum,
    currentStock: currentStockNum,
    current_stock: currentStockNum,
    status: safeString(raw.status, 'ACTIVE'),
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : raw.status !== 'DISCONTINUED',
    imageUrl: raw.imageUrl || raw.image_url || undefined,
    isPilotDemo: Boolean(raw.isPilotDemo || raw.is_pilot_demo),
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

export function normalizeProducts(rawList: unknown): NormalizedRetailProduct[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeProduct);
}

// ---------------------------------------------------------------------------
// 3. Canonical Sales Contract & Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedSaleItem {
  id: string;
  saleId?: string;
  productId: string;
  product_id: string;
  productName: string;
  product_name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unit_price: number;
  unitCost: number;
  unit_cost: number;
  taxRate: number;
  tax_rate: number;
  discountRate: number;
  discount_rate: number;
  lineTotal: number;
  line_total: number;
  lineCost?: number;
}

export interface NormalizedRetailSale {
  id: string;
  saleNumber: string;
  sale_number: string;
  invoiceNumber?: string;
  source: string;
  customerId?: string;
  customerName: string;
  customer_name: string;
  cashierUserId?: string;
  cashierName?: string;
  shiftId?: string;
  status: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  tax_total: number;
  discountTotal: number;
  discount_total: number;
  totalAmount: number;
  grand_total: number;
  totalCost: number;
  paymentMethod: string;
  payment_method: string;
  paymentStatus: string;
  payment_status: string;
  notes?: string;
  createdAt: string;
  created_at: string;
  items: NormalizedSaleItem[];
}

export function normalizeSaleItem(raw: any): NormalizedSaleItem {
  const qty = parseStrictNumber(raw.quantity) ?? 1;
  const unitPrice = parseStrictNumber(raw.unitPrice ?? raw.unit_price) ?? 0;
  const unitCost = parseStrictNumber(raw.unitCost ?? raw.unit_cost) ?? 0;
  const lineTotal = parseStrictNumber(raw.lineTotal ?? raw.line_total) ?? (qty * unitPrice);

  return {
    id: safeString(raw.id),
    saleId: raw.saleId || raw.sale_id,
    productId: safeString(raw.productId || raw.product_id),
    product_id: safeString(raw.productId || raw.product_id),
    productName: safeString(raw.productName || raw.product_name, 'Hardware Item'),
    product_name: safeString(raw.productName || raw.product_name, 'Hardware Item'),
    sku: safeString(raw.sku),
    quantity: qty,
    unitPrice,
    unit_price: unitPrice,
    unitCost,
    unit_cost: unitCost,
    taxRate: parseStrictNumber(raw.taxRate ?? raw.tax_rate) ?? 0,
    tax_rate: parseStrictNumber(raw.taxRate ?? raw.tax_rate) ?? 0,
    discountRate: parseStrictNumber(raw.discountRate ?? raw.discount_rate) ?? 0,
    discount_rate: parseStrictNumber(raw.discountRate ?? raw.discount_rate) ?? 0,
    lineTotal,
    line_total: lineTotal,
    lineCost: parseStrictNumber(raw.lineCost ?? raw.line_cost) ?? (qty * unitCost),
  };
}

export function normalizeSale(raw: any): NormalizedRetailSale {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize sale from non-object source');
  }

  const subtotal = parseStrictNumber(raw.subtotal) ?? 0;
  const taxTotal = parseStrictNumber(raw.taxTotal ?? raw.tax_total) ?? 0;
  const discountTotal = parseStrictNumber(raw.discountTotal ?? raw.discount_total) ?? 0;
  const totalAmount = parseStrictNumber(raw.totalAmount ?? raw.grand_total) ?? (subtotal - discountTotal + taxTotal);
  const totalCost = parseStrictNumber(raw.totalCost ?? raw.total_cost) ?? 0;

  const saleNumber = safeString(raw.saleNumber || raw.sale_number, 'POS-SALE');
  const customerName = safeString(raw.customerName || raw.customer_name, 'Walk-in Customer');
  const paymentMethodRaw = safeString(raw.paymentMethod || raw.payment_method, 'CASH');
  const paymentStatusRaw = safeString(raw.paymentStatus || raw.payment_status, 'PAID');

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : (Array.isArray(raw.retail_sale_items) ? raw.retail_sale_items : []);

  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  return {
    id: safeString(raw.id),
    saleNumber,
    sale_number: saleNumber,
    invoiceNumber: raw.invoiceNumber || raw.invoice_number,
    source: safeString(raw.source, 'POS'),
    customerId: raw.customerId || raw.customer_id,
    customerName,
    customer_name: customerName,
    cashierUserId: raw.cashierUserId || raw.cashier_user_id,
    cashierName: raw.cashierName || raw.cashier_name,
    shiftId: raw.shiftId || raw.shift_id,
    status: safeString(raw.status, 'COMPLETED'),
    currency: safeString(raw.currency, 'USD'),
    subtotal,
    taxTotal,
    tax_total: taxTotal,
    discountTotal,
    discount_total: discountTotal,
    totalAmount,
    grand_total: totalAmount,
    totalCost,
    paymentMethod: paymentMethodRaw,
    payment_method: paymentMethodRaw.toLowerCase(),
    paymentStatus: paymentStatusRaw,
    payment_status: paymentStatusRaw.toLowerCase(),
    notes: raw.notes ? safeString(raw.notes) : undefined,
    createdAt,
    created_at: createdAt,
    items: rawItems.map(normalizeSaleItem),
  };
}

export function normalizeSales(rawList: unknown): NormalizedRetailSale[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeSale);
}

// ---------------------------------------------------------------------------
// 4. Canonical Quotation Contract & Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedQuoteItem {
  id?: string;
  productId: string;
  product_id: string;
  productName: string;
  product_name: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  unit_price: number;
  unitCost: number;
  unit_cost: number;
  discountRate: number;
  discount_amount?: number;
  taxRate: number;
  tax_rate: number;
  lineTotal: number;
  line_total: number;
}

export interface NormalizedRetailQuotation {
  id: string;
  quoteNumber: string;
  quotation_number: string;
  customerId?: string;
  customerName: string;
  customer_name: string;
  customerPhone?: string;
  customer_phone?: string;
  customerEmail?: string;
  customer_email?: string;
  subtotal: number;
  taxTotal: number;
  tax_total: number;
  discountTotal: number;
  discount_total: number;
  totalAmount: number;
  grand_total: number;
  currency: string;
  status: string;
  validUntil?: string;
  valid_until?: string;
  notes?: string;
  convertedSaleId?: string;
  converted_sale_id?: string;
  createdAt: string;
  created_at: string;
  items: NormalizedQuoteItem[];
}

export function normalizeQuoteItem(raw: any): NormalizedQuoteItem {
  const qty = parseStrictNumber(raw.quantity) ?? 1;
  const unitPrice = parseStrictNumber(raw.unitPrice ?? raw.unit_price) ?? 0;
  const unitCost = parseStrictNumber(raw.unitCost ?? raw.unit_cost) ?? 0;
  const discountRate = parseStrictNumber(raw.discountRate ?? raw.discount_rate ?? raw.discount_amount) ?? 0;
  const taxRate = parseStrictNumber(raw.taxRate ?? raw.tax_rate) ?? 0;

  const rawLineTotal = parseStrictNumber(raw.lineTotal ?? raw.line_total);
  const lineTotal = rawLineTotal !== null ? rawLineTotal : (qty * unitPrice * (1 - discountRate / 100));

  return {
    id: raw.id ? safeString(raw.id) : undefined,
    productId: safeString(raw.productId || raw.product_id),
    product_id: safeString(raw.productId || raw.product_id),
    productName: safeString(raw.productName || raw.product_name, 'Hardware Item'),
    product_name: safeString(raw.productName || raw.product_name, 'Hardware Item'),
    sku: raw.sku ? safeString(raw.sku) : undefined,
    description: raw.description ? safeString(raw.description) : undefined,
    quantity: qty,
    unitPrice,
    unit_price: unitPrice,
    unitCost,
    unit_cost: unitCost,
    discountRate,
    discount_amount: discountRate,
    taxRate,
    tax_rate: taxRate,
    lineTotal,
    line_total: lineTotal,
  };
}

export function normalizeQuotation(raw: any): NormalizedRetailQuotation {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize quotation from non-object source');
  }

  const subtotal = parseStrictNumber(raw.subtotal) ?? 0;
  const taxTotal = parseStrictNumber(raw.taxTotal ?? raw.tax_total) ?? 0;
  const discountTotal = parseStrictNumber(raw.discountTotal ?? raw.discount_total) ?? 0;
  const totalAmount = parseStrictNumber(raw.totalAmount ?? raw.grand_total) ?? (subtotal - discountTotal + taxTotal);

  const quoteNumber = safeString(raw.quoteNumber || raw.quotation_number, 'Q-000000');
  const customerName = safeString(raw.customerName || raw.customer_name, 'Customer');
  const validUntil = raw.validUntil || raw.valid_until;
  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : (Array.isArray(raw.retail_quote_items) ? raw.retail_quote_items : []);

  return {
    id: safeString(raw.id),
    quoteNumber,
    quotation_number: quoteNumber,
    customerId: raw.customerId || raw.customer_id,
    customerName,
    customer_name: customerName,
    customerPhone: raw.customerPhone || raw.customer_phone,
    customer_phone: raw.customerPhone || raw.customer_phone,
    customerEmail: raw.customerEmail || raw.customer_email,
    customer_email: raw.customerEmail || raw.customer_email,
    subtotal,
    taxTotal,
    tax_total: taxTotal,
    discountTotal,
    discount_total: discountTotal,
    totalAmount,
    grand_total: totalAmount,
    currency: safeString(raw.currency, 'USD'),
    status: safeString(raw.status, 'DRAFT').toLowerCase(),
    validUntil,
    valid_until: validUntil,
    notes: raw.notes ? safeString(raw.notes) : undefined,
    convertedSaleId: raw.convertedSaleId || raw.converted_sale_id,
    converted_sale_id: raw.convertedSaleId || raw.converted_sale_id,
    createdAt,
    created_at: createdAt,
    items: rawItems.map(normalizeQuoteItem),
  };
}

export function normalizeQuotations(rawList: unknown): NormalizedRetailQuotation[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeQuotation);
}

// ---------------------------------------------------------------------------
// 5. Canonical Purchase Order & Supplier Contract & Normalizers
// ---------------------------------------------------------------------------

export interface NormalizedPoItem {
  id?: string;
  productId: string;
  product_id: string;
  productName: string;
  product_name: string;
  sku?: string;
  quantityOrdered: number;
  quantity_ordered: number;
  quantityReceived: number;
  quantity_received: number;
  unitCost: number;
  unit_cost: number;
  lineTotal: number;
  line_total: number;
}

export interface NormalizedRetailPurchaseOrder {
  id: string;
  poNumber: string;
  orderNumber: string;
  order_number: string;
  supplierId: string;
  supplier_id: string;
  supplierName: string;
  supplier_name: string;
  totalAmount: number;
  totalCost: number;
  total_cost: number;
  currency: string;
  status: string;
  expectedDate?: string;
  expected_delivery?: string;
  notes?: string;
  createdAt: string;
  created_at: string;
  items: NormalizedPoItem[];
}

export function normalizePoItem(raw: any): NormalizedPoItem {
  const qtyOrdered = parseStrictNumber(raw.quantityOrdered ?? raw.quantity_ordered ?? raw.quantity) ?? 1;
  const qtyReceived = parseStrictNumber(raw.quantityReceived ?? raw.quantity_received) ?? 0;
  const unitCost = parseStrictNumber(raw.unitCost ?? raw.unit_cost) ?? 0;
  const lineTotal = parseStrictNumber(raw.lineTotal ?? raw.line_total) ?? (qtyOrdered * unitCost);

  return {
    id: raw.id ? safeString(raw.id) : undefined,
    productId: safeString(raw.productId || raw.product_id),
    product_id: safeString(raw.productId || raw.product_id),
    productName: safeString(raw.productName || raw.product_name, 'Hardware Product'),
    product_name: safeString(raw.productName || raw.product_name, 'Hardware Product'),
    sku: raw.sku ? safeString(raw.sku) : undefined,
    quantityOrdered: qtyOrdered,
    quantity_ordered: qtyOrdered,
    quantityReceived: qtyReceived,
    quantity_received: qtyReceived,
    unitCost,
    unit_cost: unitCost,
    lineTotal,
    line_total: lineTotal,
  };
}

export function normalizePurchaseOrder(raw: any): NormalizedRetailPurchaseOrder {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize purchase order from non-object source');
  }

  const poNumber = safeString(raw.poNumber || raw.order_number, 'PO-000000');
  const supplierId = safeString(raw.supplierId || raw.supplier_id);
  const supplierName = safeString(raw.supplierName || raw.supplier_name, 'Supplier');
  const totalAmount = parseStrictNumber(raw.totalAmount ?? raw.total_cost) ?? 0;
  const expectedDate = raw.expectedDate || raw.expected_delivery;
  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : (Array.isArray(raw.retail_po_items) ? raw.retail_po_items : []);

  return {
    id: safeString(raw.id),
    poNumber,
    orderNumber: poNumber,
    order_number: poNumber,
    supplierId,
    supplier_id: supplierId,
    supplierName,
    supplier_name: supplierName,
    totalAmount,
    totalCost: totalAmount,
    total_cost: totalAmount,
    currency: safeString(raw.currency, 'USD'),
    status: safeString(raw.status, 'SUBMITTED').toLowerCase(),
    expectedDate,
    expected_delivery: expectedDate,
    notes: raw.notes ? safeString(raw.notes) : undefined,
    createdAt,
    created_at: createdAt,
    items: rawItems.map(normalizePoItem),
  };
}

export function normalizePurchaseOrders(rawList: unknown): NormalizedRetailPurchaseOrder[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizePurchaseOrder);
}

export interface NormalizedRetailSupplier {
  id: string;
  name: string;
  contactName?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  payment_terms?: string;
  leadTimeDays?: number;
  lead_time_days?: number;
  currency: string;
  balanceOwed: number;
  balance_owed: number;
  isActive: boolean;
  is_active: boolean;
  notes?: string;
}

export function normalizeSupplier(raw: any): NormalizedRetailSupplier {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize supplier from non-object source');
  }

  const contactName = raw.contactName || raw.contact_person;
  const paymentTerms = raw.paymentTerms || raw.payment_terms;
  const balanceOwed = parseStrictNumber(raw.balanceOwed ?? raw.balance_owed) ?? 0;
  const leadTimeDays = parseStrictNumber(raw.leadTimeDays ?? raw.lead_time_days) ?? 7;

  return {
    id: safeString(raw.id),
    name: safeString(raw.name, 'Supplier'),
    contactName,
    contact_person: contactName,
    phone: raw.phone ? safeString(raw.phone) : undefined,
    email: raw.email ? safeString(raw.email) : undefined,
    address: raw.address ? safeString(raw.address) : undefined,
    paymentTerms,
    payment_terms: paymentTerms,
    leadTimeDays,
    lead_time_days: leadTimeDays,
    currency: safeString(raw.currency, 'USD'),
    balanceOwed,
    balance_owed: balanceOwed,
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    notes: raw.notes ? safeString(raw.notes) : undefined,
  };
}

export function normalizeSuppliers(rawList: unknown): NormalizedRetailSupplier[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeSupplier);
}

// ---------------------------------------------------------------------------
// 6. Canonical Operating Expense Contract & Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedRetailExpense {
  id: string;
  expenseNumber: string;
  reference_number?: string;
  referenceNumber?: string;
  category: string;
  payee: string;
  amount: number;
  taxAmount?: number;
  currency: string;
  paymentMethod: string;
  payment_method: string;
  expenseDate: string;
  expense_date: string;
  status: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  created_at: string;
}

export function normalizeExpense(raw: any): NormalizedRetailExpense {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Cannot normalize expense from non-object source');
  }

  const amount = parseStrictNumber(raw.amount) ?? 0;
  const taxAmount = parseStrictNumber(raw.taxAmount ?? raw.tax_amount) ?? 0;
  const expenseNumber = safeString(raw.expenseNumber || raw.reference_number || raw.expense_number, 'EXP-000000');
  const paymentMethod = safeString(raw.paymentMethod || raw.payment_method, 'BANK_TRANSFER');
  const expenseDate = safeString(raw.expenseDate || raw.expense_date, new Date().toISOString().slice(0, 10));
  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  return {
    id: safeString(raw.id),
    expenseNumber,
    reference_number: expenseNumber,
    referenceNumber: expenseNumber,
    category: safeString(raw.category, 'Operating Overhead'),
    payee: safeString(raw.payee, 'Vendor / Payee'),
    amount,
    taxAmount,
    currency: safeString(raw.currency, 'USD'),
    paymentMethod,
    payment_method: paymentMethod.toLowerCase(),
    expenseDate,
    expense_date: expenseDate,
    status: safeString(raw.status, 'RECORDED'),
    receiptUrl: raw.receiptUrl || raw.receipt_url,
    notes: raw.notes ? safeString(raw.notes) : undefined,
    createdAt,
    created_at: createdAt,
  };
}

export function normalizeExpenses(rawList: unknown): NormalizedRetailExpense[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeExpense);
}

// ---------------------------------------------------------------------------
// 7. Canonical Stock Movement Contract & Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedRetailStockMovement {
  id: string;
  productId: string;
  product_id: string;
  movementType: string;
  movement_type: string;
  quantityChange: number;
  quantity_change: number;
  balanceAfter: number;
  quantity_after: number;
  unitCost: number;
  unit_cost: number;
  reason?: string;
  notes?: string;
  createdAt: string;
  created_at: string;
}

export function normalizeStockMovement(raw: any): NormalizedRetailStockMovement {
  const movementType = safeString(raw.movementType || raw.movement_type, 'COUNT_ADJUSTMENT');
  const quantityChange = parseStrictNumber(raw.quantityChange ?? raw.quantity_change) ?? 0;
  const balanceAfter = parseStrictNumber(raw.balanceAfter ?? raw.quantity_after) ?? 0;
  const unitCost = parseStrictNumber(raw.unitCost ?? raw.unit_cost) ?? 0;
  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  return {
    id: safeString(raw.id),
    productId: safeString(raw.productId || raw.product_id),
    product_id: safeString(raw.productId || raw.product_id),
    movementType,
    movement_type: movementType.toLowerCase(),
    quantityChange,
    quantity_change: quantityChange,
    balanceAfter,
    quantity_after: balanceAfter,
    unitCost,
    unit_cost: unitCost,
    reason: raw.reason ? safeString(raw.reason) : undefined,
    notes: raw.notes ? safeString(raw.notes) : (raw.reason ? safeString(raw.reason) : undefined),
    createdAt,
    created_at: createdAt,
  };
}

export function normalizeStockMovements(rawList: unknown): NormalizedRetailStockMovement[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeStockMovement);
}

// ---------------------------------------------------------------------------
// 8. Canonical Employee & Payroll Contract & Normalizers
// ---------------------------------------------------------------------------

export interface NormalizedRetailEmployee {
  id: string;
  firstName: string;
  first_name: string;
  lastName: string;
  last_name: string;
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle: string;
  job_title: string;
  department: string;
  employmentType: string;
  employment_type: string;
  baseSalary: number | null;
  base_salary: number | null;
  salaryFrequency: string;
  salary_frequency: string;
  hireDate: string;
  hire_date: string;
  isActive: boolean;
  is_active: boolean;
}

export function normalizeEmployee(raw: any): NormalizedRetailEmployee {
  const firstName = safeString(raw.firstName || raw.first_name, 'Staff');
  const lastName = safeString(raw.lastName || raw.last_name, 'Member');
  const jobTitle = safeString(raw.jobTitle || raw.job_title, 'Store Clerk');
  const department = safeString(raw.department, 'Store Operations');
  const employmentType = safeString(raw.employmentType || raw.employment_type, 'full_time');
  const baseSalary = parseStrictNumber(raw.baseSalaryMonthly ?? raw.base_salary);
  const salaryFrequency = safeString(raw.payFrequency || raw.salary_frequency, 'monthly');
  const hireDate = safeString(raw.hireDate || raw.hire_date, new Date().toISOString().slice(0, 10));

  return {
    id: safeString(raw.id),
    firstName,
    first_name: firstName,
    lastName,
    last_name: lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: raw.email ? safeString(raw.email) : undefined,
    phone: raw.phone ? safeString(raw.phone) : undefined,
    jobTitle,
    job_title: jobTitle,
    department,
    employmentType,
    employment_type: employmentType,
    baseSalary,
    base_salary: baseSalary,
    salaryFrequency,
    salary_frequency: salaryFrequency,
    hireDate,
    hire_date: hireDate,
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : (raw.employmentStatus ? raw.employmentStatus === 'ACTIVE' : true),
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : (raw.employmentStatus ? raw.employmentStatus === 'ACTIVE' : true),
  };
}

export function normalizeEmployees(rawList: unknown): NormalizedRetailEmployee[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizeEmployee);
}

export interface NormalizedRetailPayrollRun {
  id: string;
  periodStart: string;
  pay_period_start: string;
  periodEnd: string;
  pay_period_end: string;
  totalGross: number;
  totalGrossPay: number;
  total_gross_pay: number;
  totalDeductions: number;
  total_deductions: number;
  totalNet: number;
  totalNetPay: number;
  total_net_pay: number;
  employeeCount: number;
  employee_count: number;
  status: string;
  currency: string;
  notes?: string;
  createdAt: string;
  created_at: string;
}

export function normalizePayrollRun(raw: any): NormalizedRetailPayrollRun {
  const totalGross = parseStrictNumber(raw.totalGross ?? raw.total_gross_pay ?? raw.total_gross) ?? 0;
  const totalDeductions = parseStrictNumber(raw.totalDeductions ?? raw.total_deductions) ?? 0;
  const totalNet = parseStrictNumber(raw.totalNet ?? raw.total_net_pay ?? raw.total_net) ?? (totalGross - totalDeductions);
  const employeeCount = parseStrictNumber(raw.employeeCount ?? raw.employee_count) ?? 0;
  const periodStart = safeString(raw.periodStart || raw.pay_period_start, new Date().toISOString().slice(0, 10));
  const periodEnd = safeString(raw.periodEnd || raw.pay_period_end, new Date().toISOString().slice(0, 10));
  const createdAt = safeString(raw.createdAt || raw.created_at, new Date().toISOString());

  return {
    id: safeString(raw.id),
    periodStart,
    pay_period_start: periodStart,
    periodEnd,
    pay_period_end: periodEnd,
    totalGross,
    totalGrossPay: totalGross,
    total_gross_pay: totalGross,
    totalDeductions,
    total_deductions: totalDeductions,
    totalNet,
    totalNetPay: totalNet,
    total_net_pay: totalNet,
    employeeCount,
    employee_count: employeeCount,
    status: safeString(raw.status, 'APPROVED').toLowerCase(),
    currency: safeString(raw.currency, 'USD'),
    notes: raw.notes ? safeString(raw.notes) : undefined,
    createdAt,
    created_at: createdAt,
  };
}

export function normalizePayrollRuns(rawList: unknown): NormalizedRetailPayrollRun[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter(Boolean).map(normalizePayrollRun);
}

// ---------------------------------------------------------------------------
// 9. Canonical Financial Metrics & Reports Normalizer
// ---------------------------------------------------------------------------

export interface NormalizedFinancialMetrics {
  currency: string;
  // Canonical fields
  todaySales: number;
  todaySalesCount: number;
  monthlySales: number;
  monthlySalesCount: number;
  salesGrowthPercent: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  operatingExpenses: number;
  payrollExpenses: number;
  estimatedOperatingProfit: number;
  operatingMarginPercent: number;
  stockValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  // Reports page aliases
  totalRevenue: number;
  totalCogs: number;
  grossMarginPct: number;
  totalExpenses: number;
  totalPayroll: number;
  operatingProfit: number;
  operatingMarginPct: number;
  inventoryValuationCost: number;
  inventoryValuationRetail: number;
  inventoryItemCount: number;
  totalTransactions: number;
  expensesByCategory: { [cat: string]: number };
}

export function normalizeFinancialMetrics(raw: any): NormalizedFinancialMetrics {
  const defaults: NormalizedFinancialMetrics = {
    currency: 'USD',
    todaySales: 0,
    todaySalesCount: 0,
    monthlySales: 0,
    monthlySalesCount: 0,
    salesGrowthPercent: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    grossProfitMarginPercent: 0,
    operatingExpenses: 0,
    payrollExpenses: 0,
    estimatedOperatingProfit: 0,
    operatingMarginPercent: 0,
    stockValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalRevenue: 0,
    totalCogs: 0,
    grossMarginPct: 0,
    totalExpenses: 0,
    totalPayroll: 0,
    operatingProfit: 0,
    operatingMarginPct: 0,
    inventoryValuationCost: 0,
    inventoryValuationRetail: 0,
    inventoryItemCount: 0,
    totalTransactions: 0,
    expensesByCategory: {},
  };

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const monthlySales = parseStrictNumber(raw.monthlySales ?? raw.totalRevenue ?? raw.total_revenue) ?? 0;
  const costOfGoodsSold = parseStrictNumber(raw.costOfGoodsSold ?? raw.totalCogs ?? raw.total_cogs) ?? 0;
  const grossProfit = parseStrictNumber(raw.grossProfit ?? raw.gross_profit) ?? (monthlySales - costOfGoodsSold);
  const grossMarginPct = parseStrictNumber(raw.grossProfitMarginPercent ?? raw.grossMarginPct ?? raw.gross_margin_pct) ?? (monthlySales > 0 ? (grossProfit / monthlySales) * 100 : 0);

  const operatingExpenses = parseStrictNumber(raw.operatingExpenses ?? raw.totalExpenses ?? raw.total_expenses) ?? 0;
  const payrollExpenses = parseStrictNumber(raw.payrollExpenses ?? raw.totalPayroll ?? raw.total_payroll) ?? 0;
  const estimatedOperatingProfit = parseStrictNumber(raw.estimatedOperatingProfit ?? raw.operatingProfit ?? raw.operating_profit) ?? (grossProfit - operatingExpenses - payrollExpenses);
  const operatingMarginPct = parseStrictNumber(raw.operatingMarginPercent ?? raw.operatingMarginPct ?? raw.operating_margin_pct) ?? (monthlySales > 0 ? (estimatedOperatingProfit / monthlySales) * 100 : 0);

  const stockValuation = parseStrictNumber(raw.stockValuation ?? raw.inventoryValuationCost ?? raw.inventory_valuation_cost) ?? 0;
  const inventoryValuationRetail = parseStrictNumber(raw.inventoryValuationRetail) ?? (stockValuation * 1.35);

  const expByCat: { [cat: string]: number } = {};
  if (Array.isArray(raw.expenseBreakdown)) {
    for (const item of raw.expenseBreakdown) {
      if (item && item.category) {
        expByCat[item.category] = parseStrictNumber(item.amount) ?? 0;
      }
    }
  } else if (raw.expensesByCategory && typeof raw.expensesByCategory === 'object') {
    for (const [k, v] of Object.entries(raw.expensesByCategory)) {
      expByCat[k] = parseStrictNumber(v) ?? 0;
    }
  }

  return {
    currency: safeString(raw.currency, 'USD'),
    todaySales: parseStrictNumber(raw.todaySales) ?? 0,
    todaySalesCount: parseStrictNumber(raw.todaySalesCount) ?? 0,
    monthlySales,
    monthlySalesCount: parseStrictNumber(raw.monthlySalesCount) ?? 0,
    salesGrowthPercent: parseStrictNumber(raw.salesGrowthPercent) ?? 0,
    costOfGoodsSold,
    grossProfit,
    grossProfitMarginPercent: grossMarginPct,
    operatingExpenses,
    payrollExpenses,
    estimatedOperatingProfit,
    operatingMarginPercent: operatingMarginPct,
    stockValuation,
    lowStockCount: parseStrictNumber(raw.lowStockCount) ?? 0,
    outOfStockCount: parseStrictNumber(raw.outOfStockCount) ?? 0,
    totalRevenue: monthlySales,
    totalCogs: costOfGoodsSold,
    grossMarginPct,
    totalExpenses: operatingExpenses,
    totalPayroll: payrollExpenses,
    operatingProfit: estimatedOperatingProfit,
    operatingMarginPct,
    inventoryValuationCost: stockValuation,
    inventoryValuationRetail,
    inventoryItemCount: parseStrictNumber(raw.totalActiveProducts ?? raw.inventoryItemCount) ?? 0,
    totalTransactions: parseStrictNumber(raw.monthlySalesCount ?? raw.totalTransactions) ?? 0,
    expensesByCategory: expByCat,
  };
}

// ---------------------------------------------------------------------------
// 9. Convenient Type Aliases
// ---------------------------------------------------------------------------
export type NormalizedProduct = NormalizedRetailProduct;
export type NormalizedSale = NormalizedRetailSale;
export type NormalizedQuotation = NormalizedRetailQuotation;
export type NormalizedPurchaseOrder = NormalizedRetailPurchaseOrder;
export type NormalizedSupplier = NormalizedRetailSupplier;
export type NormalizedExpense = NormalizedRetailExpense;
export type NormalizedEmployee = NormalizedRetailEmployee;
export type NormalizedPayrollRun = NormalizedRetailPayrollRun;

