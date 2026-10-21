/**
 * Ralion OS — Customer Navigation & Admin Command Centre Restructure
 * Automated Verification Suite (CommonJS)
 */

const fs = require('fs');
const path = require('path');

function cyan(text) { return `\x1b[36m${text}\x1b[0m`; }
function green(text) { return `\x1b[32m${text}\x1b[0m`; }
function red(text) { return `\x1b[31m${text}\x1b[0m`; }
function bold(text) { return `\x1b[1m${text}\x1b[0m`; }

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc, condition) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${green('✓')} ${desc}`);
  } else {
    failedChecks++;
    console.log(`  ${red('✗')} ${bold(desc)}`);
  }
}

async function runVerification() {
  console.log('\n' + '='.repeat(70));
  console.log(cyan('  RALION OS — CUSTOMER NAVIGATION & ADMIN RESTRUCTURE SUITE'));
  console.log(cyan('  Clean Workspace • Entitlement Isolation • 8 Admin Sections'));
  console.log('='.repeat(70) + '\n');

  const rootDir = path.resolve(__dirname, '..');
  const sidebarFile = path.join(rootDir, 'packages/ui/src/Sidebar.tsx');
  const dashboardLayoutFile = path.join(rootDir, 'apps/ralion/src/app/(dashboard)/layout.tsx');
  const adminPageFile = path.join(rootDir, 'apps/admin/src/app/admin/page.tsx');
  const tradePageFile = path.join(rootDir, 'apps/ralion/src/app/(dashboard)/industry/trade/page.tsx');
  const redeemPageFile = path.join(rootDir, 'apps/ralion/src/app/redeem/page.tsx');

  // =========================================================================
  // 1. Customer Workspace Sidebar Restructuring (Sidebar.tsx)
  // =========================================================================
  console.log('1. Verifying Customer Workspace Sidebar Structure (Sidebar.tsx)...');
  check('Sidebar.tsx exists in packages/ui/src', fs.existsSync(sidebarFile));
  const sidebarCode = fs.readFileSync(sidebarFile, 'utf8');

  // Main Workspace
  check('Main Workspace contains Overview (/ralion/dashboard)', sidebarCode.includes("id: 'dashboard'") && sidebarCode.includes("label: 'Overview'"));
  check('Main Workspace contains Mari AI (/ralion/mari-ai)', sidebarCode.includes("id: 'mari-ai'") && sidebarCode.includes("label: 'Mari AI'"));
  check('Main Workspace contains Customers & CRM (/ralion/crm)', sidebarCode.includes("id: 'crm'") && sidebarCode.includes("label: 'Customers & CRM'"));
  check('Main Workspace contains Growth (/ralion/growth)', sidebarCode.includes("id: 'growth'") && sidebarCode.includes("label: 'Growth'"));
  check('Main Workspace contains Social (/ralion/growth?tab=ACCOUNTS)', sidebarCode.includes("id: 'social'") && sidebarCode.includes("label: 'Social'"));

  // Clean Labels (No "OS" suffix)
  check('Retail label is clean "Retail" (not "Ralion Retail OS")', sidebarCode.includes("label: 'Retail'") && !sidebarCode.includes("label: 'Ralion Retail OS'"));
  check('Trade label is clean "Trade" (not "Ralion Trade OS")', sidebarCode.includes("label: 'Trade'") && !sidebarCode.includes("label: 'Ralion Trade OS'"));

  // Entitlement-based business modules
  check('Business modules check hasRetailEntitlement and hasTradeEntitlement', sidebarCode.includes('hasRetailEntitlement') && sidebarCode.includes('hasTradeEntitlement'));
  check('Business modules section only renders when businessModulesNav.length > 0', sidebarCode.includes('businessModulesNav.length > 0'));

  // Development roadmap clutter completely removed from customer sidebar
  check('Roadmap clutter Healthcare OS (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Healthcare OS'));
  check('Roadmap clutter Funeral Services OS (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Funeral Services OS'));
  check('Roadmap clutter Logistics & Fleet OS (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Logistics & Fleet OS'));
  check('Roadmap clutter Government Edition (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Government Edition'));
  check('Roadmap clutter Marketplace & AI (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Marketplace & AI'));
  check('Roadmap clutter Solutions Hub (Coming Soon) removed from customer sidebar', !sidebarCode.includes('Solutions Hub'));
  check('Developer Platform removed from customer sidebar (managed in Admin)', !sidebarCode.includes("label: 'Developer Platform'"));

  // Operations and Account & Settings
  check('Preserves operational tools (Workflows, Calendar, Tasks, Documents, Reports & BI)',
    sidebarCode.includes("id: 'workflows'") &&
    sidebarCode.includes("id: 'calendar'") &&
    sidebarCode.includes("id: 'tasks'") &&
    sidebarCode.includes("id: 'documents'") &&
    sidebarCode.includes("id: 'reports'")
  );
  check('Operations section is collapsible', sidebarCode.includes('isOperationsOpen') && sidebarCode.includes('setIsOperationsOpen'));
  check('Account & Settings contains Settings & Integrations and Billing & Plan',
    sidebarCode.includes("label: 'Settings & Integrations'") &&
    sidebarCode.includes("label: 'Billing & Plan'")
  );

  // Platform Admin Command Centre isolation in customer sidebar
  check('Admin Command Centre trigger strictly guarded by isPlatformAdmin or PLATFORM_ADMIN',
    sidebarCode.includes("(isPlatformAdmin || userTier === 'PLATFORM_ADMIN')") &&
    sidebarCode.includes('Admin Command Centre')
  );

  // Future White-Label compatibility
  check('SidebarProps supports extensible branding (branding?: SidebarBranding)',
    sidebarCode.includes('branding?: SidebarBranding') &&
    sidebarCode.includes("branding?.brandName || 'Ralion OS'")
  );

  // =========================================================================
  // 2. Customer Dashboard Layout Binding (layout.tsx)
  // =========================================================================
  console.log('\n2. Verifying Customer Dashboard Layout Binding (layout.tsx)...');
  check('Dashboard layout exists in apps/ralion', fs.existsSync(dashboardLayoutFile));
  const layoutCode = fs.readFileSync(dashboardLayoutFile, 'utf8');

  check('Layout computes hasTradeEntitlement dynamically', layoutCode.includes('hasTradeEntitlement'));
  check('Layout computes hasRetailEntitlement dynamically', layoutCode.includes('hasRetailEntitlement'));
  check('Layout passes hasTradeEntitlement to desktop Sidebar', layoutCode.includes('hasTradeEntitlement={hasTradeEntitlement}'));
  check('Layout passes entitledModules and branding to Sidebar', layoutCode.includes('entitledModules={enabledModules}') && layoutCode.includes('branding={orgBranding}'));

  // =========================================================================
  // 3. Module Heading & Terminology Cleanliness
  // =========================================================================
  console.log('\n3. Verifying Consistent Module Terminology (No redundant "OS" labels)...');
  check('Trade page exists', fs.existsSync(tradePageFile));
  const tradeCode = fs.readFileSync(tradePageFile, 'utf8');
  check('Trade page heading displays clean "Trade" (not "Ralion Trade OS")', tradeCode.includes('<h1 className="text-2xl font-black">Trade</h1>'));

  check('Redeem page exists', fs.existsSync(redeemPageFile));
  const redeemCode = fs.readFileSync(redeemPageFile, 'utf8');
  check('Redeem page references "Retail and Trade" trial entitlements', redeemCode.includes('unlock Retail and Trade trial entitlements.'));

  // =========================================================================
  // 4. Preservation of Live Functional Routes
  // =========================================================================
  console.log('\n4. Verifying Zero Deleted Functionality (All functional routes intact)...');
  const requiredRoutes = [
    'apps/ralion/src/app/(dashboard)/dashboard/page.tsx',
    'apps/ralion/src/app/(dashboard)/mari-ai/page.tsx',
    'apps/ralion/src/app/(dashboard)/crm/page.tsx',
    'apps/ralion/src/app/(dashboard)/growth/page.tsx',
    'apps/ralion/src/app/(dashboard)/workflows/page.tsx',
    'apps/ralion/src/app/(dashboard)/calendar/page.tsx',
    'apps/ralion/src/app/(dashboard)/tasks/page.tsx',
    'apps/ralion/src/app/(dashboard)/documents/page.tsx',
    'apps/ralion/src/app/(dashboard)/reports/page.tsx',
    'apps/ralion/src/app/(dashboard)/settings/page.tsx',
    'apps/ralion/src/app/(dashboard)/billing/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/inventory/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/sales/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/pos/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/quotations/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/purchasing/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/expenses/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/payroll/page.tsx',
    'apps/ralion/src/app/(dashboard)/retail/reports/page.tsx',
    'apps/ralion/src/app/(dashboard)/industry/trade/page.tsx',
  ];

  for (const relRoute of requiredRoutes) {
    const fullPath = path.join(rootDir, relRoute);
    check(`Functional route preserved: ${relRoute}`, fs.existsSync(fullPath));
  }

  // =========================================================================
  // 5. Admin Command Centre 8 Core Sections Restructuring (apps/admin)
  // =========================================================================
  console.log('\n5. Verifying Admin Command Centre Structure in apps/admin (8 Core Sections)...');
  check('Admin Command Centre page exists in apps/admin', fs.existsSync(adminPageFile));
  const adminCode = fs.readFileSync(adminPageFile, 'utf8');

  // Verify all 8 official sections exist in navigation
  check('Section A exists: Platform Overview (id: overview)', adminCode.includes("id: 'overview'") && adminCode.includes("label: 'Platform Overview'"));
  check('Section B exists: Customers & Organizations (id: customers)', adminCode.includes("id: 'customers'") && adminCode.includes("label: 'Customers & Organizations'"));
  check('Section C exists: Products & Modules (id: products)', adminCode.includes("id: 'products'") && adminCode.includes("label: 'Products & Modules'"));
  check('Section D exists: Trials & Licensing (id: trials)', adminCode.includes("id: 'trials'") && adminCode.includes("label: 'Trials & Licensing'"));
  check('Section E exists: Integrations & Developer Services (id: integrations)', adminCode.includes("id: 'integrations'") && adminCode.includes("label: 'Integrations & Developers'"));
  check('Section F exists: Billing & Revenue (id: billing)', adminCode.includes("id: 'billing'") && adminCode.includes("label: 'Billing & Revenue'"));
  check('Section G exists: White-label & Partners (id: partners)', adminCode.includes("id: 'partners'") && adminCode.includes("label: 'White-label & Partners'"));
  check('Section H exists: Security & System Monitoring (id: security)', adminCode.includes("id: 'security'") && adminCode.includes("label: 'Security & System'"));

  // Verify authoritative product lifecycle catalog
  check('Products catalog includes Ralion Core with Live status', adminCode.includes("name: 'Ralion Core'") && adminCode.includes("status: 'Live'"));
  check('Products catalog includes Mari AI with Live status', adminCode.includes("name: 'Mari AI'") && adminCode.includes("status: 'Live'"));
  check('Products catalog includes Growth with Live status', adminCode.includes("name: 'Growth'") && adminCode.includes("status: 'Live'"));
  check('Products catalog includes Social with Live status', adminCode.includes("name: 'Social'") && adminCode.includes("status: 'Live'"));
  check('Products catalog includes Developer Platform with Live status', adminCode.includes("name: 'Developer Platform'") && adminCode.includes("status: 'Live'"));
  check('Products catalog includes Retail with Pilot status', adminCode.includes("name: 'Retail'") && adminCode.includes("status: 'Pilot'"));
  check('Products catalog includes Trade with Pilot status', adminCode.includes("name: 'Trade'") && adminCode.includes("status: 'Pilot'"));
  check('Products catalog includes Healthcare with Development status', adminCode.includes("name: 'Healthcare'") && adminCode.includes("status: 'Development'"));
  check('Products catalog includes Funeral Services with Development status', adminCode.includes("name: 'Funeral Services'") && adminCode.includes("status: 'Development'"));
  check('Products catalog includes Logistics with Development status', adminCode.includes("name: 'Logistics & Fleet'") && adminCode.includes("status: 'Development'"));
  check('Products catalog includes Marketplace with Development status', adminCode.includes("name: 'Marketplace & Solutions'") && adminCode.includes("status: 'Development'"));
  check('Products catalog includes Government Edition with Planned status', adminCode.includes("name: 'Government Edition'") && adminCode.includes("status: 'Planned'"));

  // Verify Retail Pilot Command Centre controls
  check('Admin Retail controls include Activate, Suspend, Revoke entitlement buttons',
    adminCode.includes("updateRetailEntitlement('ACTIVE')") &&
    adminCode.includes("updateRetailEntitlement('SUSPENDED')") &&
    adminCode.includes("updateRetailEntitlement('EXPIRED')")
  );
  check('Admin Retail controls include Open Retail Workspace support session', adminCode.includes('openRetailWorkspace'));
  check('Admin Retail controls include Open Preview session', adminCode.includes("openProductPreview('retail')"));
  check('Admin Retail includes Proinsight Confidentiality Guard', adminCode.includes('Confidentiality Guard:'));

  // Verify Trade Preview launcher
  check('Admin Trade controls include Open Preview (Trade) session', adminCode.includes("openProductPreview('trade')"));

  // Verify Trials & Licensing controls
  check('Trials section includes Generate Demo Access Code modal with multi-product selector',
    adminCode.includes('Generate Demo Access Code') &&
    adminCode.includes("eligibleProducts.includes('retail')") &&
    adminCode.includes("eligibleProducts.includes('trade')")
  );
  check('Trials section includes Extend, Revoke and Convert actions',
    adminCode.includes('extendTrial') &&
    adminCode.includes('revokeTrial') &&
    adminCode.includes('convertTrialToCommercial')
  );

  // Verify Security & Tenant Isolation
  check('Audit trail table enforces mandatory justification reasons', adminCode.includes('Audit Justification Reason'));
  check('Credit adjustment requires min 5 character justification reason', adminCode.includes('creditAdjustmentReason.trim().length < 5'));
  check('Tenant inspection requires min 5 character justification reason', adminCode.includes('inspectionReason.trim().length < 5'));
  check('Tenant isolation diagnostics verify zero cross-tenant leaks', adminCode.includes('PASS • ZERO LEAKS'));

  // Verify White-label & Partners future architecture
  check('White-label & Partners framework clearly communicates Architecture Prepared / Future Scope',
    adminCode.includes('Architecture Prepared • Future Scope') &&
    adminCode.includes('Brand Configuration') &&
    adminCode.includes('Custom Domains') &&
    adminCode.includes('Reseller Organizations') &&
    adminCode.includes('Partner Licensing')
  );

  // =========================================================================
  // Final Summary
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log(cyan('  VERIFICATION SUMMARY'));
  console.log('='.repeat(70));
  console.log(`  Total Checks: ${totalChecks}`);
  console.log(`  Passed: ${green(passedChecks.toString())}`);
  console.log(`  Failed: ${failedChecks > 0 ? red(failedChecks.toString()) : '0'}`);

  if (failedChecks === 0) {
    console.log('\n' + green('  ALL NAVIGATION & ADMIN COMMAND CENTRE RESTRUCTURING SPECIFICATIONS VERIFIED! ✨\n'));
    process.exit(0);
  } else {
    console.log('\n' + red('  SOME CHECKS FAILED! Please review the failures above.\n'));
    process.exit(1);
  }
}

runVerification();
