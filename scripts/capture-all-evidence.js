const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = path.resolve('C:/Users/Ras Ali Labs/.gemini/antigravity-ide/brain/d0041236-be22-4300-a2a8-1e62deebe22e');

const mockUser = {
  uid: '11111111-1111-1111-1111-111111111111',
  id: '11111111-1111-1111-1111-111111111111',
  email: 'owner@frosthub.co.bw',
  fullName: 'Kagiso Mogapi (Authorized Staff)',
  displayName: 'Kagiso Mogapi',
  role: 'STORE_MANAGER'
};

const mockOrg = {
  id: '85ec9738-937a-41ee-b0df-ed752777447c',
  name: 'Frosthub Hardware & Building Supplies'
};

const mockWs = {
  id: '67074e47-76bb-40e1-ae05-362e9cae8798',
  name: 'Gaborone West Industrial Branch'
};

const mockBranch = {
  id: '67074e47-76bb-40e1-ae05-362e9cae8798',
  name: 'Main HQ Branch'
};

const mockProducts = [
  {
    id: 'p-1',
    sku: 'HW-SCR-001',
    name: 'Drywall Screws 25mm (Box of 500)',
    sellingPrice: 14.50,
    currentStock: 120,
    unitOfMeasure: 'box',
    department: 'Fixings & Fasteners',
    departmentName: 'Fixings & Fasteners',
    brand: 'ProFix'
  },
  {
    id: 'p-2',
    sku: 'HW-SCR-002',
    name: 'Timber Wood Screws 50mm (Pack of 100)',
    sellingPrice: 9.75,
    currentStock: 85,
    unitOfMeasure: 'pack',
    department: 'Fixings & Fasteners',
    departmentName: 'Fixings & Fasteners',
    brand: 'ProFix'
  },
  {
    id: 'p-3',
    sku: 'HW-CEM-042',
    name: 'Portland Cement 42.5N (50kg Bag)',
    sellingPrice: 12.00,
    currentStock: 240,
    unitOfMeasure: 'bag',
    department: 'Building Materials',
    departmentName: 'Building Materials',
    brand: 'Pretoria Cement'
  },
  {
    id: 'p-4',
    sku: 'HW-DRL-018',
    name: 'Cordless Combi Drill 18V Brushless',
    sellingPrice: 185.00,
    currentStock: 14,
    unitOfMeasure: 'ea',
    department: 'Power Tools',
    departmentName: 'Power Tools',
    brand: 'Makita'
  }
];

const mockShifts = [
  {
    id: 'shift-101',
    cashierId: '11111111-1111-1111-1111-111111111111',
    cashierName: 'Kagiso Mogapi',
    terminalId: 'POS-T1',
    status: 'CLOSED',
    reconciliationStatus: 'RECONCILED',
    isMissingCashup: false,
    hasCashupReport: true,
    openedAt: '2026-10-27T06:00:00Z',
    closedAt: '2026-10-27T16:00:00Z',
    openingCashFloat: 150.00,
    closingCashActual: 1285.00,
    expectedCash: 1285.00,
    variance: 0.00,
    report: {
      id: 'rep-101',
      salesCount: 42,
      grossSales: 1650.00,
      discountTotal: 25.00,
      netSales: 1625.00,
      cashSales: 1135.00,
      cardSales: 420.00,
      transferSales: 70.00,
      cashRefunds: 0.00,
      expectedCash: 1285.00,
      expectedDrawerCash: 1285.00,
      actualCountedCash: 1285.00,
      cashVariance: 0.00
    }
  },
  {
    id: 'shift-102',
    cashierId: '33333333-3333-3333-3333-333333333333',
    cashierName: 'Tebogo Tau',
    terminalId: 'POS-T2',
    status: 'CLOSED',
    reconciliationStatus: 'MISSING_CASHUP',
    isMissingCashup: true,
    hasCashupReport: false,
    openedAt: '2026-10-28T06:30:00Z',
    closedAt: '2026-10-28T14:15:00Z',
    openingCashFloat: 150.00,
    closingCashActual: null,
    expectedCash: null,
    variance: null,
    report: null
  },
  {
    id: 'shift-103',
    cashierId: '11111111-1111-1111-1111-111111111111',
    cashierName: 'Kagiso Mogapi',
    terminalId: 'POS-T1',
    status: 'OPEN',
    reconciliationStatus: 'ACTIVE',
    isMissingCashup: false,
    hasCashupReport: false,
    openedAt: '2026-10-29T06:00:00Z',
    closedAt: null,
    openingCashFloat: 150.00,
    report: null
  }
];

