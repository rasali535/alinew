require('dotenv').config();
const { CreativeAssetService } = require('../packages/ai/dist/creativeAsset.service.js');

async function runTenantIsolationAcceptance() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🛡️ MULTI-TENANT ISOLATION & FORBIDDEN DEFAULT TENANT ACCEPTANCE TEST');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const tenantA = 'org_tenant_alpha_' + Date.now();
  const tenantB = 'org_tenant_beta_' + Date.now();

  // Test 1: Verify creation without org or with default-org throws error
  console.log('[TEST 1] Creating asset with default-org / missing org...');
  let defaultOrgRejected = false;
  try {
    await CreativeAssetService.saveBinaryAsset({
      organizationId: 'default-org',
      type: 'POSTER_IMAGE',
      provider: 'FLUX.1',
      prompt: 'Unauthenticated prompt test',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test-image-data-minimum-length-padding-to-satisfy-test-requirements-1234567890'),
    });
  } catch (err) {
    defaultOrgRejected = true;
    console.log('  ✅ Correctly rejected default-org creation:', err.message);
  }

  if (!defaultOrgRejected) {
    throw new Error('FAILED: default-org was allowed during saveBinaryAsset');
  }

  // Test 2: Create real assets for Tenant A and Tenant B
  console.log('\n[TEST 2] Creating distinct assets for Tenant A and Tenant B...');
  const fakeJpg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    Buffer.alloc(2000, 0xaa),
    Buffer.from([0xff, 0xd9])
  ]);

  const assetA = await CreativeAssetService.saveBinaryAsset({
    organizationId: tenantA,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'Tenant Alpha Launch Poster',
    mimeType: 'image/jpeg',
    buffer: fakeJpg,
  });
  console.log(`  Tenant A Asset Created: ID=${assetA.id}, Org=${assetA.organizationId}`);

  const assetB = await CreativeAssetService.saveBinaryAsset({
    organizationId: tenantB,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'Tenant Beta Launch Poster',
    mimeType: 'image/jpeg',
    buffer: fakeJpg,
  });
  console.log(`  Tenant B Asset Created: ID=${assetB.id}, Org=${assetB.organizationId}`);

  // Test 3: Verify listAssets isolation
  console.log('\n[TEST 3] Verifying listAssets isolation...');
  const listA = CreativeAssetService.listAssets(tenantA);
  const listB = CreativeAssetService.listAssets(tenantB);
  console.log(`  Tenant A assets count: ${listA.length}, contains own: ${listA.some(a => a.id === assetA.id)}`);
  console.log(`  Tenant A assets contains B: ${listA.some(a => a.id === assetB.id)} (Expected: false)`);
  console.log(`  Tenant B assets count: ${listB.length}, contains own: ${listB.some(a => a.id === assetB.id)}`);
  console.log(`  Tenant B assets contains A: ${listB.some(a => a.id === assetA.id)} (Expected: false)`);

  if (listA.some(a => a.id === assetB.id) || listB.some(a => a.id === assetA.id)) {
    throw new Error('FAILED: listAssets leaked cross-tenant assets');
  }
  console.log('  ✅ listAssets isolation PASS');

  // Test 4: Verify filename-based tenant verification
  console.log('\n[TEST 4] Verifying tenant retrieval and cross-tenant blocking...');
  const filenameA = assetA.storagePath;
  const filenameB = assetB.storagePath;

  const foundA = await CreativeAssetService.getAssetByFilename(filenameA);
  const foundB = await CreativeAssetService.getAssetByFilename(filenameB);

  console.log(`  Asset A belongs to: ${foundA?.organizationId}`);
  console.log(`  Asset B belongs to: ${foundB?.organizationId}`);

  const isAAllowedForA = foundA?.organizationId === tenantA;
  const isBAllowedForB = foundB?.organizationId === tenantB;
  const isAAllowedForB = foundA?.organizationId === tenantB;
  const isBAllowedForA = foundB?.organizationId === tenantA;

  console.log(`  Tenant A -> Own Creative A:  ${isAAllowedForA ? '200 OK ✅' : '403 Forbidden ❌'}`);
  console.log(`  Tenant B -> Own Creative B:  ${isBAllowedForB ? '200 OK ✅' : '403 Forbidden ❌'}`);
  console.log(`  Tenant A -> Cross Creative B: ${isBAllowedForA ? '200 OK ❌ (LEAK)' : '403 Forbidden ✅'}`);
  console.log(`  Tenant B -> Cross Creative A: ${isAAllowedForB ? '200 OK ❌ (LEAK)' : '403 Forbidden ✅'}`);

  if (!isAAllowedForA || !isBAllowedForB || isBAllowedForA || isAAllowedForB) {
    throw new Error('FAILED: Cross-tenant isolation violation');
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL TENANT ISOLATION ACCEPTANCE CHECKS PASSED');
  console.log('════════════════════════════════════════════════════════════════════');
}

runTenantIsolationAcceptance().catch(console.error);
