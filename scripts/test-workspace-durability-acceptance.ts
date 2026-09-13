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

function createFakePngBuffer(size = 2048): Buffer {
  const buf = Buffer.alloc(size);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  return buf;
}

async function run() {
  console.log('--- STARTING WORKSPACE DURABILITY ACCEPTANCE TEST ---');
  let failures = 0;

  const org1 = 'org-durability-corp';
  const ws1 = 'ws-engineering';
  const ws2 = 'ws-marketing';

  // 1. Create multiple assets in ws1
  console.log('[Step 1] Creating assets in Workspace 1 (ws-engineering)...');
  const asset1 = await CreativeAssetService.saveBinaryAsset({
    organizationId: org1,
    workspaceId: ws1,
    type: 'VIDEO_REEL',
    provider: 'CogVideoX',
    prompt: 'Spring engineering video',
    title: 'Spring engineering video',
    mimeType: 'video/mp4',
    buffer: createFakeJpegBuffer(2048), // valid binary
    metadata: { duration: 15 },
  });

  const asset2 = await CreativeAssetService.saveBinaryAsset({
    organizationId: org1,
    workspaceId: ws1,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'Engineering banner',
    title: 'Engineering banner',
    mimeType: 'image/png',
    buffer: createFakePngBuffer(2048),
  });

  // 2. Create raw asset under ws1
  const rawResult = await CreativeAssetService.saveRawBinaryAsset({
    assetId: asset1.id,
    organizationId: org1,
    workspaceId: ws1,
    mimeType: 'image/jpeg',
    buffer: createFakeJpegBuffer(2048),
  });

  const rawPath = rawResult.rawStoragePath;
  if (!rawPath.includes(`organizations/${org1}/workspaces/${ws1}/assets/${asset1.id}/raw/`)) {
    console.error('FAIL: Raw asset path not properly namespaced:', rawPath);
    failures++;
  } else {
    console.log('PASS: Raw asset correctly namespaced in storage:', rawPath);
  }

  // 3. Create asset in ws2 (marketing)
  console.log('[Step 2] Creating asset in Workspace 2 (ws-marketing)...');
  const asset3 = await CreativeAssetService.saveBinaryAsset({
    organizationId: org1,
    workspaceId: ws2,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'Marketing flyer',
    title: 'Marketing flyer',
    mimeType: 'image/png',
    buffer: createFakePngBuffer(2048),
  });

  // 4. Wipe In-Memory Store
  console.log('[Step 3] Simulating server restart: clearing in-memory registry...');
  CreativeAssetService.clearRegistryForTesting();

  // 5. Query ws1 list
  console.log('[Step 4] Querying listAssetsAsync for Workspace 1...');
  const ws1Assets = await CreativeAssetService.listAssetsAsync({
    organizationId: org1,
    workspaceId: ws1,
  });

  const ws1Ids = ws1Assets.map((a) => a.id);
  if (!ws1Ids.includes(asset1.id) || !ws1Ids.includes(asset2.id)) {
    console.error('FAIL: ws1Assets missing created assets after wipe:', ws1Ids);
    failures++;
  } else if (ws1Ids.includes(asset3.id)) {
    console.error('FAIL: ws1Assets leaked asset from ws2:', ws1Ids);
    failures++;
  } else {
    console.log('PASS: listAssetsAsync returned exactly the assets for ws1:', ws1Ids);
  }

  // 6. Query ws2 list
  console.log('[Step 5] Querying listAssetsAsync for Workspace 2...');
  const ws2Assets = await CreativeAssetService.listAssetsAsync({
    organizationId: org1,
    workspaceId: ws2,
  });

  const ws2Ids = ws2Assets.map((a) => a.id);
  if (!ws2Ids.includes(asset3.id)) {
    console.error('FAIL: ws2Assets missing asset3:', ws2Ids);
    failures++;
  } else if (ws2Ids.includes(asset1.id) || ws2Ids.includes(asset2.id)) {
    console.error('FAIL: ws2Assets leaked assets from ws1:', ws2Ids);
    failures++;
  } else {
    console.log('PASS: listAssetsAsync returned strictly ws2 assets:', ws2Ids);
  }

  console.log('----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL WORKSPACE DURABILITY ACCEPTANCE TESTS PASSED!');
  }
}

run().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
