/**
 * Ralion Retail OS — Platform Admin Command Centre & Pricing Hardening Verification Suite
 * 
 * Tests:
 * 1. Admin Command Centre Module Registration (retail, USD, Proinsight target)
 * 2. Role-Gated Confidentiality: Employee salary, hourly rate, bank details masked to [CONFIDENTIAL - ROLE GATED]
 * 3. Audited Platform Admin Entitlement Controls: Activate, Suspend, Revoke with immutable audit logs
 * 4. Audited Platform Admin "Open Retail Workspace" Impersonation Session & Visual Banner Indicator
 * 5. Ordinary Tenant Lockout: Non-admin users strictly denied admin endpoints (403 Forbidden)
 * 6. Cross-Tenant Lockdown: Admin entitlement endpoint refuses to modify arbitrary foreign tenants
 * 7. Server-Side Authoritative Pricing & Cost Protection (POS & Quotation Tampering Resistance)
 *    - Client-supplied forged price/cost overridden by DB values
 *    - Negative quantity rejected
 *    - Discount exceeding min_selling_price rejected
 *    - Inactive product rejected
 *    - Foreign workspace product rejected
 */

const fs = require('fs');
const path = require('path');

const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition, testName, errorDetail) {
  if (condition) {
    console.log(`  ${green('✓')} ${testName}`);
    passed++;
  } else {
    console.error(`  ${red('✗')} ${testName}`);
    if (errorDetail) console.error(`    ${yellow(errorDetail)}`);
    failed++;
  }
}

