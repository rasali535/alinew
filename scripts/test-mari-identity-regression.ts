// =====================================================================
// Ralion OS — Mari Identity Invariant Regression Test
// Ras Ali Labs (Pty) Ltd
//
// Invariant:
// Company: Ras Ali Labs
// Flagship Product: Ralion OS
//
// Strict Guarantee:
// These identities must NEVER be reversed, swapped, or conflated.
// Non-Ras-Ali tenants must NEVER receive Ras Ali Labs or Ralion OS as company name.
// =====================================================================

import { BusinessIdentityResolver } from '../packages/ai/src/businessIdentityResolver';

async function runRegression() {
  console.log('--- STARTING MARI IDENTITY REGRESSION TEST ---');
  let failures = 0;

  // 1. Resolve by slug 'ras-ali-labs'
  const identityBySlug = BusinessIdentityResolver.resolveIdentity('ras-ali-labs');
  console.log('[Test 1] Testing resolution for slug "ras-ali-labs":');
  console.log(`  companyName: "${identityBySlug.companyName}"`);
  console.log(`  flagshipProduct: "${identityBySlug.flagshipProduct}"`);

  if (identityBySlug.companyName !== 'Ras Ali Labs') {
    console.error(`❌ FAIL: Expected companyName to be "Ras Ali Labs", got "${identityBySlug.companyName}"`);
    failures++;
  } else {
    console.log('  ✅ PASS: companyName === "Ras Ali Labs"');
  }

  if (identityBySlug.flagshipProduct !== 'Ralion OS') {
    console.error(`❌ FAIL: Expected flagshipProduct to be "Ralion OS", got "${identityBySlug.flagshipProduct}"`);
    failures++;
  } else {
    console.log('  ✅ PASS: flagshipProduct === "Ralion OS"');
  }

  // Regression check: Guarantee identities are not reversed
  if (identityBySlug.companyName === 'Ralion OS') {
    console.error('❌ CRITICAL REGRESSION: companyName was inverted to "Ralion OS"!');
    failures++;
  }
  if (identityBySlug.flagshipProduct === 'Ras Ali Labs') {
    console.error('❌ CRITICAL REGRESSION: flagshipProduct was inverted to "Ras Ali Labs"!');
    failures++;
  }

  // 2. Resolve by canonical UUID '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'
  const identityByUuid = BusinessIdentityResolver.resolveIdentity('22e61ff6-16fe-44c7-9d67-38e2a2e91ccf');
  console.log('\n[Test 2] Testing resolution for UUID "22e61ff6-16fe-44c7-9d67-38e2a2e91ccf":');
  console.log(`  companyName: "${identityByUuid.companyName}"`);
  console.log(`  flagshipProduct: "${identityByUuid.flagshipProduct}"`);

  if (identityByUuid.companyName !== 'Ras Ali Labs' || identityByUuid.flagshipProduct !== 'Ralion OS') {
    console.error('❌ FAIL: Canonical UUID did not resolve to Company: Ras Ali Labs / Flagship: Ralion OS');
    failures++;
  } else {
    console.log('  ✅ PASS: Canonical UUID matches exact authoritative identity.');
  }

  // 3. Multi-Tenant Isolation: Ensure other tenants NEVER get Ras Ali Labs / Ralion OS as company
  console.log('\n[Test 3] Testing tenant isolation (no identity leakage):');
  const pameltex = BusinessIdentityResolver.resolveIdentity('c0b39862-cf19-4882-a822-c7f3f493fec0');
  if (pameltex.companyName === 'Ras Ali Labs' || pameltex.companyName === 'Ralion OS') {
    console.error('❌ FAIL: Pameltex received Ras Ali Labs / Ralion OS identity!');
    failures++;
  } else {
    console.log(`  ✅ PASS: Pameltex companyName === "${pameltex.companyName}" (clean)`);
  }

  const unconfigured = BusinessIdentityResolver.resolveIdentity('tenant-unconfigured-xyz');
  if (unconfigured.companyName === 'Ras Ali Labs' || unconfigured.companyName === 'Ralion OS') {
    console.error('❌ FAIL: Unconfigured tenant received Ras Ali Labs / Ralion OS identity!');
    failures++;
  } else {
    console.log(`  ✅ PASS: Unconfigured tenant companyName === "${unconfigured.companyName || '(empty)'}" (clean)`);
  }

  console.log('\n---------------------------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL REGRESSION FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('✅ ALL MARI IDENTITY REGRESSION TESTS PASSED!');
    console.log('=====================================================================\n');
  }
}

runRegression().catch((err) => {
  console.error('Fatal error running regression:', err);
  process.exit(1);
});
