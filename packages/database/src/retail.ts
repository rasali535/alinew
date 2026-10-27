/**
 * Ralion OS — Ralion Retail Module Core Definitions & Interfaces
 * Ras Ali Labs (Pty) Ltd
 *
 * Dedicated multi-tenant retail and hardware store management system.
 * Operating currency: USD ($).
 */

export type RetailCurrency = 'USD' | 'BWP' | 'ZAR' | 'EUR' | 'GBP';

export type RetailUnitOfMeasure =
  | 'EACH'
  | 'BAG'
  | 'BOX'
  | 'PACKET'
  | 'METRE'
  | 'SQUARE_METRE'
  | 'KILOGRAM'
  | 'LITRE'
  | 'ROLL'
  | 'BUNDLE';

export type RetailHardwareCategory =
  | 'Cement & Aggregates'
  | 'Timber & Boards'
  | 'Roofing & Rainwater'
  | 'Plumbing & Sanitary'
  | 'Paint & Primers'
  | 'Electrical & Lighting'
  | 'Fasteners & Fixings'
  | 'Tools & Hardware'
  | 'Building Materials & Steel'
  | 'General Supplies';

export type StockMovementType =
  | 'RECEIVING'
  | 'SALE'
  | 'SALE_REFUND'
  | 'DAMAGE_WRITE_OFF'
  | 'THEFT_LOSS'
  | 'COUNT_ADJUSTMENT'
  | 'TRANSFER'
  | 'OPENING_STOCK';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PARTIAL_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export type SaleSource = 'POS' | 'QUOTATION' | 'INVOICE' | 'MANUAL';

export type SaleStatus =
  | 'COMPLETED'
  | 'PARTIALLY_PAID'
  | 'PENDING'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH'
  | 'CARD_EXTERNAL'
  | 'BANK_TRANSFER'
  | 'SPLIT';

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export type ExpenseCategory =
  | 'RENT'
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'TRANSPORT_FUEL'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'OFFICE_SUPPLIES'
  | 'INSURANCE'
  | 'SECURITY'
  | 'PROFESSIONAL_SERVICES'
  | 'OTHER';

export type ExpenseStatus = 'RECORDED' | 'APPROVED' | 'PAID' | 'REJECTED';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'HOURLY';
export type PayFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';

export type PayrollRunStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export type RetailRole =
  | 'STORE_OWNER'
  | 'RETAIL_MANAGER'
  | 'CASHIER'
  | 'INVENTORY_CLERK'
  | 'PAYROLL_MANAGER';

