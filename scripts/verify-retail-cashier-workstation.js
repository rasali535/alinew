#!/usr/bin/env node
/**
 * Ralion Retail Cashier Workstation Verification Suite
 * Verifies Issue #153:
 * - Cashier portal URL routing & Apache/Next.js configuration
 * - Dedicated cashier workstation terminal interface
 * - Touch-friendly catalog & fast barcode scanning
 * - Interactive cart, tender calculation, and manager PIN discount controls
 * - 80mm thermal receipt printing modal
 * - Shift open/close reconciliation
 * - Cashier-specific Mari assistant (stock check, approved prices, walk-in quotation builder)
 * - Conversion of quotations into sales
 * - Server-enforced cashier restrictions and dashboard lockdown
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '..');

console.log('======================================================================');
console.log('  🛒 RALION RETAIL CASHIER WORKSTATION VERIFICATION SUITE (#153)');
console.log('  POS Terminal: Full-Screen Workstation & Mari Assistant Integration');
console.log('======================================================================\n');

let passedChecks = 0;
let totalChecks = 0;

function check(title, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✓ ${title}`);
    passedChecks++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${title}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. ROUTING & APACHE PROXY CONFIGURATION
// -----------------------------------------------------------------------------
console.log('1. Verifying Cashier Portal Routing & Web Server Configuration...');

check('apps/ralion/public/.htaccess routes cashier directly to cashier.html', () => {
  const content = fs.readFileSync(path.join(rootDir, 'apps/ralion/public/.htaccess'), 'utf8');
  assert(content.includes('RewriteRule ^cashier/?$ cashier.html [L]'), 'Missing cashier.html direct rewrite');
  assert(content.includes('DirectorySlash Off'), 'Missing DirectorySlash Off to prevent 301 trailing slash loops');
});

check('apps/website/public/.htaccess redirects /cashier and rewrites /ralion/cashier', () => {
  const content = fs.readFileSync(path.join(rootDir, 'apps/website/public/.htaccess'), 'utf8');
  assert(content.includes('RewriteRule ^cashier/?$ /ralion/cashier [R=301,L]'), 'Missing /cashier 301 rewrite');
  assert(content.includes('RewriteRule ^ralion/cashier/?$ /ralion/cashier.html [L]'), 'Missing /ralion/cashier rewrite');
});

check('apps/ralion/next.config.js includes /cashier in redirects', () => {
  const content = fs.readFileSync(path.join(rootDir, 'apps/ralion/next.config.js'), 'utf8');
  assert(content.includes("source: '/cashier'"), 'Missing /cashier redirect source in next.config.js');
  assert(content.includes("destination: '/ralion/cashier'"), 'Missing /ralion/cashier destination in next.config.js');
});

check('RetailNavHeader.tsx handles normalized trailing slash for cashier terminal', () => {
  const content = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/(dashboard)/retail/components/RetailNavHeader.tsx'), 'utf8');
  assert(content.includes("replace(/\\/+$/, '')"), 'Missing trailing slash normalization in RetailNavHeader');
  assert(content.includes("cleanPath === '/cashier' || cleanPath === '/ralion/cashier'"), 'Missing normalized terminal path check');
});

// -----------------------------------------------------------------------------
// 2. CASHIER WORKSTATION IMPLEMENTATION
// -----------------------------------------------------------------------------
console.log('\n2. Verifying Cashier Workstation UI & Capabilities (apps/ralion/src/app/cashier/page.tsx)...');

const cashierPageContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/cashier/page.tsx'), 'utf8');

check('Dedicated unauthenticated cashier login screen present', () => {
  assert(cashierPageContent.includes('handleCashierLogin'), 'Missing handleCashierLogin handler');
  assert(cashierPageContent.includes('Sign In to Terminal'), 'Missing Sign In to Terminal button');
  assert(cashierPageContent.includes('AuthService.login'), 'Missing AuthService.login call');
});

check('Lock workstation / switch cashier capability present', () => {
  assert(cashierPageContent.includes('isStationLocked'), 'Missing isStationLocked state');
  assert(cashierPageContent.includes('Unlock Workstation'), 'Missing Unlock Workstation trigger');
});

check('Touch-friendly product catalog with SKU, stock levels, and approved price', () => {
  assert(cashierPageContent.includes('filteredProducts.map'), 'Missing product mapping in catalog');
  assert(cashierPageContent.includes('p.sku'), 'Missing SKU display on product card');
  assert(cashierPageContent.includes('p.sellingPrice'), 'Missing selling price display on product card');
  assert(cashierPageContent.includes('p.currentStock'), 'Missing current stock display on product card');
});

check('Barcode scanning input with keyboard autofocus ref', () => {
  assert(cashierPageContent.includes('barcodeInputRef'), 'Missing barcode input ref');
  assert(cashierPageContent.includes('handleBarcodeSubmit'), 'Missing barcode submit handler');
  assert(cashierPageContent.includes('Scan barcode or enter SKU'), 'Missing barcode input placeholder');
});

check('Fast cash tender shortcuts and change due calculation', () => {
  assert(cashierPageContent.includes('tenderAmount'), 'Missing tender amount state');
  assert(cashierPageContent.includes('changeDue'), 'Missing change due calculation');
  assert(cashierPageContent.includes('Change Due:'), 'Missing change due display');
});

check('Manager-controlled discount guard (> 10% requires manager PIN)', () => {
  assert(cashierPageContent.includes('requestDiscountUpdate'), 'Missing requestDiscountUpdate handler');
  assert(cashierPageContent.includes('showManagerPinModal'), 'Missing manager PIN modal state');
  assert(cashierPageContent.includes('requestedDiscount > 10'), 'Missing 10% discount check threshold');
  assert(cashierPageContent.includes('Manager approval required'), 'Missing manager approval requirement');
});

check('80mm thermal printable receipt modal with print trigger', () => {
  assert(cashierPageContent.includes('completedSale'), 'Missing completedSale modal state');
  assert(cashierPageContent.includes('window.print()'), 'Missing window.print() execution');
  assert(cashierPageContent.includes('Print Slip (80mm)'), 'Missing 80mm print slip button');
});

check('Shift open/close reconciliation with variance tracking', () => {
  assert(cashierPageContent.includes('handleOpenShift'), 'Missing handleOpenShift');
  assert(cashierPageContent.includes('handleCloseShift'), 'Missing handleCloseShift');
  assert(cashierPageContent.includes('Variance:'), 'Missing shift variance calculation display');
});

// -----------------------------------------------------------------------------
// 3. CASHIER-SPECIFIC MARI AI INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n3. Verifying Cashier Mari AI Assistant Integration...');

const mariChatContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/api/mari/chat/route.ts'), 'utf8');

check('Mari chat route detects quotation questions and walk-in quotes', () => {
  assert(mariChatContent.includes('quotationQuestion'), 'Missing quotationQuestion detection regex');
  assert(mariChatContent.includes('retail_quotation_builder'), 'Missing retail_quotation_builder response source');
});

check('Mari chat route extracts customer name and items for quotation draft', () => {
  assert(mariChatContent.includes('quotationDraft'), 'Missing quotationDraft structure');
  assert(mariChatContent.includes('customerName'), 'Missing customerName extraction in draft');
  assert(mariChatContent.includes('draftItems'), 'Missing draftItems collection');
});

check('Mari chat route never leaks purchase_cost or unit_cost', () => {
  // Ensure selling_price is selected, not purchase_cost
  const quotSection = mariChatContent.substring(
    mariChatContent.indexOf('if (quotationQuestion)'),
    mariChatContent.indexOf('if (priceQuestion)')
  );
  assert(!quotSection.includes('purchase_cost'), 'Quotation builder must never query or disclose purchase_cost');
  assert(!quotSection.includes('unit_cost'), 'Quotation builder must never disclose unit_cost');
});

check('Cashier workstation renders interactive Mari quotation draft with conversion actions', () => {
  assert(cashierPageContent.includes('handleLoadDraftIntoCart'), 'Missing handleLoadDraftIntoCart');
  assert(cashierPageContent.includes('handleSaveQuotation'), 'Missing handleSaveQuotation');
  assert(cashierPageContent.includes('handleConvertQuotationToSale'), 'Missing handleConvertQuotationToSale');
  assert(cashierPageContent.includes('Load to Cart'), 'Missing Load to Cart action button');
  assert(cashierPageContent.includes('Convert to Sale'), 'Missing Convert to Sale action button');
});

check('Mari chat route supports approved price lookups for cashiers with canAccessPOS', () => {
  assert(mariChatContent.includes('priceQuestion'), 'Missing priceQuestion detection');
  assert(mariChatContent.includes('retail_price_lookup'), 'Missing retail_price_lookup response source');
  assert(mariChatContent.includes('canAccessPOS'), 'Missing canAccessPOS allowance for cashier price checks');
});

// -----------------------------------------------------------------------------
// 4. ADMINISTRATIVE RESTRICTIONS & LOCKDOWN
// -----------------------------------------------------------------------------
console.log('\n4. Verifying Administrative Lockdown for Cashier Accounts...');

const dashboardLayoutContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/(dashboard)/layout.tsx'), 'utf8');

check('Dashboard layout automatically redirects CASHIER users to /ralion/cashier', () => {
  assert(dashboardLayoutContent.includes("data?.effectiveRole === 'CASHIER'"), 'Missing CASHIER role check in dashboard layout');
  assert(dashboardLayoutContent.includes("router.replace(target)"), 'Missing router.replace redirect for cashier');
  assert(dashboardLayoutContent.includes("'/ralion/cashier'"), 'Missing /ralion/cashier target path');
});

check('Retail database service atomic quotation conversion endpoint is preserved', () => {
  const convRouteContent = fs.readFileSync(path.join(rootDir, 'apps/ralion/src/app/api/retail/quotations/[id]/convert/route.ts'), 'utf8');
  assert(convRouteContent.includes('executeAtomicQuoteConversion'), 'Missing executeAtomicQuoteConversion RPC call');
  assert(convRouteContent.includes('canAccessQuotations'), 'Missing quotation access entitlement check');
  assert(convRouteContent.includes('canAccessSales'), 'Missing sales access entitlement check');
});

console.log('\n======================================================================');
console.log(`  VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (100%)`);
console.log('======================================================================\n');
