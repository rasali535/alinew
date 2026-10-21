/**
 * Ralion OS — Ralion Retail Hardware Store Pilot Demo Data Loader
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides a rich, realistic hardware-store dataset in configured currency
 * for customer evaluation (e.g., USD, BWP, ZAR).
 * All demo records are marked with is_pilot_demo = true.
 *
 * Safeguards:
 * - Deterministic, RFC 4122 compliant UUIDs for PostgreSQL primary keys
 * - Never alters or mutates live customer records
 * - Checks destination workspace to prevent accidental overwrite of existing live inventory
 */

import crypto from 'node:crypto';
import {
  RetailProduct,
  RetailSupplier,
  RetailExpense,
  RetailEmployee,
  RetailQuotation,
  RetailPurchaseOrder,
  RetailCurrency,
} from '@ralion/database';
import { RetailDatabaseService } from './retailDatabase.service';

/**
 * Generates an idempotent, valid RFC 4122 UUID v4 format from workspaceId and an item key.
 */
export function makeDeterministicUuid(workspaceId: string, itemKey: string): string {
  const hash = crypto.createHash('sha256').update(`${workspaceId}:${itemKey}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

export class RetailDemoDataService {
  /**
   * Seeds realistic hardware store inventory, suppliers, employees, and expenses.
   */
  static async loadHardwareStoreDemoData(
    organizationId: string,
    workspaceId: string,
    cashierUserId: string,
    options?: {
      currency?: RetailCurrency;
      force?: boolean;
    }
  ): Promise<{ productsCount: number; suppliersCount: number; expensesCount: number }> {
    const currency: RetailCurrency = options?.currency || 'USD';

    // Safeguard: Check if destination workspace already contains live (non-demo) data
    if (!options?.force) {
      try {
        const existingProducts = await RetailDatabaseService.listProducts(workspaceId);
        const nonDemo = existingProducts.filter((p) => !p.isPilotDemo);
        if (nonDemo.length > 0) {
          throw new Error(
            `Destination workspace contains ${nonDemo.length} live products. Demo data seeding aborted to protect existing customer data.`
          );
        }
      } catch (checkErr: any) {
        // If query fails or table empty, proceed safely
        if (checkErr.message?.includes('Destination workspace contains')) {
          throw checkErr;
        }
      }
    }

    // 1. Suppliers (using deterministic UUIDs)
    const suppliers: RetailSupplier[] = [
      {
        id: makeDeterministicUuid(workspaceId, 'sup-1'),
        organizationId,
        workspaceId,
        name: 'Apex Cement & Building Materials',
        contactName: 'David Moyo',
        email: 'orders@apexcement.com',
        phone: '+267 391 4455',
        address: 'Plot 21455, Gaborone West Industrial, Botswana',
        paymentTerms: '30_DAYS',
        currency,
        balanceOwed: 1450.0,
        notes: '[DEMO] Primary bulk cement and aggregates supplier.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'sup-2'),
        organizationId,
        workspaceId,
        name: 'Kalahari Timber & Board Importers',
        contactName: 'Sarah Ndlovu',
        email: 'sales@kalaharitimber.co.bw',
        phone: '+267 395 8822',
        address: 'Plot 4812, Old Industrial, Francistown, Botswana',
        paymentTerms: '14_DAYS',
        currency,
        balanceOwed: 2200.0,
        notes: '[DEMO] Structural pine rafters, shutterboard, and treated poles.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'sup-3'),
        organizationId,
        workspaceId,
        name: 'Steel & Roofing Solutions Ltd',
        contactName: 'Brian Khama',
        email: 'brian@steelroofing.co.bw',
        phone: '+267 390 1200',
        address: 'Plot 1022, Commerce Park, Gaborone, Botswana',
        paymentTerms: '30_DAYS',
        currency,
        balanceOwed: 3100.0,
        notes: '[DEMO] IBR corrugated roofing sheets and steel tubes.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'sup-4'),
        organizationId,
        workspaceId,
        name: 'Universal Paints & Chemicals',
        contactName: 'Lerato Tau',
        email: 'supply@universalpaints.bw',
        phone: '+267 318 6677',
        address: 'Plot 5541, Phakalane Industrial, Gaborone, Botswana',
        paymentTerms: 'CASH_ON_DELIVERY',
        currency,
        balanceOwed: 0.0,
        notes: '[DEMO] PVA interior/exterior paints and waterproofing.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const sup of suppliers) {
      await RetailDatabaseService.upsertSupplier(sup);
    }

    // 2. Hardware Products (using deterministic UUIDs)
    const products: Array<{ product: RetailProduct; initialStock: number }> = [
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-1'),
          organizationId,
          workspaceId,
          name: 'Portland Cement CEM II 32.5N (50kg)',
          sku: 'CEM-325N-50KG',
          barcode: '6001002003001',
          category: 'Cement & Aggregates',
          subcategory: 'Bagged Cement',
          description: '[DEMO] High-grade general building cement suitable for bricklaying, plastering, and concrete.',
          brand: 'PPC',
          supplierId: suppliers[0].id,
          supplierName: suppliers[0].name,
          unitOfMeasure: 'BAG',
          purchaseCost: 7.2,
          sellingPrice: 9.8,
          minSellingPrice: 8.9,
          vatRate: 0.0,
          reorderLevel: 50,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 350,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-2'),
          organizationId,
          workspaceId,
          name: 'Structural Pine Timber Rafter 38x114mm (6.0m)',
          sku: 'TIM-PIN-38114-6M',
          barcode: '6001002003002',
          category: 'Timber & Boards',
          subcategory: 'Structural Timber',
          description: '[DEMO] SABS approved kiln-dried structural pine for roof trusses and framing.',
          brand: 'Kalahari Pine',
          supplierId: suppliers[1].id,
          supplierName: suppliers[1].name,
          unitOfMeasure: 'METRE',
          purchaseCost: 14.5,
          sellingPrice: 21.0,
          minSellingPrice: 19.0,
          vatRate: 0.0,
          reorderLevel: 30,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 85,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-3'),
          organizationId,
          workspaceId,
          name: 'Corrugated IBR Galvanized Roofing Sheet 0.4mm (3.6m)',
          sku: 'ROOF-IBR-GALV-36M',
          barcode: '6001002003003',
          category: 'Roofing & Rainwater',
          subcategory: 'Roofing Sheets',
          description: '[DEMO] Zinc coated galvanized corrugated iron roofing sheets, weather resistant.',
          brand: 'SteelPro',
          supplierId: suppliers[2].id,
          supplierName: suppliers[2].name,
          unitOfMeasure: 'EACH',
          purchaseCost: 18.0,
          sellingPrice: 26.5,
          minSellingPrice: 24.0,
          vatRate: 0.0,
          reorderLevel: 40,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 120,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-4'),
          organizationId,
          workspaceId,
          name: 'PVC Underground Drainage Pipe 110mm (6.0m)',
          sku: 'PLU-PVC-110MM-6M',
          barcode: '6001002003004',
          category: 'Plumbing & Sanitary',
          subcategory: 'Pipes & Drainage',
          description: '[DEMO] Heavy duty underground soil and wastewater drainage pipe with rubber ring socket.',
          brand: 'Marley Pipe',
          unitOfMeasure: 'METRE',
          purchaseCost: 11.0,
          sellingPrice: 16.5,
          minSellingPrice: 14.5,
          vatRate: 0.0,
          reorderLevel: 25,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 45,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-5'),
          organizationId,
          workspaceId,
          name: 'Professional Acrylic PVA White Exterior Paint (20L)',
          sku: 'PNT-PVA-WHT-20L',
          barcode: '6001002003005',
          category: 'Paint & Primers',
          subcategory: 'Exterior Paint',
          description: '[DEMO] Weather-guard matte finish high-hiding emulsion paint with UV protection.',
          brand: 'Universal Paints',
          supplierId: suppliers[3].id,
          supplierName: suppliers[3].name,
          unitOfMeasure: 'LITRE',
          purchaseCost: 38.0,
          sellingPrice: 58.0,
          minSellingPrice: 52.0,
          vatRate: 0.0,
          reorderLevel: 15,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 28,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-6'),
          organizationId,
          workspaceId,
          name: 'Drywall Screws Coarse Thread 4.2x25mm (Box of 1000)',
          sku: 'FAS-DWS-4225-1000',
          barcode: '6001002003006',
          category: 'Fasteners & Fixings',
          subcategory: 'Screws & Nails',
          description: '[DEMO] Black phosphate bugle head drywall screws for gypsum board and light steel framing.',
          brand: 'FastenPro',
          unitOfMeasure: 'BOX',
          purchaseCost: 6.5,
          sellingPrice: 11.5,
          minSellingPrice: 9.5,
          vatRate: 0.0,
          reorderLevel: 20,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 65,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-7'),
          organizationId,
          workspaceId,
          name: '18V Cordless Brushless Impact Drill Kit (2x 4.0Ah)',
          sku: 'TOOL-DRL-18V-KIT',
          barcode: '6001002003007',
          category: 'Tools & Hardware',
          subcategory: 'Power Tools',
          description: '[DEMO] Heavy duty 18V impact driver with 2 lithium-ion batteries, quick charger and carry case.',
          brand: 'DeWalt Pro',
          unitOfMeasure: 'EACH',
          purchaseCost: 115.0,
          sellingPrice: 175.0,
          minSellingPrice: 155.0,
          vatRate: 0.0,
          reorderLevel: 5,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 8,
      },
      {
        product: {
          id: makeDeterministicUuid(workspaceId, 'prod-8'),
          organizationId,
          workspaceId,
          name: 'Copper Pipe Class 0 (15mm x 5.5m)',
          sku: 'PLU-COP-15MM-55M',
          barcode: '6001002003008',
          category: 'Plumbing & Sanitary',
          subcategory: 'Pipes & Drainage',
          description: '[DEMO] Rigid copper tubing for domestic hot and cold water installations.',
          brand: 'SABS Copper',
          unitOfMeasure: 'METRE',
          purchaseCost: 16.0,
          sellingPrice: 24.5,
          minSellingPrice: 21.0,
          vatRate: 0.0,
          reorderLevel: 12,
          status: 'ACTIVE',
          isPilotDemo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        initialStock: 6, // Low stock indicator!
      },
    ];

    for (const item of products) {
      await RetailDatabaseService.upsertProduct(item.product, item.initialStock);
    }

    // 3. Operating Expenses (using deterministic UUIDs)
    const expenses: RetailExpense[] = [
      {
        id: makeDeterministicUuid(workspaceId, 'exp-1'),
        organizationId,
        workspaceId,
        expenseNumber: 'EXP-2026-001',
        category: 'RENT',
        payee: 'Commerce Park Properties Ltd',
        amount: 1800.0,
        taxAmount: 0.0,
        currency,
        paymentMethod: 'BANK_TRANSFER',
        expenseDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        status: 'APPROVED',
        notes: '[DEMO] Monthly retail showroom and warehouse lease payment.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'exp-2'),
        organizationId,
        workspaceId,
        expenseNumber: 'EXP-2026-002',
        category: 'ELECTRICITY',
        payee: 'Botswana Power Corporation (BPC)',
        amount: 320.0,
        taxAmount: 0.0,
        currency,
        paymentMethod: 'BANK_TRANSFER',
        expenseDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        status: 'APPROVED',
        notes: '[DEMO] Commercial 3-phase power bill for warehouse lighting and equipment.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'exp-3'),
        organizationId,
        workspaceId,
        expenseNumber: 'EXP-2026-003',
        category: 'TRANSPORT_FUEL',
        payee: 'Engen QuickStop Gaborone',
        amount: 245.0,
        taxAmount: 0.0,
        currency,
        paymentMethod: 'CARD_EXTERNAL',
        expenseDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        status: 'APPROVED',
        notes: '[DEMO] Diesel fuel for customer delivery flatbed truck (B 421 ALN).',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'exp-4'),
        organizationId,
        workspaceId,
        expenseNumber: 'EXP-2026-004',
        category: 'SECURITY',
        payee: 'Shield Security Botswana',
        amount: 290.0,
        taxAmount: 0.0,
        currency,
        paymentMethod: 'BANK_TRANSFER',
        expenseDate: new Date().toISOString().slice(0, 10),
        status: 'APPROVED',
        notes: '[DEMO] 24/7 armed alarm monitoring and guard patrol for lumber yard.',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const exp of expenses) {
      await RetailDatabaseService.recordExpense(exp);
    }

    // 4. Employees (using deterministic UUIDs)
    const employees: RetailEmployee[] = [
      {
        id: makeDeterministicUuid(workspaceId, 'emp-1'),
        organizationId,
        workspaceId,
        firstName: 'Tefo',
        lastName: 'Molapisi',
        jobTitle: 'Store Manager',
        department: 'OPERATIONS',
        employmentStatus: 'ACTIVE',
        employmentType: 'FULL_TIME',
        baseSalaryMonthly: 1650.0,
        hourlyRate: 0.0,
        payFrequency: 'MONTHLY',
        paymentMethod: 'BANK_TRANSFER',
        bankName: 'First National Bank Botswana',
        bankAccountMasked: '•••• 4821',
        hireDate: '2024-03-01',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'emp-2'),
        organizationId,
        workspaceId,
        firstName: 'Neo',
        lastName: 'Sebego',
        jobTitle: 'Senior Cashier & Sales',
        department: 'SALES',
        employmentStatus: 'ACTIVE',
        employmentType: 'FULL_TIME',
        baseSalaryMonthly: 750.0,
        hourlyRate: 0.0,
        payFrequency: 'MONTHLY',
        paymentMethod: 'BANK_TRANSFER',
        bankName: 'Absa Bank Botswana',
        bankAccountMasked: '•••• 1902',
        hireDate: '2025-01-15',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: makeDeterministicUuid(workspaceId, 'emp-3'),
        organizationId,
        workspaceId,
        firstName: 'Kabelo',
        lastName: 'Ramotswa',
        jobTitle: 'Inventory Clerk & Yard Dispatch',
        department: 'LOGISTICS',
        employmentStatus: 'ACTIVE',
        employmentType: 'FULL_TIME',
        baseSalaryMonthly: 680.0,
        hourlyRate: 0.0,
        payFrequency: 'MONTHLY',
        paymentMethod: 'BANK_TRANSFER',
        bankName: 'Stanbic Bank Botswana',
        bankAccountMasked: '•••• 8834',
        hireDate: '2025-06-01',
        isPilotDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const emp of employees) {
      await RetailDatabaseService.upsertEmployee(emp);
    }

    // 5. Sample Initial Completed Sale (Demonstrating Connected Reporting)
    await RetailDatabaseService.executeAtomicSale({
      organizationId,
      workspaceId,
      saleNumber: 'POS-2026-1001',
      source: 'POS',
      customerName: 'Gaborone Building Contractors',
      cashierUserId,
      cashierName: 'Neo Sebego',
      currency,
      items: [
        {
          productId: products[0].product.id,
          productName: products[0].product.name,
          sku: products[0].product.sku,
          quantity: 20,
          unitPrice: 9.8,
          unitCost: 7.2,
        },
        {
          productId: products[5].product.id,
          productName: products[5].product.name,
          sku: products[5].product.sku,
          quantity: 2,
          unitPrice: 11.5,
          unitCost: 6.5,
        },
      ],
      payments: [
        {
          paymentMethod: 'CASH',
          amount: 219.0,
          reference: 'Cash Drawer Receipt #1001',
        },
      ],
      idempotencyKey: makeDeterministicUuid(workspaceId, 'sale-1'),
      notes: '[DEMO] Initial contractor sale for site foundation.',
      isPilotDemo: true,
    });

    // 6. Sample Quotation (Demonstrating Quotation Module & Conversion Workflow)
    const quoteId = makeDeterministicUuid(workspaceId, 'quote-1');
    const quoteItems = [
      {
        id: makeDeterministicUuid(workspaceId, 'qi-1'),
        quotationId: quoteId,
        productId: products[2].product.id,
        productName: products[2].product.name,
        sku: products[2].product.sku,
        description: products[2].product.name,
        quantity: 15,
        unitPrice: 26.5,
        unitCost: 18.0,
        discountRate: 5.0, // 5% discount
        taxRate: 0.0,
        lineTotal: 377.62,
      },
      {
        id: makeDeterministicUuid(workspaceId, 'qi-2'),
        quotationId: quoteId,
        productId: products[1].product.id,
        productName: products[1].product.name,
        sku: products[1].product.sku,
        description: products[1].product.name,
        quantity: 10,
        unitPrice: 21.0,
        unitCost: 14.5,
        discountRate: 5.0,
        taxRate: 0.0,
        lineTotal: 199.5,
      },
    ];

    const quotation: RetailQuotation = {
      id: quoteId,
      organizationId,
      workspaceId,
      quoteNumber: 'Q-2026-084',
      customerName: 'Kalahari Civil Engineering',
      customerPhone: '+267 72 100 450',
      customerEmail: 'procure@kalaharicivil.bw',
      status: 'SENT',
      currency,
      subtotal: 607.5,
      taxTotal: 0.0,
      discountTotal: 30.38,
      totalAmount: 577.12,
      validUntil: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      notes: '[DEMO] Quotation includes 5% trade discount for contractor account.',
      createdBy: cashierUserId,
      items: quoteItems,
      isPilotDemo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await RetailDatabaseService.createQuotation(quotation, quoteItems);

    return {
      productsCount: products.length,
      suppliersCount: suppliers.length,
      expensesCount: expenses.length,
    };
  }
}