// ---------------------------------------------------------------------------
// 1. Entitlement Record
// ---------------------------------------------------------------------------
export interface TenantModuleEntitlement {
  id: string;
  organizationId: string;
  workspaceId: string;
  moduleKey: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING';
  tier: 'PILOT' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  defaultCurrency: RetailCurrency;
  settings: {
    pilotCustomer?: string;
    isExclusivePilot?: boolean;
    allowedRoles?: string[];
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 2. Locations / Branches
// ---------------------------------------------------------------------------
export interface RetailLocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  code: string;
  address?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 3. Suppliers
// ---------------------------------------------------------------------------
export interface RetailSupplier {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  currency: RetailCurrency;
  balanceOwed: number;
  notes?: string;
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailTaxCode {
  id: string;
  organizationId: string;
  workspaceId: string;
  code: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailDepartment {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  code?: string;
  sortOrder: number;
  isActive: boolean;
  subdepartments?: RetailSubdepartment[];
  createdAt: string;
  updatedAt: string;
}

export interface RetailSubdepartment {
  id: string;
  organizationId: string;
  workspaceId: string;
  departmentId: string;
  name: string;
  code?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailBrand {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailProductSupplier {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  supplierId: string;
  supplierName?: string;
  supplierSku?: string;
  isPreferred: boolean;
  lastCost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RetailProductPackage {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  label: string;
  kind: 'SALES' | 'PURCHASE' | 'BOTH';
  baseUnitsPerPack: number;
  barcode?: string;
  sellingPrice?: number;
  purchaseCost?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RetailGoodsReceiptItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  goodsReceiptId: string;
  poItemId: string;
  productId: string;
  quantityReceived: number;
  packSize: number;
  baseQuantity: number;
  unitCost: number;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// 4. Products & Stock
// ---------------------------------------------------------------------------
export interface RetailProduct {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  departmentId?: string;
  subdepartmentId?: string;
  brandId?: string;
  taxCodeId?: string;
  description?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  unitOfMeasure: RetailUnitOfMeasure;
  purchaseCost: number;
  sellingPrice: number;
  minSellingPrice: number;
  vatRate: number;
  reorderLevel: number;
  currentStock?: number;
  status: 'ACTIVE' | 'DISCONTINUED' | 'DRAFT';
  imageUrl?: string;
  isPilotDemo?: boolean;
  packages?: RetailProductPackage[];
  suppliers?: RetailProductSupplier[];
  createdAt: string;
  updatedAt: string;
}

export interface RetailStockLevel {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  locationId?: string;
  quantityOnHand: number;
  quantityReserved: number;
  updatedAt: string;
}

export interface RetailStockMovement {
  id: string;
  organizationId: string;
  workspaceId: string;
  productId: string;
  productName?: string;
  productSku?: string;
  locationId?: string;
  movementType: StockMovementType;
  quantityChange: number;
  balanceAfter: number;
  unitCost: number;
  referenceType?: 'PURCHASE_ORDER' | 'SALE_RECEIPT' | 'MANUAL_ADJUSTMENT' | 'STOCKTAKE' | 'INITIAL_IMPORT';
  referenceId?: string;
  reason?: string;
  createdBy?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 5. Purchasing & Goods Receipts
// ---------------------------------------------------------------------------
export interface RetailPoItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
  packageId?: string;
  packLabel?: string;
  packSize?: number;
  createdAt?: string;
}

export interface RetailPurchaseOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  status: PurchaseOrderStatus;
  currency: RetailCurrency;
  totalAmount: number;
  notes?: string;
  expectedDate?: string;
  createdBy?: string;
  approvedBy?: string;
  items?: RetailPoItem[];
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailGoodsReceipt {
  id: string;
  organizationId: string;
  workspaceId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  receivedBy?: string;
  notes?: string;
  items?: RetailGoodsReceiptItem[];
  receivedAt: string;
}

// ---------------------------------------------------------------------------
// 6. Quotations
// ---------------------------------------------------------------------------
export interface RetailQuoteItem {
  id: string;
  quotationId: string;
  productId: string;
  productName?: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountRate: number;
  taxRate: number;
  lineTotal: number;
  packageId?: string;
  packLabel?: string;
  packSize?: number;
  createdAt?: string;
}

export interface RetailQuotation {
  id: string;
  organizationId: string;
  workspaceId: string;
  quoteNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: QuotationStatus;
  currency: RetailCurrency;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  convertedSaleId?: string;
  createdBy?: string;
  items?: RetailQuoteItem[];
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 7. Cashier Shifts
// ---------------------------------------------------------------------------
export interface RetailCashierShift {
  id: string;
  organizationId: string;
  workspaceId: string;
  cashierUserId: string;
  cashierName: string;
  startedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCashActual?: number;
  expectedCash?: number;
  variance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 8. Sales & Invoices
// ---------------------------------------------------------------------------
export interface RetailSaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  discountRate: number;
  lineTotal: number;
  lineCost: number;
  packageId?: string;
  packLabel?: string;
  packSize?: number;
  baseQuantity?: number;
  createdAt?: string;
}

export interface RetailSalePayment {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  reference?: string;
  recordedAt: string;
}

export interface RetailSale {
  id: string;
  organizationId: string;
  workspaceId: string;
  saleNumber: string;
  invoiceNumber?: string;
  source: SaleSource;
  customerId?: string;
  customerName: string;
  cashierUserId?: string;
  cashierName?: string;
  shiftId?: string;
  status: SaleStatus;
  currency: RetailCurrency;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  idempotencyKey?: string;
  notes?: string;
  items?: RetailSaleItem[];
  payments?: RetailSalePayment[];
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 9. Operating Expenses
// ---------------------------------------------------------------------------
export interface RetailExpense {
  id: string;
  organizationId: string;
  workspaceId: string;
  expenseNumber: string;
  category: ExpenseCategory;
  payee: string;
  amount: number;
  taxAmount: number;
  currency: RetailCurrency;
  paymentMethod: string;
  expenseDate: string;
  status: ExpenseStatus;
  approvedBy?: string;
  receiptUrl?: string;
  notes?: string;
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 10. Employees & Payroll
// ---------------------------------------------------------------------------
export interface RetailEmployee {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  baseSalaryMonthly: number;
  hourlyRate: number;
  payFrequency: PayFrequency;
  paymentMethod: string;
  bankName?: string;
  bankAccountMasked?: string;
  hireDate: string;
  isPilotDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailPayslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  basePay: number;
  overtimePay: number;
  allowances: number;
  deductionsStatutory: number;
  deductionsOther: number;
  grossPay: number;
  netPay: number;
  paymentStatus: 'PENDING' | 'PAID';
  createdAt: string;
}

export interface RetailPayrollRun {
  id: string;
  organizationId: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  currency: RetailCurrency;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: PayrollRunStatus;
  approvedBy?: string;
  paymentRecordedAt?: string;
  notes?: string;
  payslips?: RetailPayslip[];
  isPilotDemo?: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 11. Retail Settings
// ---------------------------------------------------------------------------
export interface RetailSettings {
  id?: string;
  organizationId: string;
  workspaceId: string;
  storeName: string;
  defaultCurrency: RetailCurrency;
  taxRatePercent: number;
  enableNegativeStock: boolean;
  receiptHeader?: string;
  receiptFooter?: string;
  lowStockThreshold: number;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 12. Retail Dashboard Performance & Financial Metrics
// ---------------------------------------------------------------------------
export interface RetailFinancialMetrics {
  currency: RetailCurrency;
  // Performance
  todaySales: number;
  todaySalesCount: number;
  monthlySales: number;
  monthlySalesCount: number;
  salesGrowthPercent: number;
  // Profitability
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  operatingExpenses: number;
  payrollExpenses: number;
  estimatedOperatingProfit: number;
  operatingMarginPercent: number;
  // Balances
  outstandingCustomerBalances: number;
  outstandingSupplierBalances: number;
  // Operational counts
  totalActiveProducts: number;
  stockValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingQuotationsCount: number;
  pendingQuotationsAmount: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  pendingPurchaseOrdersCount: number;
  // Trends
  salesOverTime: Array<{ date: string; sales: number; profit: number }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
  bestSellers: Array<{ productId: string; name: string; quantitySold: number; revenue: number }>;
}
