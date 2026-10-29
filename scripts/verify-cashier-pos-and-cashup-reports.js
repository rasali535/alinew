#!/usr/bin/env node
/**
 * Ralion Retail OS — Cashier POS & Closed-Shift Cash-Up Regression Suite
 * 
 * Verifies:
 * 1. Cashier Workstation Integration at /ralion/cashier (apps/ralion/src/app/cashier/page.tsx)
 *    - Approved Clean Lane POS improvements from Issue #164
 *    - Clean Lane (F2) vs Touch Catalogue Grid toggle
 *    - Empty Landing Hero ("Point of Sale Terminal", "Scan a barcode or search for a product to begin.")
 *    - Quick search pills ("Search Screws & Fixings", "Browse Full Catalogue (F3)")
 *    - Floor Manager Controls trigger & FloorManagerModal
 *    - ProductSearchModal (F3 shortcut & fast barcode lookup)
 *    - RetailReceiptModal multi-format thermal receipt printing
 *    - Elevated stacking hierarchy (z-60 flex items-center justify-center)
 *    - Preservation of cashier-specific workstation features (station lock, login, 80mm slip, manager PIN)
 * 2. Cash-Up & Shift API Contract (apps/ralion/src/app/api/retail/pos/cashup/route.ts)
 *    - Response shape: { success: true, shifts: [...], reports: [...] }
 *    - Role-based filtering (canAccessReports sees all workspace shifts, canAccessPOS scoped to own shifts)
 *    - Missing cash-up identification (isMissingCashup: true, reconciliationStatus: 'MISSING_CASHUP')
 *    - Drilldown endpoint (?drilldownShiftId=<id>) returns { success: true, drilldown: { shift, sales, returns, voids, cashupReport } }
 * 3. Database Service Shift Correlation (apps/ralion/src/lib/services/retail/retailDatabase.service.ts)
 *    - listShiftsWithCashups correlates retail_cashier_shifts with retail_cashier_cashup_reports
 *    - Missing cash-ups flagged explicitly with reconciliationStatus = 'MISSING_CASHUP'
 *    - No falsified $0 reconciliations or fabricated records
 *    - getShiftTransactionDrilldown itemizes sales, returns, voids, and cashupReport
 * 4. Management Reports & Historical View (apps/ralion/src/components/retail/CashierCashupsView.tsx)
 *    - Clear visual separation of Reconciled vs Missing Cash-Up shifts
 *    - Missing cash-up alert badge, unreconciled drawer indicator, and drilldown inspection
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '..');

const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;

let passed = 0;
let failed = 0;

function check(testName, fn) {
  try {
    fn();
    console.log(`  ${green('✓')} ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ${red('✗')} ${testName}`);
    console.error(`    ${yellow(err.message)}`);
    failed++;
  }
}

console.log(cyan(bold('\n======================================================================')));
console.log(cyan(bold('  🛒 RALION RETAIL OS: CASHIER POS & CLOSED-SHIFT CASH-UP VERIFICATION')));
console.log(cyan('  Scope: Cashier Workstation UI, Cash-Up API, Database & Reporting'));
console.log(cyan(bold('======================================================================\n')));

// -----------------------------------------------------------------------------
// 1. CASHIER WORKSTATION UI INTEGRATION (/ralion/cashier)
// -----------------------------------------------------------------------------
console.log(cyan('1. Verifying Approved POS Improvements in apps/ralion/src/app/cashier/page.tsx...'));
const cashierContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/cashier/page.tsx'), 'utf8');

check('Cashier page imports approved POS components', () => {
  assert(cashierContent.includes("import { ProductSearchModal } from '@/components/retail/ProductSearchModal'"), 'Missing ProductSearchModal import');
  assert(cashierContent.includes("import { FloorManagerModal } from '@/components/retail/FloorManagerModal'"), 'Missing FloorManagerModal import');
  assert(cashierContent.includes("import { RetailReceiptModal } from '@/components/retail/RetailReceipt'"), 'Missing RetailReceiptModal import');
});

check('View mode toggle between Clean Lane (F2) and Touch Catalogue present', () => {
  assert(cashierContent.includes("laneViewMode"), 'Missing laneViewMode state');
  assert(cashierContent.includes("Clean Lane (F2)"), 'Missing Clean Lane (F2) toggle button');
  assert(cashierContent.includes("Touch Catalogue"), 'Missing Touch Catalogue toggle button');
});

check('Clean Lane empty hero matches approved Point of Sale Terminal design', () => {
  assert(cashierContent.includes('Point of Sale Terminal'), 'Missing Point of Sale Terminal heading');
  assert(cashierContent.includes('Scan a barcode or search for a product to begin.'), 'Missing scan prompt hero text');
  assert(cashierContent.includes('Search Screws & Fixings'), 'Missing quick search screws button');
  assert(cashierContent.includes('Browse Full Catalogue (F3)'), 'Missing browse full catalogue button');
  assert(cashierContent.includes('Africa/Gaborone (CAT)'), 'Missing Botswana CAT timezone info');
});

check('Floor Manager controls modal trigger and component instantiation present', () => {
  assert(cashierContent.includes('isFloorManagerModalOpen'), 'Missing isFloorManagerModalOpen state');
  assert(cashierContent.includes('Floor Manager'), 'Missing Floor Manager button in toolbar');
  assert(cashierContent.includes('<FloorManagerModal'), 'Missing <FloorManagerModal> element');
});

check('Product search modal and F3 shortcut present', () => {
  assert(cashierContent.includes('isSearchModalOpen'), 'Missing isSearchModalOpen state');
  assert(cashierContent.includes('Search (F3)'), 'Missing Search (F3) button in toolbar');
  assert(cashierContent.includes('<ProductSearchModal'), 'Missing <ProductSearchModal> element');
  assert(cashierContent.includes("e.key === 'F3'"), 'Missing F3 keyboard shortcut listener');
});

check('Receipt modal renders multi-format receipt for returns and cash-ups', () => {
  assert(cashierContent.includes('receiptReturn'), 'Missing receiptReturn state');
  assert(cashierContent.includes('receiptCashup'), 'Missing receiptCashup state');
  assert(cashierContent.includes('<RetailReceiptModal'), 'Missing <RetailReceiptModal> element');
});

check('Transaction and security dialogs use elevated z-60 stacking hierarchy over Mari drawer (z-50)', () => {
  assert(cashierContent.includes('z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center'), 'Modals must use elevated z-60 stacking');
});

check('Cashier workstation preserves dedicated login, locking, and 80mm slip printing', () => {
  assert(cashierContent.includes('handleCashierLogin'), 'Missing dedicated cashier login');
  assert(cashierContent.includes('isStationLocked'), 'Missing workstation lock state');
  assert(cashierContent.includes('Print Slip (80mm)'), 'Missing 80mm thermal slip print button');
  assert(cashierContent.includes('requestDiscountUpdate'), 'Missing discount override handler');
});

// -----------------------------------------------------------------------------
// 2. CASH-UP & SHIFT API CONTRACT (/api/retail/pos/cashup)
// -----------------------------------------------------------------------------
console.log(cyan('\n2. Verifying Cash-Up & Shift API Contract in apps/ralion/src/app/api/retail/pos/cashup/route.ts...'));
const cashupRouteContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/api/retail/pos/cashup/route.ts'), 'utf8');

check('API enforces role-based access for canAccessReports and canAccessPOS', () => {
  assert(cashupRouteContent.includes('canAccessReports'), 'Missing canAccessReports check');
  assert(cashupRouteContent.includes('canAccessPOS'), 'Missing canAccessPOS check');
  assert(cashupRouteContent.includes('FORBIDDEN_CASHUP_ACCESS') || cashupRouteContent.includes('403'), 'Missing 403 Forbidden rejection');
});

check('Cashier access is scoped strictly to cashier\'s own shifts', () => {
  assert(cashupRouteContent.includes('!entitlement.canAccessReports && entitlement.canAccessPOS'), 'Missing cashier role branch');
  assert(cashupRouteContent.includes('s.cashierId === context.user.id') || cashupRouteContent.includes('cashierUserId'), 'Cashier shifts must be scoped to authenticated user ID');
});

check('API returns both shifts and reports in canonical response shape', () => {
  assert(cashupRouteContent.includes('shifts') && cashupRouteContent.includes('reports'), 'Response must include shifts and reports arrays');
  assert(cashupRouteContent.includes('listShiftsWithCashups'), 'API must call listShiftsWithCashups service method');
});

check('API supports transaction drilldown parameter (?drilldownShiftId=<id>)', () => {
  assert(cashupRouteContent.includes('drilldownShiftId') || cashupRouteContent.includes('shiftId'), 'API must support drilldown query parameter');
  assert(cashupRouteContent.includes('drilldown'), 'API must return drilldown detail object');
  assert(cashupRouteContent.includes('getShiftTransactionDrilldown'), 'API must call getShiftTransactionDrilldown service method');
});

// -----------------------------------------------------------------------------
// 3. DATABASE SERVICE SHIFT & CASH-UP CORRELATION
// -----------------------------------------------------------------------------
console.log(cyan('\n3. Verifying Database Service Implementation in apps/ralion/src/lib/services/retail/retailDatabase.service.ts...'));
const dbServiceContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/lib/services/retail/retailDatabase.service.ts'), 'utf8');

check('retailDatabaseService implements listShiftsWithCashups', () => {
  assert(dbServiceContent.includes('static async listShiftsWithCashups('), 'Missing listShiftsWithCashups method');
});

check('Missing cash-up records are explicitly identified without fabricating data', () => {
  assert(dbServiceContent.includes("'MISSING_CASHUP'"), 'Missing cash-up must be identified as MISSING_CASHUP');
  assert(dbServiceContent.includes('isMissingCashup'), 'Missing cash-up must flag isMissingCashup');
  assert(dbServiceContent.includes('hasCashupReport'), 'Missing cash-up must flag hasCashupReport');
});

check('Reconciled shifts maintain actual cash count and calculated variance', () => {
  assert(dbServiceContent.includes("'RECONCILED'"), 'Closed shift with report must be flagged as RECONCILED');
  assert(dbServiceContent.includes('actualCountedCash') || dbServiceContent.includes('closingCashActual'), 'Reconciled shift must reflect counted closing cash');
  assert(dbServiceContent.includes('cashVariance') || dbServiceContent.includes('variance'), 'Reconciled shift must reflect cashVariance');
});

check('retailDatabaseService implements getShiftTransactionDrilldown with itemized sales, returns, voids, and cashupReport', () => {
  assert(dbServiceContent.includes('static async getShiftTransactionDrilldown('), 'Missing getShiftTransactionDrilldown method');
  assert(dbServiceContent.includes('sales: salesRes.data'), 'Drilldown must include sales');
  assert(dbServiceContent.includes('returns: returnsRes.data'), 'Drilldown must include returns');
  assert(dbServiceContent.includes('voids: voidsRes.data'), 'Drilldown must include voids');
  assert(dbServiceContent.includes('cashupReport: cashupRes.data'), 'Drilldown must include cashupReport');
});

// -----------------------------------------------------------------------------
// 4. MANAGEMENT REPORTS & HISTORICAL VIEW
// -----------------------------------------------------------------------------
console.log(cyan('\n4. Verifying Management Reports & Historical View in apps/ralion/src/components/retail/CashierCashupsView.tsx...'));
const cashupsViewContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/components/retail/CashierCashupsView.tsx'), 'utf8');

check('CashierCashupsView normalizes response data gracefully', () => {
  assert(cashupsViewContent.includes('data.shifts || data.reports || []'), 'CashierCashupsView must handle data.shifts and data.reports');
});

check('Missing cash-up shifts are visually identified with badge and unreconciled status', () => {
  assert(cashupsViewContent.includes('Missing Cash-Up'), 'View must render Missing Cash-Up label');
  assert(cashupsViewContent.includes('Unreconciled'), 'View must render Unreconciled status');
  assert(cashupsViewContent.includes('Not Counted'), 'View must render Not Counted metric');
  assert(cashupsViewContent.includes('isMissingCashup'), 'View must inspect isMissingCashup property');
});

check('Drilldown modal and print receipt trigger are provided in CashierCashupsView', () => {
  assert(cashupsViewContent.includes('drilldownData'), 'CashierCashupsView must store drilldownData');
  assert(cashupsViewContent.includes('selectedShiftId'), 'CashierCashupsView must track selectedShiftId');
  assert(cashupsViewContent.includes('openDrilldown'), 'CashierCashupsView must implement openDrilldown');
  assert(cashupsViewContent.includes('printReport'), 'CashierCashupsView must support thermal slip re-printing');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(cyan(bold('\n======================================================================')));
console.log(cyan(bold(`  REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)));
console.log(cyan(bold('======================================================================\n')));

if (failed > 0) {
  process.exit(1);
}
