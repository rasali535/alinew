// =====================================================================
// Ralion OS — Creative Delivery Route Handler Acceptance Test
// Enforces:
// 1. Mandatory test guard preventing execution against production storage
// 2. MockIsolatedStorageProvider injection via setStorageProvider
// 3. Direct invocation of the real Next.js route handler (GET)
// 4. Verification of actual HTTP status codes (401, 200, 403, 404)
// 5. Zero exposure of service-role keys or storage credentials
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
import { NextRequest } from 'next/server';
import { setStorageProvider } from '../packages/ai/src/storage/index';
import { MockIsolatedStorageProvider } from './mock-isolated-storage';
import { CreativeAssetService } from '../packages/ai/src/creativeAsset.service';
import { __setTestContextResolver, RalionSessionContext } from '../apps/ralion/src/lib/auth/serverAuth';
import { GET } from '../apps/ralion/src/app/api/creatives/[assetId]/delivery/route';

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

function buildTestContext(orgId: string, wsId: string, userId = 'user-test-owner'): RalionSessionContext {
  return {
    user: { id: userId, email: `${userId}@ralion.io` },
    profile: { id: userId, fullName: 'Test User', email: `${userId}@ralion.io`, avatarUrl: null },
    workspace: {
      id: wsId,
      name: `Workspace ${wsId}`,
      slug: wsId,
      owner_id: userId,
      organization_id: orgId,
    },
    membership: {
      id: `mem_${userId}_${wsId}`,
      workspace_id: wsId,
      user_id: userId,
      role: 'owner',
    },
    organization: {
      id: orgId,
      name: `Org ${orgId}`,
      tier: 'PRO',
    },
  };
}

