// =====================================================================
// Ralion OS — Workspace Durability Acceptance Test
// Enforces:
// 1. Mandatory test guard preventing execution against production storage
// 2. MockIsolatedStorageProvider injection via setStorageProvider
// 3. Exact workspace-level isolation & durability across server restarts
// 4. Zero mutation of live production storage
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
import { CreativeAssetService } from '../packages/ai/src/creativeAsset.service';

// Inject mock storage provider
const mockStorage = new MockIsolatedStorageProvider();
setStorageProvider(mockStorage);

function createValidJpegBuffer(): Buffer {
  const commentLength = 1024;
  const commentHeader = Buffer.from([0xff, 0xfe, (commentLength >> 8) & 0xff, commentLength & 0xff]);
  const commentData = Buffer.alloc(commentLength - 2, 0x20);
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
  const part1 = baseJpeg.subarray(0, 20);
  const part2 = baseJpeg.subarray(20);
  return Buffer.concat([part1, commentHeader, commentData, part2]);
}

function createValidMp4Buffer(size = 2048): Buffer {
  const buf = Buffer.alloc(size);
  // MP4 box header: size (32 bytes), type 'ftyp', major brand 'isom'
  buf.writeUInt32BE(32, 0);
  buf.write('ftyp', 4, 'ascii');
  buf.write('isom', 8, 'ascii');
  buf.writeUInt32BE(512, 12);
  buf.write('isom', 16, 'ascii');
  buf.write('mp42', 20, 'ascii');
  return buf;
}

function createValidPngBuffer(size = 2048): Buffer {
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
    buffer: createValidMp4Buffer(2048),
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
    buffer: createValidPngBuffer(2048),
  });

  // 2. Create raw asset under ws1
  const rawResult = await CreativeAssetService.saveRawBinaryAsset({
    assetId: asset1.id,
    organizationId: org1,
    workspaceId: ws1,
    mimeType: 'image/jpeg',
    buffer: createValidJpegBuffer(),
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
    buffer: createValidPngBuffer(2048),
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
