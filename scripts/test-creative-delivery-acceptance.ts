// =====================================================================
// Ralion OS — Isolated Creative Delivery Acceptance Test
// Enforces:
// 1. Mandatory guard rejecting production storage execution
// 2. MockIsolatedStorageProvider injection via setStorageProvider
// 3. Standards-compliant image buffer validation
// 4. Exact workspace-level isolation & durability
// 5. Zero mutation of live production storage
// =====================================================================

const isProdUrl = (url?: string) => Boolean(url && (url.includes('yidsfihagwttlmhfynmf') || url.includes('supabase.co')));
const testBucket = process.env.TEST_STORAGE_BUCKET || 'isolated-test-bucket';

if (process.env.TEST_ALLOW_STORAGE_MUTATIONS !== 'true') {
  console.log('[Test Guard] Running in SAFE ISOLATED MOCK MODE (zero live storage mutation).');
} else {
  if (!process.env.TEST_SUPABASE_URL || isProdUrl(process.env.TEST_SUPABASE_URL)) {
    console.error('FATAL TEST GUARD: TEST_SUPABASE_URL must be an isolated non-production instance.');
    process.exit(1);
  }
  if (!process.env.TEST_STORAGE_BUCKET || testBucket === 'creatives') {
    console.error('FATAL TEST GUARD: TEST_STORAGE_BUCKET must not equal "creatives".');
    process.exit(1);
  }
}

import './preload-server-only.cjs';
import { setStorageProvider } from '../packages/ai/src/storage/index';
import { MockIsolatedStorageProvider } from './mock-isolated-storage';
import { CreativeAssetService, validateImageBuffer } from '../packages/ai/src/creativeAsset.service';

// Inject isolated mock storage provider by default to guarantee zero live bucket mutation
const mockStorage = new MockIsolatedStorageProvider();
setStorageProvider(mockStorage);

/**
 * Creates a standards-compliant minimal JPEG image buffer padded with a standard COM segment (>1000 bytes).
 */
function createValidJpegBuffer(): Buffer {
  const commentLength = 1024;
  const commentHeader = Buffer.from([0xff, 0xfe, (commentLength >> 8) & 0xff, commentLength & 0xff]);
  const commentData = Buffer.alloc(commentLength - 2, 0x20); // standard space padding in JPEG comment
  const baseJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);

  // Insert COM segment right after SOI and APP0 (at index 20)
  const part1 = baseJpeg.subarray(0, 20);
  const part2 = baseJpeg.subarray(20);
  return Buffer.concat([part1, commentHeader, commentData, part2]);
}

