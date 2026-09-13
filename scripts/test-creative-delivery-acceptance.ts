import dotenv from 'dotenv';
dotenv.config();

import { CreativeAssetService } from '../packages/ai/src/creativeAsset.service';

function createFakeJpegBuffer(size = 2048): Buffer {
  const buf = Buffer.alloc(size);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xe0;
  buf[4] = 0x00;
  buf[5] = 0x10;
  buf.write('JFIF', 6, 'ascii');
  return buf;
}

async function run() {
  console.log('--- STARTING CREATIVE DELIVERY ACCEPTANCE TEST ---');
  let failures = 0;

  const orgA = 'org-alpha-111';
  const wsA1 = 'ws-alpha-main';
  const wsA2 = 'ws-alpha-secondary';
  const orgB = 'org-beta-222';
  const wsB1 = 'ws-beta-main';

  // 1. Create and Save an Image Asset in Org A / Workspace A1
  const testBuffer = createFakeJpegBuffer(2048);
  const filename = `asset-1789311501730-ppm9o.jpg`;
  
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

  // 2. Generate Signed Delivery URL for authenticated owner
  console.log('[Test 2] Generating signed delivery URL for asset owner...');
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
    } else if (!delivery.signedUrl.includes('token=') && !delivery.signedUrl.includes('supabase.co')) {
      console.error('FAIL: Signed URL format unexpected:', delivery.signedUrl);
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

  // 3. Test Cross-Workspace Access Within Same Organization -> Must be Forbidden
  console.log('[Test 3] Testing cross-workspace access within same organization (Same Org, Different Workspace)...');
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

  // 4. Test Cross-Organization Access -> Must be Forbidden
  console.log('[Test 4] Testing cross-organization access...');
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

  // 5. Test Durability Across In-Memory Registry Wipes
  console.log('[Test 5] Testing durability across server restarts (clearing in-memory registry)...');
  CreativeAssetService.clearRegistryForTesting();

  const restoredAsset = await CreativeAssetService.getAssetAsync(asset.id, orgA, wsA1);

  if (!restoredAsset) {
    console.error('FAIL: Asset could not be restored from canonical storage after memory wipe');
    failures++;
  } else if (restoredAsset.workspaceId !== wsA1 || restoredAsset.organizationId !== orgA) {
    console.error('FAIL: Restored asset has mismatched tenant metadata:', restoredAsset);
    failures++;
  } else {
    console.log('PASS: Asset successfully restored from Supabase storage metadata after server restart simulation.');
  }

  // 6. Test Delivery Generation on Restored Asset
  console.log('[Test 6] Generating delivery URL from cold restored asset...');
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
    console.log('ALL CREATIVE DELIVERY & ISOLATION ACCEPTANCE TESTS PASSED!');
  }
}

run().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
