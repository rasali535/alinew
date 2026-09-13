/**
 * RALION OS — Creative Asset Route, Tenant Isolation & Non-Ras-Ali Copy Verification Suite
 *
 * Validates:
 * 1. Non-Ras-Ali Tenant Marketing Copy Zero Leakage (No Ras Ali, Ralion, SADC, SovereignSoftware, rasalilabs.com, FB identifiers)
 * 2. Fabricated Creative Metadata Removal (Zero default 90/96 scores, customerReady false on un-evaluated)
 * 3. Creative URL & Storage Verification:
 *    - Authenticated owner access (HTTP 200, Content-Type, magic bytes, SHA-256 integrity, nonzero size)
 *    - Unauthenticated access (HTTP 401)
 *    - Cross-tenant access (HTTP 403)
 *    - Rejected 'all' organization hints (HTTP 403)
 *    - Namespace storage paths: organizations/{orgId}/workspaces/{workspaceId}/assets/{assetId}/{filename}
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as crypto from 'crypto';
import {
  CreativeOrchestrator,
  CreativeAssetService,
  MariUniversalCore,
} from '@ralion/ai';
import { GET as CreativeFileRoute } from '../apps/ralion/src/app/api/creatives/file/[filename]/route';
import { GET as CreativeAssetRoute, DELETE as CreativeDeleteRoute } from '../apps/ralion/src/app/api/creatives/[assetId]/route';
import { __setTestContextResolver } from '../apps/ralion/src/lib/auth/serverAuth';
import { NextRequest } from 'next/server';

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    if (details) console.error('   Details:', details);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`);
}

async function runSecurityAndCreativeAcceptance() {
  console.log('===============================================================');
  console.log('  RALION OS: CREATIVE SECURITY & TENANT ACCEPTANCE SUITE');
  console.log('===============================================================\n');

  // Register session resolver for testing
  __setTestContextResolver(async (req) => {
    const orgId = req.headers.get('x-organization-id');
    const wsId = req.headers.get('x-workspace-id') || orgId;
    const userId = req.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000001';

    if (!orgId) return null;

    return {
      user: { id: userId, email: 'test@ralion.dev' },
      profile: { id: userId, fullName: 'Test User', email: 'test@ralion.dev', avatarUrl: null },
      workspace: { id: wsId, name: 'Test Workspace', slug: 'test-ws', owner_id: userId, organization_id: orgId },
      membership: { id: `mem_${userId}`, workspace_id: wsId, user_id: userId, role: 'owner' },
      organization: { id: orgId, name: 'Test Organization', slug: 'test-org' },
    };
  });

  const tenantOwnerOrgId = `org_test_owner_${Date.now()}`;
  const tenantOwnerWorkspaceId = `ws_test_owner_${Date.now()}`;
  const tenantOwnerUserId = `user_test_owner_${Date.now()}`;

  const tenantAttackerOrgId = `org_test_attacker_${Date.now()}`;
  const tenantAttackerWorkspaceId = `ws_test_attacker_${Date.now()}`;
  const tenantAttackerUserId = `user_test_attacker_${Date.now()}`;

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Non-Ras-Ali Tenant Copy & Metadata Leakage Prevention
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Non-Ras-Ali Tenant Copy Leakage Test ---');

  const thirdPartyResult = await MariUniversalCore.processQuery({
    prompt: 'Create a flyer for our solar panel installation discount in Cape Town',
    originalUserPrompt: 'Create a flyer for our solar panel installation discount in Cape Town',
    organizationId: tenantOwnerOrgId,
    workspaceId: tenantOwnerWorkspaceId,
    userId: tenantOwnerUserId,
    companyName: 'Helios Solar Tech',
    requestId: `req_sec_test_${Date.now()}`,
  });

  const answerText = thirdPartyResult.answer || '';
  console.log('  Mari response answer:\n', answerText.slice(0, 200) + '...\n');

  // Verify ZERO Ras Ali / SADC / SovereignSoftware leakage
  assert(!answerText.includes('Ras Ali Labs'), 'Answer contains zero "Ras Ali Labs" branding');
  assert(!answerText.includes('Ralion OS'), 'Answer contains zero "Ralion OS" branding for third-party client');
  assert(!answerText.includes('SADC'), 'Answer contains zero "SADC" positioning text');
  assert(!answerText.includes('SovereignSoftware'), 'Answer contains zero "SovereignSoftware" hashtags');
  assert(!answerText.includes('rasalilabs.com'), 'Answer contains zero "rasalilabs.com" URL links');
  assert(!answerText.includes('477334159265235'), 'Answer contains zero Ras Ali Facebook Page IDs');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Generation and Honest QA Metadata Structure
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Generation and Honest Metadata Test ---');

  const genResult = await CreativeOrchestrator.generate({
    organizationId: tenantOwnerOrgId,
    workspaceId: tenantOwnerWorkspaceId,
    type: 'POSTER_IMAGE',
    prompt: 'Helios Solar Tech: Premium Solar Panel Inverter Combo. Clean Commercial Flyer',
    title: 'Helios Solar Launch',
    format: '1:1',
    campaign: 'Helios Summer Energy',
    platform: 'facebook',
    cta: 'Get a Quote',
  });

  assert(genResult.success === true, 'Creative generation succeeded');
  assert(Boolean(genResult.receipt?.assetId), 'Receipt contains asset ID');

  const assetId = genResult.receipt!.assetId;
  const rawAsset = CreativeAssetService.getAsset(assetId, tenantOwnerOrgId);
  assert(Boolean(rawAsset), 'Durable asset found in CreativeAssetService');

  // Verify namespace storage path
  const expectedStoragePrefix = `organizations/${tenantOwnerOrgId}/workspaces/${tenantOwnerWorkspaceId}/assets/${assetId}/`;
  assert(
    rawAsset!.storagePath.startsWith(expectedStoragePrefix),
    `Storage path is properly namespaced: ${rawAsset!.storagePath}`
  );

  // Verify QA honesty: scores should not be fabricated 90s/96s
  if (!rawAsset?.metadata?.visualQADetails) {
    assert(
      rawAsset?.metadata?.semanticScore === undefined || rawAsset?.metadata?.semanticScore === null,
      'Semantic score is not fabricated when visual QA did not execute'
    );
    assert(
      rawAsset?.metadata?.customerReady === false || rawAsset?.metadata?.customerReady === undefined,
      'customerReady is false when visual QA did not execute'
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Authenticated Creative URL & Binary Integrity
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Creative Route Authentication & Binary Integrity Test ---');

  const assetFilename = `${assetId}.jpg`;

  // 3.1 Unauthenticated access attempt -> HTTP 401
  const reqUnauth = new NextRequest(`http://localhost:3000/api/creatives/file/${assetFilename}`, {
    method: 'GET',
  });
  const resUnauth = await CreativeFileRoute(reqUnauth, {
    params: Promise.resolve({ filename: assetFilename }),
  });
  assert(resUnauth.status === 401, `Unauthenticated request returned HTTP 401 (got ${resUnauth.status})`);

  // 3.2 Cross-tenant access attempt -> HTTP 403
  const reqCrossTenant = new NextRequest(`http://localhost:3000/api/creatives/file/${assetFilename}`, {
    method: 'GET',
    headers: {
      'x-organization-id': tenantAttackerOrgId,
      'x-workspace-id': tenantAttackerWorkspaceId,
      'x-user-id': tenantAttackerUserId,
    },
  });
  const resCrossTenant = await CreativeFileRoute(reqCrossTenant, {
    params: Promise.resolve({ filename: assetFilename }),
  });
  assert(resCrossTenant.status === 403 || resCrossTenant.status === 404, `Cross-tenant request returned HTTP 403/404 forbidden (got ${resCrossTenant.status})`);

  // 3.3 Access with 'all' organization query parameter -> HTTP 403
  const reqAllHint = new NextRequest(`http://localhost:3000/api/creatives/file/${assetFilename}?organizationId=all`, {
    method: 'GET',
    headers: {
      'x-organization-id': tenantOwnerOrgId,
      'x-workspace-id': tenantOwnerWorkspaceId,
      'x-user-id': tenantOwnerUserId,
    },
  });
  const resAllHint = await CreativeFileRoute(reqAllHint, {
    params: Promise.resolve({ filename: assetFilename }),
  });
  assert(resAllHint.status === 403, `Request with organizationId=all returned HTTP 403 (got ${resAllHint.status})`);

  // 3.4 Authenticated Owner access -> HTTP 200 with verified Binary & SHA-256
  const reqOwner = new NextRequest(`http://localhost:3000/api/creatives/file/${assetFilename}`, {
    method: 'GET',
    headers: {
      'x-organization-id': tenantOwnerOrgId,
      'x-workspace-id': tenantOwnerWorkspaceId,
      'x-user-id': tenantOwnerUserId,
    },
  });
  const resOwner = await CreativeFileRoute(reqOwner, {
    params: Promise.resolve({ filename: assetFilename }),
  });
  assert(resOwner.status === 200, `Owner request returned HTTP 200 (got ${resOwner.status})`);

  const contentType = resOwner.headers.get('Content-Type');
  assert(
    contentType?.includes('image/') === true || contentType?.includes('video/') === true,
    `Content-Type header is valid media type: ${contentType}`
  );

  const downloadedBytes = Buffer.from(await resOwner.arrayBuffer());
  assert(downloadedBytes.length > 0, `Downloaded asset is non-empty (${downloadedBytes.length} bytes)`);

  // Magic bytes check: JPEG (FF D8 FF) or PNG (89 50 4E 47) or WEBP (52 49 46 46) or MP4 (00 00 00 ...)
  const isJpeg = downloadedBytes[0] === 0xff && downloadedBytes[1] === 0xd8 && downloadedBytes[2] === 0xff;
  const isPng = downloadedBytes[0] === 0x89 && downloadedBytes[1] === 0x50 && downloadedBytes[2] === 0x4e && downloadedBytes[3] === 0x47;
  const isWebp = downloadedBytes.slice(0, 4).toString('utf-8') === 'RIFF';
  assert(isJpeg || isPng || isWebp, 'Downloaded content matches valid image magic bytes');

  // SHA-256 verification against X-Asset-SHA256 header or computed hash
  const computedSha256 = crypto.createHash('sha256').update(downloadedBytes).digest('hex');
  const headerSha256 = resOwner.headers.get('X-Asset-SHA256');
  if (headerSha256) {
    assert(headerSha256 === computedSha256, `SHA-256 integrity matches header: ${computedSha256.slice(0, 12)}...`);
  }

  // 3.5 Asset Details Route: Unauthenticated (401), Cross-tenant (403), Owner (200)
  const reqAssetUnauth = new NextRequest(`http://localhost:3000/api/creatives/${assetId}`, { method: 'GET' });
  const resAssetUnauth = await CreativeAssetRoute(reqAssetUnauth, { params: Promise.resolve({ assetId }) });
  assert(resAssetUnauth.status === 401, `Asset GET unauthenticated returned HTTP 401 (got ${resAssetUnauth.status})`);

  const reqAssetCross = new NextRequest(`http://localhost:3000/api/creatives/${assetId}`, {
    method: 'GET',
    headers: {
      'x-organization-id': tenantAttackerOrgId,
      'x-workspace-id': tenantAttackerWorkspaceId,
      'x-user-id': tenantAttackerUserId,
    },
  });
  const resAssetCross = await CreativeAssetRoute(reqAssetCross, { params: Promise.resolve({ assetId }) });
  assert(resAssetCross.status === 403, `Asset GET cross-tenant returned HTTP 403 (got ${resAssetCross.status})`);

  const reqAssetOwner = new NextRequest(`http://localhost:3000/api/creatives/${assetId}`, {
    method: 'GET',
    headers: {
      'x-organization-id': tenantOwnerOrgId,
      'x-workspace-id': tenantOwnerWorkspaceId,
      'x-user-id': tenantOwnerUserId,
    },
  });
  const resAssetOwner = await CreativeAssetRoute(reqAssetOwner, { params: Promise.resolve({ assetId }) });
  assert(resAssetOwner.status === 200, `Asset GET owner returned HTTP 200 (got ${resAssetOwner.status})`);

  console.log('\n===============================================================');
  console.log('  🎉 ALL CREATIVE SECURITY & TENANT ACCEPTANCE TESTS PASSED!');
  console.log('===============================================================\n');
}

runSecurityAndCreativeAcceptance().catch((err) => {
  console.error('Fatal error in security acceptance suite:', err);
  process.exit(1);
});