async function run() {
  console.log('--- STARTING ISOLATED CREATIVE DELIVERY ACCEPTANCE TEST ---');
  let failures = 0;

  const orgA = 'org-alpha-111';
  const wsA1 = 'ws-alpha-main';
  const wsA2 = 'ws-alpha-secondary';
  const orgB = 'org-beta-222';
  const wsB1 = 'ws-beta-main';

  // 1. Create and Save an Image Asset in Org A / Workspace A1
  const testBuffer = createValidJpegBuffer();

  console.log('[Test 1] Saving asset with workspace-level isolation...');
  const asset = await CreativeAssetService.saveBinaryAsset({
    organizationId: orgA,
    workspaceId: wsA1,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'High quality product showcase graphic',
    title: 'Spring Promo Poster',
    mimeType: 'image/jpeg',
    buffer: testBuffer,
    metadata: {
      campaign: 'Spring Promo 2026',
    },
  });

  if (!asset.workspaceId || asset.workspaceId !== wsA1) {
    console.error('FAIL: Asset created without correct workspaceId:', asset.workspaceId);
    failures++;
  } else {
    console.log('PASS: Asset correctly namespaced with workspaceId:', asset.workspaceId);
  }

  // 2. Validate Standards-Compliant Image Buffer
  console.log('[Test 2] Validating standards-compliant image buffer & magic bytes...');
  const validation = validateImageBuffer(testBuffer);
  if (!validation.valid || validation.mimeType !== 'image/jpeg') {
    console.error('FAIL: Buffer validation rejected valid JPEG:', validation);
    failures++;
  } else {
    console.log('PASS: Image buffer correctly validated with format:', validation.format);
  }

  // 3. Generate Signed Delivery URL for authenticated owner
  console.log('[Test 3] Generating signed delivery URL for asset owner...');
  try {
    const delivery = await CreativeAssetService.createSignedDeliveryUrl({
      assetId: asset.id,
      organizationId: orgA,
      workspaceId: wsA1,
      expiresInSeconds: 900,
    });

    if (!delivery || !delivery.signedUrl || !delivery.expiresAt) {
      console.error('FAIL: Invalid delivery response:', delivery);
      failures++;
    } else {
      console.log('PASS: Signed delivery URL generated successfully:', {
        assetId: delivery.assetId,
        expiresAt: delivery.expiresAt,
        signedUrlPrefix: delivery.signedUrl.substring(0, 45) + '...',
      });
    }
  } catch (err: any) {
    console.error('FAIL: Failed to create signed delivery URL:', err.message);
    failures++;
  }

  // 4. Test Cross-Workspace Access Within Same Organization -> Must be Forbidden
  console.log('[Test 4] Testing cross-workspace access within same organization (Same Org, Different Workspace)...');
  try {
    const crossWsDelivery = await CreativeAssetService.createSignedDeliveryUrl({
      assetId: asset.id,
      organizationId: orgA,
      workspaceId: wsA2,
      expiresInSeconds: 900,
    });
    if (crossWsDelivery) {
      console.error('FAIL: Cross-workspace delivery URL generation should have returned null or 403!');
      failures++;
    } else {
      console.log('PASS: Cross-workspace delivery URL correctly denied (returned null).');
    }
  } catch (err: any) {
    console.log('PASS: Cross-workspace access was strictly rejected:', err.message);
  }

  // 5. Test Cross-Organization Access -> Must be Forbidden
  console.log('[Test 5] Testing cross-organization access...');
  try {
    const crossOrgDelivery = await CreativeAssetService.createSignedDeliveryUrl({
      assetId: asset.id,
      organizationId: orgB,
      workspaceId: wsB1,
      expiresInSeconds: 900,
    });
    if (crossOrgDelivery) {
      console.error('FAIL: Cross-org delivery URL generation should have returned null or 403!');
      failures++;
    } else {
      console.log('PASS: Cross-org delivery URL correctly denied (returned null).');
    }
  } catch (err: any) {
    console.log('PASS: Cross-org access was strictly rejected:', err.message);
  }

  // 6. Test Durability Across In-Memory Registry Wipes
  console.log('[Test 6] Testing durability across server restarts (clearing in-memory registry)...');
  CreativeAssetService.clearRegistryForTesting();

  const restoredAsset = await CreativeAssetService.getAssetAsync(asset.id, orgA, wsA1);

  if (!restoredAsset) {
    console.error('FAIL: Asset could not be restored from canonical storage after memory wipe');
    failures++;
  } else if (restoredAsset.workspaceId !== wsA1 || restoredAsset.organizationId !== orgA) {
    console.error('FAIL: Restored asset has mismatched tenant metadata:', restoredAsset);
    failures++;
  } else {
    console.log('PASS: Asset successfully restored from isolated storage metadata after server restart simulation.');
  }

  // 7. Test Delivery Generation on Restored Asset
  console.log('[Test 7] Generating delivery URL from cold restored asset...');
  try {
    const coldDelivery = await CreativeAssetService.createSignedDeliveryUrl({
      assetId: asset.id,
      organizationId: orgA,
      workspaceId: wsA1,
    });
    if (coldDelivery && coldDelivery.signedUrl) {
      console.log('PASS: Cold delivery URL successfully created from durable storage.');
    } else {
      console.error('FAIL: Cold delivery URL failed');
      failures++;
    }
  } catch (err: any) {
    console.error('FAIL: Error during cold delivery URL generation:', err.message);
    failures++;
  }

  console.log('----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL ISOLATED CREATIVE DELIVERY & ISOLATION ACCEPTANCE TESTS PASSED!');
  }
}

run().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