async function run() {
  console.log('--- STARTING REAL NEXT.JS CREATIVE DELIVERY ROUTE ACCEPTANCE TEST ---');
  let failures = 0;

  const orgAlpha = 'org-alpha-111';
  const wsAlpha1 = 'ws-alpha-main';
  const wsAlpha2 = 'ws-alpha-secondary';
  const orgBeta = 'org-beta-222';
  const wsBeta1 = 'ws-beta-main';

  // Seed test asset in orgAlpha / wsAlpha1
  const validBuffer = createValidJpegBuffer();
  const savedAsset = await CreativeAssetService.saveBinaryAsset({
    organizationId: orgAlpha,
    workspaceId: wsAlpha1,
    type: 'POSTER_IMAGE',
    provider: 'FLUX.1',
    prompt: 'Route verification asset',
    title: 'Route verification asset',
    mimeType: 'image/jpeg',
    buffer: validBuffer,
  });

  const assetId = savedAsset.id;
  console.log(`[Setup] Seeded test asset ${assetId} in ${orgAlpha} / ${wsAlpha1}`);

  // Test Case 1: Unauthenticated request -> HTTP 401
  console.log('\n[Case 1] Unauthenticated request...');
  __setTestContextResolver(async () => null);
  const req1 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
  });
  const res1 = await GET(req1, { params: Promise.resolve({ assetId }) });
  const body1 = await res1.json();
  if (res1.status === 401 && body1.error === 'AUTHENTICATION_REQUIRED') {
    console.log(`PASS: Case 1 correctly returned HTTP 401 (${body1.error})`);
  } else {
    console.error(`FAIL: Case 1 expected HTTP 401, got ${res1.status}:`, body1);
    failures++;
  }

  // Test Case 2: Authenticated owner -> HTTP 200
  console.log('\n[Case 2] Authenticated owner request...');
  __setTestContextResolver(async () => buildTestContext(orgAlpha, wsAlpha1));
  const req2 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
  });
  const res2 = await GET(req2, { params: Promise.resolve({ assetId }) });
  const body2 = await res2.json();
  if (res2.status === 200 && body2.success === true && body2.signedUrl) {
    console.log(`PASS: Case 2 correctly returned HTTP 200 with signed URL prefix: ${body2.signedUrl.substring(0, 45)}...`);
  } else {
    console.error(`FAIL: Case 2 expected HTTP 200, got ${res2.status}:`, body2);
    failures++;
  }

  // Test Case 3: Mismatched client organization hint in headers -> HTTP 403
  console.log('\n[Case 3] Mismatched organization header hint...');
  __setTestContextResolver(async () => buildTestContext(orgAlpha, wsAlpha1));
  const req3 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
    headers: { 'x-organization-id': 'org-tampered-999' },
  });
  const res3 = await GET(req3, { params: Promise.resolve({ assetId }) });
  const body3 = await res3.json();
  if (res3.status === 403 && body3.error === 'FORBIDDEN') {
    console.log(`PASS: Case 3 correctly returned HTTP 403 (${body3.error}) on organization mismatch`);
  } else {
    console.error(`FAIL: Case 3 expected HTTP 403, got ${res3.status}:`, body3);
    failures++;
  }

  // Test Case 4: Mismatched client workspace hint in query params -> HTTP 403
  console.log('\n[Case 4] Mismatched workspace query param hint...');
  __setTestContextResolver(async () => buildTestContext(orgAlpha, wsAlpha1));
  const req4 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery?workspaceId=ws-tampered-888`, {
    method: 'GET',
  });
  const res4 = await GET(req4, { params: Promise.resolve({ assetId }) });
  const body4 = await res4.json();
  if (res4.status === 403 && body4.error === 'FORBIDDEN') {
    console.log(`PASS: Case 4 correctly returned HTTP 403 (${body4.error}) on workspace mismatch`);
  } else {
    console.error(`FAIL: Case 4 expected HTTP 403, got ${res4.status}:`, body4);
    failures++;
  }

  // Test Case 5: Cross-workspace access (Same Org, Different Workspace) -> HTTP 403
  console.log('\n[Case 5] Cross-workspace access within same org...');
  __setTestContextResolver(async () => buildTestContext(orgAlpha, wsAlpha2));
  const req5 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
  });
  const res5 = await GET(req5, { params: Promise.resolve({ assetId }) });
  const body5 = await res5.json();
  if (res5.status === 403 && body5.error === 'FORBIDDEN') {
    console.log(`PASS: Case 5 correctly returned HTTP 403 (${body5.error}) on cross-workspace asset request`);
  } else {
    console.error(`FAIL: Case 5 expected HTTP 403, got ${res5.status}:`, body5);
    failures++;
  }

  // Test Case 6: Cross-organization access (Different Org) -> HTTP 403
  console.log('\n[Case 6] Cross-organization access...');
  __setTestContextResolver(async () => buildTestContext(orgBeta, wsBeta1));
  const req6 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
  });
  const res6 = await GET(req6, { params: Promise.resolve({ assetId }) });
  const body6 = await res6.json();
  if (res6.status === 403 && body6.error === 'FORBIDDEN') {
    console.log(`PASS: Case 6 correctly returned HTTP 403 (${body6.error}) on cross-organization asset request`);
  } else {
    console.error(`FAIL: Case 6 expected HTTP 403, got ${res6.status}:`, body6);
    failures++;
  }

  // Test Case 7: Non-existent asset ID -> HTTP 404
  console.log('\n[Case 7] Non-existent asset ID...');
  __setTestContextResolver(async () => buildTestContext(orgAlpha, wsAlpha1));
  const req7 = new NextRequest(`https://ralion.io/api/creatives/asset-non-existent-999/delivery`, {
    method: 'GET',
  });
  const res7 = await GET(req7, { params: Promise.resolve({ assetId: 'asset-non-existent-999' }) });
  const body7 = await res7.json();
  if (res7.status === 404 && body7.error === 'ASSET_NOT_FOUND') {
    console.log(`PASS: Case 7 correctly returned HTTP 404 (${body7.error})`);
  } else {
    console.error(`FAIL: Case 7 expected HTTP 404, got ${res7.status}:`, body7);
    failures++;
  }

  // Test Case 8: Underlying storage object missing -> HTTP 404 (STORAGE_OBJECT_MISSING)
  console.log('\n[Case 8] Underlying storage object missing...');
  // Delete the object from mockStorage while keeping asset in registry
  await mockStorage.delete(savedAsset.storagePath!);
  const req8 = new NextRequest(`https://ralion.io/api/creatives/${assetId}/delivery`, {
    method: 'GET',
  });
  const res8 = await GET(req8, { params: Promise.resolve({ assetId }) });
  const body8 = await res8.json();
  if (res8.status === 404 && body8.error === 'STORAGE_OBJECT_MISSING') {
    console.log(`PASS: Case 8 correctly returned HTTP 404 (${body8.error})`);
  } else {
    console.error(`FAIL: Case 8 expected HTTP 404, got ${res8.status}:`, body8);
    failures++;
  }

  // Test Case 9: Verify zero credentials or sensitive tokens in headers / body
  console.log('\n[Case 9] Zero credential leak verification...');
  const serialized = JSON.stringify(body2);
  const sensitivePatterns = [/service_role/i, /eyJh/i, /secret/i, /supabase\.co/i];
  let leaked = false;
  for (const pattern of sensitivePatterns) {
    if (pattern.test(serialized)) {
      console.error(`FAIL: Sensitive token pattern detected in response: ${pattern}`);
      leaked = true;
      failures++;
    }
  }
  if (!leaked) {
    console.log('PASS: Zero credential / token patterns in delivery response.');
  }

  console.log('\n----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL REAL NEXT.JS CREATIVE DELIVERY ROUTE TESTS PASSED!');
  }
}

run().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