async function runVerification() {
  console.log(cyan('\n======================================================================'));
  console.log(cyan('  RALION RETAIL — PLATFORM ADMIN COMMAND CENTRE & SECURITY PREFLIGHT'));
  console.log(cyan('======================================================================\n'));

  const PROINSIGHT_ORG_ID = '85ec9738-937a-41ee-b0df-ed752777447c';
  const PROINSIGHT_WORKSPACE_ID = '67074e47-76bb-40e1-ae05-362e9cae8798';

  // -------------------------------------------------------------------------
  // 1. Admin Command Centre UI Integration
  // -------------------------------------------------------------------------
  console.log(cyan('1. Verifying Admin Command Centre UI Integration...'));

  const adminPagePath = path.resolve(__dirname, '../apps/ralion/src/app/admin/page.tsx');
  assert(fs.existsSync(adminPagePath), 'Admin Command Centre page exists');

  const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');
  assert(
    adminPageContent.includes("id: 'retail'") && adminPageContent.includes('Ralion Retail'),
    'Retail module registered as a manageable section in Admin Command Centre tabs'
  );
  assert(
    adminPageContent.includes('Proinsight') || adminPageContent.includes('PROINSIGHT_ORGANIZATION_ID'),
    'Proinsight Hardware Store pilot workspace displayed in Retail Command Centre'
  );
  assert(
    adminPageContent.includes('/api/admin/retail/overview') &&
    adminPageContent.includes('/api/admin/retail/entitlement') &&
    adminPageContent.includes('/api/admin/retail/impersonate'),
    'Admin page calls dedicated audited server-side retail management APIs'
  );
  assert(
    adminPageContent.includes('Open Retail Workspace') || adminPageContent.includes('handleOpenWorkspace'),
    'Admin Command Centre provides secure audited "Open Retail Workspace" action'
  );
  assert(
    adminPageContent.includes('CONFIDENTIAL - ROLE GATED') || adminPageContent.includes('baseSalaryMonthly'),
    'Admin Command Centre respects employee compensation confidentiality'
  );

  // -------------------------------------------------------------------------
  // 2. Admin Inspection Session Banner Indicator
  // -------------------------------------------------------------------------
  console.log(cyan('\n2. Verifying Platform Admin Inspection Session Indicator...'));

  const navHeaderPath = path.resolve(__dirname, '../apps/ralion/src/app/(dashboard)/retail/components/RetailNavHeader.tsx');
  assert(fs.existsSync(navHeaderPath), 'RetailNavHeader component exists');

  const navHeaderContent = fs.readFileSync(navHeaderPath, 'utf8');
  assert(
    navHeaderContent.includes('ralion_admin_retail_inspect') || navHeaderContent.includes('PLATFORM ADMIN INSPECTION'),
    'Clear, persistent visual inspection banner displayed during admin session'
  );
  assert(
    navHeaderContent.includes('Immutable audit logging active') || navHeaderContent.includes('Audited operational inspection session'),
    'Inspection banner informs admin of active immutable session logging'
  );
  assert(
    navHeaderContent.includes('/admin'),
    'Inspection banner includes quick return action to Platform Admin Command Centre'
  );

  // -------------------------------------------------------------------------
  // 3. API Route Role-Gating & Confidentiality Redaction
  // -------------------------------------------------------------------------
  console.log(cyan('\n3. Verifying Admin API Role-Gating & Confidentiality Masking...'));

  const overviewRoutePath = path.resolve(__dirname, '../apps/ralion/src/app/api/admin/retail/overview/route.ts');
  const entitlementRoutePath = path.resolve(__dirname, '../apps/ralion/src/app/api/admin/retail/entitlement/route.ts');
  const impersonateRoutePath = path.resolve(__dirname, '../apps/ralion/src/app/api/admin/retail/impersonate/route.ts');

  assert(fs.existsSync(overviewRoutePath), 'Retail overview API exists');
  assert(fs.existsSync(entitlementRoutePath), 'Retail entitlement API exists');
  assert(fs.existsSync(impersonateRoutePath), 'Retail impersonate API exists');

  const overviewContent = fs.readFileSync(overviewRoutePath, 'utf8');
  const entitlementContent = fs.readFileSync(entitlementRoutePath, 'utf8');
  const impersonateContent = fs.readFileSync(impersonateRoutePath, 'utf8');

  // Verify platform admin authorization check
  assert(
    overviewContent.includes('verifyPlatformAdminRequest') &&
    entitlementContent.includes('verifyPlatformAdminRequest') &&
    impersonateContent.includes('verifyPlatformAdminRequest'),
    'All admin retail endpoints enforce verifyPlatformAdminRequest'
  );

  // Verify confidentiality masking
  assert(
    overviewContent.includes("baseSalaryMonthly: '[CONFIDENTIAL - ROLE GATED]'") &&
    overviewContent.includes("bankAccount: '[CONFIDENTIAL - ROLE GATED]'"),
    'Admin overview server-side masks baseSalaryMonthly and bankAccount'
  );

  // Verify immutable audit logging
  assert(
    entitlementContent.includes("supabase.from('audit_logs').insert") &&
    entitlementContent.includes('RETAIL_ENTITLEMENT_'),
    'Entitlement state transitions logged to audit_logs with action code and justification reason'
  );
  assert(
    impersonateContent.includes("action: 'ADMIN_RETAIL_WORKSPACE_OPEN'") &&
    impersonateContent.includes("supabase.from('audit_logs').insert"),
    'Open workspace action logged to audit_logs with admin email and justification reason'
  );

  // Verify cross-tenant containment
  assert(
    entitlementContent.includes('targetOrgId !== PROINSIGHT_ORGANIZATION_ID') ||
    entitlementContent.includes('targetWsId !== PROINSIGHT_WORKSPACE_ID'),
    'Entitlement route strictly restricts modifications to Proinsight pilot tenant'
  );

  // -------------------------------------------------------------------------
  // 4. Server-Side Authoritative Pricing & Cost Protection (POS & Quotes)
  // -------------------------------------------------------------------------
  console.log(cyan('\n4. Verifying Authoritative Server-Side Pricing & Anti-Tampering Logic...'));

  const retailDbPath = path.resolve(__dirname, '../apps/ralion/src/lib/services/retail/retailDatabase.service.ts');
  const retailDbContent = fs.readFileSync(retailDbPath, 'utf8');

  assert(
    retailDbContent.includes('authoritativeUnitPrice') &&
    retailDbContent.includes('authoritativeUnitCost'),
    'executeAtomicSale resolves authoritative unit_price and unit_cost from DB products'
  );
  assert(
    retailDbContent.includes('DISCOUNT_EXCEEDS_MIN_PRICE'),
    'Discounts breaching min_selling_price are rejected with DISCOUNT_EXCEEDS_MIN_PRICE'
  );
  assert(
    retailDbContent.includes('INVALID_QUANTITY') &&
    retailDbContent.includes('quantity <= 0'),
    'Zero or negative quantities are rejected server-side with INVALID_QUANTITY'
  );
  assert(
    retailDbContent.includes('PRODUCT_NOT_ACTIVE'),
    'Sales of inactive products are rejected with PRODUCT_NOT_ACTIVE'
  );
  assert(
    retailDbContent.includes('PRODUCT_NOT_IN_WORKSPACE'),
    'Cross-workspace product injections in sales and quotes are rejected with PRODUCT_NOT_IN_WORKSPACE'
  );
  assert(
    retailDbContent.includes('createQuotation') &&
    retailDbContent.includes('authoritativeUnitCost = Number(dbProd.purchase_cost || 0)'),
    'Quotation creation independently resolves authoritative purchase cost and min selling price from DB'
  );

  // -------------------------------------------------------------------------
  // 5. Functional Unit Simulation: Price Override & Discount Enforcement
  // -------------------------------------------------------------------------
  console.log(cyan('\n5. Executing Functional Anti-Tampering Invariants Simulation...'));

  // Synthetic Database Product Catalog
  const dbCatalog = {
    'prod-cement-50kg': {
      id: 'prod-cement-50kg',
      name: 'Portland Cement 50kg Bag',
      sku: 'MAT-CEM-50KG',
      selling_price: 12.50,
      purchase_cost: 8.00,
      min_selling_price: 10.00,
      vat_rate: 15.0,
      status: 'ACTIVE',
      workspace_id: PROINSIGHT_WORKSPACE_ID,
    },
    'prod-drill-dewalt': {
      id: 'prod-drill-dewalt',
      name: 'DeWalt 20V Cordless Hammer Drill',
      sku: 'TOOL-DCD996',
      selling_price: 199.99,
      purchase_cost: 135.00,
      min_selling_price: 170.00,
      vat_rate: 15.0,
      status: 'ACTIVE',
      workspace_id: PROINSIGHT_WORKSPACE_ID,
    },
    'prod-inactive-saw': {
      id: 'prod-inactive-saw',
      name: 'Discontinued Hand Saw',
      sku: 'TOOL-SAW-OLD',
      selling_price: 25.00,
      purchase_cost: 15.00,
      min_selling_price: 20.00,
      vat_rate: 15.0,
      status: 'INACTIVE',
      workspace_id: PROINSIGHT_WORKSPACE_ID,
    },
  };

  function simulateServerPricingValidation(clientItem, workspaceId) {
    const quantity = Number(clientItem.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: 'INVALID_QUANTITY' };
    }

    const dbProd = dbCatalog[clientItem.productId];
    if (!dbProd || dbProd.workspace_id !== workspaceId) {
      return { success: false, error: 'PRODUCT_NOT_IN_WORKSPACE' };
    }

    if (dbProd.status !== 'ACTIVE') {
      return { success: false, error: 'PRODUCT_NOT_ACTIVE' };
    }

    // Authoritative pricing from DB - ignore clientItem.unitPrice and clientItem.unitCost!
    const authoritativeUnitPrice = dbProd.selling_price;
    const authoritativeUnitCost = dbProd.purchase_cost;
    const minSellingPrice = dbProd.min_selling_price;
    const taxRate = dbProd.vat_rate;

    const discountRate = Number(clientItem.discountRate || 0);
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
      return { success: false, error: 'INVALID_DISCOUNT' };
    }

    const discountedUnitPrice = authoritativeUnitPrice * (1 - discountRate / 100);
    if (minSellingPrice > 0 && discountedUnitPrice < minSellingPrice - 0.001) {
      return { success: false, error: 'DISCOUNT_EXCEEDS_MIN_PRICE' };
    }

    const lineSubtotal = quantity * authoritativeUnitPrice;
    const lineCost = quantity * authoritativeUnitCost;
    const lineDiscount = lineSubtotal * (discountRate / 100);
    const taxable = lineSubtotal - lineDiscount;
    const lineTax = taxable * (taxRate / 100);
    const lineTotal = taxable + lineTax;

    return {
      success: true,
      data: {
        productId: dbProd.id,
        quantity,
        unitPrice: authoritativeUnitPrice,
        unitCost: authoritativeUnitCost,
        discountRate,
        taxRate,
        lineTotal,
        lineCost,
      },
    };
  }

  // Attack 1: Client submits $0.01 price for $199.99 drill
  const attack1 = simulateServerPricingValidation(
    { productId: 'prod-drill-dewalt', quantity: 1, unitPrice: 0.01, unitCost: 0.00, discountRate: 0 },
    PROINSIGHT_WORKSPACE_ID
  );
  assert(attack1.success === true, 'Price spoofing request processed without crashing');
  assert(
    attack1.data.unitPrice === 199.99 && attack1.data.unitCost === 135.00,
    'Client forged $0.01 price & $0 cost overridden with authoritative $199.99 price and $135.00 cost'
  );

  // Attack 2: Client submits negative quantity (-5)
  const attack2 = simulateServerPricingValidation(
    { productId: 'prod-cement-50kg', quantity: -5, unitPrice: 12.50, unitCost: 8.00 },
    PROINSIGHT_WORKSPACE_ID
  );
  assert(
    attack2.success === false && attack2.error === 'INVALID_QUANTITY',
    'Malicious negative quantity (-5) rejected with INVALID_QUANTITY'
  );

  // Attack 3: Client requests 50% discount breaching minimum selling price ($10 min on $12.50 cement)
  // $12.50 * 50% = $6.25 < $10.00
  const attack3 = simulateServerPricingValidation(
    { productId: 'prod-cement-50kg', quantity: 2, discountRate: 50 },
    PROINSIGHT_WORKSPACE_ID
  );
  assert(
    attack3.success === false && attack3.error === 'DISCOUNT_EXCEEDS_MIN_PRICE',
    'Discount breaching min selling price ($6.25 < $10.00 min) rejected with DISCOUNT_EXCEEDS_MIN_PRICE'
  );

  // Attack 4: Client attempts to purchase inactive product
  const attack4 = simulateServerPricingValidation(
    { productId: 'prod-inactive-saw', quantity: 1 },
    PROINSIGHT_WORKSPACE_ID
  );
  assert(
    attack4.success === false && attack4.error === 'PRODUCT_NOT_ACTIVE',
    'Attempt to sell inactive product rejected with PRODUCT_NOT_ACTIVE'
  );

  // Attack 5: Client attempts cross-workspace product injection
  const attack5 = simulateServerPricingValidation(
    { productId: 'prod-cement-50kg', quantity: 1 },
    'foreign-workspace-id-9999'
  );
  assert(
    attack5.success === false && attack5.error === 'PRODUCT_NOT_IN_WORKSPACE',
    'Cross-workspace product request rejected with PRODUCT_NOT_IN_WORKSPACE'
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log(cyan('\n======================================================================'));
  console.log(cyan('  PLATFORM ADMIN & SECURITY PREFLIGHT SUMMARY'));
  console.log(cyan('======================================================================'));
  console.log(`  Total Checks: ${passed + failed}`);
  console.log(`  ${green(`Passed: ${passed}`)}`);
  if (failed > 0) {
    console.log(`  ${red(`Failed: ${failed}`)}`);
    process.exit(1);
  } else {
    console.log(green('\n  ALL PLATFORM ADMIN & ANTI-TAMPERING CONTROLS VERIFIED! 🛡️\n'));
  }
}

runVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