const mockDrilldownShift101 = {
  shift: mockShifts[0],
  report: mockShifts[0].report,
  metrics: {
    netSales: 1625.00,
    grossSales: 1650.00,
    refundsTotal: 0.00,
    cashVariance: 0.00
  },
  sales: [
    {
      id: 'sale-001',
      saleNumber: 'POS-20261027-001',
      customerName: 'Kgale Contractors (Pty) Ltd',
      totalAmount: 320.00,
      paymentMethod: 'CASH',
      saleDate: '2026-10-27T08:15:00Z',
      items: [
        { productName: 'Portland Cement 42.5N (50kg Bag)', product_name: 'Portland Cement 42.5N (50kg Bag)', quantity: 20, unit_price: 12.00, line_total: 240.00 },
        { productName: 'Drywall Screws 25mm (Box of 500)', product_name: 'Drywall Screws 25mm (Box of 500)', quantity: 4, unit_price: 14.50, line_total: 58.00 }
      ]
    },
    {
      id: 'sale-002',
      saleNumber: 'POS-20261027-002',
      customerName: 'Gaborone Builders & Joinery',
      totalAmount: 185.00,
      paymentMethod: 'CARD_EXTERNAL',
      saleDate: '2026-10-27T09:40:00Z',
      items: [
        { productName: 'Cordless Combi Drill 18V Brushless', product_name: 'Cordless Combi Drill 18V Brushless', quantity: 1, unit_price: 185.00, line_total: 185.00 }
      ]
    },
    {
      id: 'sale-003',
      saleNumber: 'POS-20261027-003',
      customerName: 'Walk-in Retail Customer',
      totalAmount: 85.00,
      paymentMethod: 'MOBILE_MONEY',
      saleDate: '2026-10-27T11:20:00Z',
      items: [
        { productName: 'Timber Wood Screws 50mm (Pack of 100)', product_name: 'Timber Wood Screws 50mm (Pack of 100)', quantity: 8, unit_price: 9.75, line_total: 78.00 }
      ]
    }
  ],
  returns: [
    {
      id: 'ret-001',
      returnNumber: 'RET-20261027-001',
      createdAt: '2026-10-27T13:45:00Z',
      reason: 'Incorrect size purchased — unopened box',
      refundPaymentMethod: 'CASH',
      refundAmount: 14.50
    }
  ],
  voidedSales: [
    {
      id: 'void-001',
      saleNumber: 'POS-20261027-000',
      voidedAt: '2026-10-27T07:15:00Z',
      voidReason: 'Customer card declined twice, transaction cancelled by cashier',
      managerId: 'MGR-01',
      totalAmount: 45.00
    }
  ]
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Route interceptors matching any host (localhost or rasalilabs.com)
  await context.route(url => url.pathname.includes('/api/auth/context'), route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: mockUser,
        organization: mockOrg,
        workspace: mockWs,
        membership: { role: 'OWNER', tier: 'ENTERPRISE' }
      })
    });
  });

  await context.route(url => url.pathname.includes('/api/retail/entitlement'), route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isEntitled: true,
        canAccessPOS: true,
        canAccessReports: true,
        canAccessSales: true,
        canAccessQuotations: true,
        effectiveRole: 'STORE_MANAGER',
        defaultCurrency: 'USD',
        status: 'ACTIVE'
      })
    });
  });

  await context.route(url => url.pathname.includes('/api/retail/catalogue/search'), route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: mockProducts }) });
  });

  await context.route(url => url.pathname.includes('/api/retail/pos/shifts'), route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, activeShift: mockShifts[2] }) });
  });

  await context.route(url => url.pathname.includes('/api/retail/catalogue/filters'), route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        filters: {
          departments: [
            { id: 'd1', name: 'Fixings & Fasteners' },
            { id: 'd2', name: 'Building Materials' },
            { id: 'd3', name: 'Power Tools' }
          ],
          brands: [
            { id: 'b1', name: 'ProFix' },
            { id: 'b2', name: 'Makita' },
            { id: 'b3', name: 'Pretoria Cement' }
          ]
        }
      })
    });
  });

  await context.route(url => url.pathname.includes('/api/retail/locations'), route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, locations: [] }) });
  });

  await context.route(url => url.pathname.includes('/api/retail/pos/cashup'), route => {
    const reqUrl = route.request().url();
    if (reqUrl.includes('shiftId=') || reqUrl.includes('drilldownShiftId=')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, drilldown: mockDrilldownShift101 })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          shifts: mockShifts,
          reports: [mockShifts[0].report]
        })
      });
    }
  });

  await context.route(url => url.pathname.includes('/api/retail/reports'), route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        metrics: {
          totalRevenue: 45280.00,
          totalCogs: 28400.00,
          grossProfit: 16880.00,
          grossMarginPct: 37.28,
          totalExpenses: 4200.00,
          totalPayroll: 3500.00,
          operatingProfit: 9180.00,
          operatingMarginPct: 20.27,
          inventoryItemCount: 1420,
          inventoryValuationCost: 85200.00,
          inventoryValuationRetail: 124500.00,
          totalTransactions: 312
        }
      })
    });
  });

  const page = await context.newPage();

  // Inject valid Supabase session & context snapshot before execution
  await page.addInitScript(({ user, org, ws, branch }) => {
    try {
      const futureTime = Math.floor(Date.now() / 1000) + 3600000;
      const sess = {
        access_token: 'valid-test-access-token',
        refresh_token: 'valid-test-refresh-token',
        expires_at: futureTime,
        expires_in: 3600000,
        token_type: 'bearer',
        user: { id: user.uid, email: user.email, app_metadata: {}, user_metadata: {} }
      };
      localStorage.setItem('ralion-app-auth-token', JSON.stringify(sess));
      localStorage.setItem('ralion_active_workspace_id', ws.id);
      localStorage.setItem('ralion_organization_id', org.id);
      window.__ralion_access_token__ = 'valid-test-access-token';
      window.__ralion_access_token_user__ = sess.user;
      localStorage.setItem('ralion_context_snapshot_v1', JSON.stringify({
        savedAt: Date.now(),
        user: user,
        organization: org,
        workspace: ws,
        activeBranch: branch
      }));
    } catch (e) {}
  }, { user: mockUser, org: mockOrg, ws: mockWs, branch: mockBranch });

  // 1. Capture Redesigned Cashier Clean Lane Workstation
  console.log('1. Capturing Redesigned Cashier Clean Lane Workstation...');
  await page.goto('http://localhost:6509/ralion/cashier', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const cleanLanePath = path.join(outDir, 'redesigned_cashier_clean_lane.png');
  await page.screenshot({ path: cleanLanePath });
  console.log(`Saved: ${cleanLanePath}`);

  // 2. Open Product Search Modal (F3)
  console.log('2. Capturing Cashier F3 Product Search Modal...');
  const searchBtn = page.locator('button:has-text("Search (F3)")');
  if (await searchBtn.isVisible()) {
    await searchBtn.click();
    await page.waitForTimeout(600);
    const searchModalPath = path.join(outDir, 'redesigned_cashier_search_modal.png');
    await page.screenshot({ path: searchModalPath });
    console.log(`Saved: ${searchModalPath}`);
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 3. Switch to Touch Catalogue Grid
  console.log('3. Capturing Cashier Touch Catalogue Grid...');
  const catalogueBtn = page.locator('button:has-text("Touch Catalogue")');
  if (await catalogueBtn.isVisible()) {
    await catalogueBtn.click();
    await page.waitForTimeout(800);
    const catalogueGridPath = path.join(outDir, 'redesigned_cashier_touch_catalogue.png');
    await page.screenshot({ path: catalogueGridPath });
    console.log(`Saved: ${catalogueGridPath}`);
  }

  // 4. Capture Closed-Shift Cash-Up Reports Management View
  console.log('4. Capturing Closed-Shift Cash-Up Reporting View...');
  await page.goto('http://localhost:6509/ralion/retail/reports', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click Cashier Cash-Ups & Reconciliation tab
  const cashupsTab = page.locator('button:has-text("Cashier Cash-Ups & Reconciliation")').first();
  if (await cashupsTab.isVisible()) {
    await cashupsTab.click();
    await page.waitForTimeout(1500);
  }

  const reportsPath = path.join(outDir, 'closed_shift_cashup_reporting.png');
  await page.screenshot({ path: reportsPath });
  console.log(`Saved: ${reportsPath}`);

  // 5. Open Shift Drilldown Modal by clicking the row
  console.log('5. Capturing Shift Drilldown Modal...');
  const shiftRow = page.locator('tr:has-text("Kagiso Mogapi")').first();
  if (await shiftRow.isVisible()) {
    console.log('Found shift row, clicking...');
    await shiftRow.click();
    const modalHeader = page.locator('h3:has-text("Shift Reconciliation")');
    await modalHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const drilldownPath = path.join(outDir, 'shift_cashup_drilldown_modal.png');
    await page.screenshot({ path: drilldownPath });
    console.log(`Saved: ${drilldownPath}`);
  } else {
    console.warn('Could not find Kagiso Mogapi shift row!');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});
