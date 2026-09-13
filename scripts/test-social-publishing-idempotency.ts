import dotenv from 'dotenv';
dotenv.config();

import { SocialPublishingService } from '../apps/ralion/src/lib/services/social/socialPublishing.service';

async function run() {
  console.log('--- STARTING 5-WAY SOCIAL PUBLISHING IDEMPOTENCY TEST ---');
  let failures = 0;

  SocialPublishingService.clearRegistryForTesting();

  const userA = 'usr-001';
  const orgA = 'org-corp-1';
  const wsA1 = 'ws-market-1';
  const wsA2 = 'ws-market-2';
  const orgB = 'org-corp-2';

  const sampleBody = 'Automated Flash Sale Launch for Ralion OS Tenants!';
  const crypto = require('crypto');
  const bodyHash = crypto.createHash('sha256').update(sampleBody.trim()).digest('hex');

  // Step 1: Record initial published post in Org A / Workspace A1
  console.log('[Step 1] Recording published post in Org A / Workspace A1 (facebook)...');
  SocialPublishingService.recordPublishedPostForTesting({
    id: 'post-1001',
    userId: userA,
    organizationId: orgA,
    workspaceId: wsA1,
    destination: 'facebook',
    bodyHash,
    body: sampleBody,
    platforms: ['facebook'],
    idempotencyKey: 'key-test-001',
    status: 'PUBLISHED',
  });
  console.log('PASS: Original post recorded in memory registry.');

  // Step 2: Duplicate publish in the SAME workspace (Org A / Workspace A1) with same body
  console.log('[Step 2] Attempting duplicate post in same workspace (Org A / Workspace A1)...');
  try {
    const res2 = await SocialPublishingService.publish({
      userId: userA,
      organizationId: orgA,
      workspaceId: wsA1,
      body: sampleBody,
      platforms: ['facebook'],
    });

    if (res2.conflict && res2.statusCode === 409) {
      console.log('PASS: Correctly rejected with 409 Conflict for duplicate post in same workspace.');
    } else {
      console.error('FAIL: Duplicate post was not rejected with 409:', res2);
      failures++;
    }
  } catch (err: any) {
    console.error('FAIL: Unexpected exception in step 2:', err.message);
    failures++;
  }

  // Step 3: Same post in a DIFFERENT workspace (Org A / Workspace A2) -> MUST BE ALLOWED (Workspace Isolation)
  console.log('[Step 3] Publishing same content in DIFFERENT workspace (Org A / Workspace A2)...');
  try {
    const res3 = await SocialPublishingService.publish({
      userId: userA,
      organizationId: orgA,
      workspaceId: wsA2,
      body: sampleBody,
      platforms: ['facebook'],
      idempotencyKey: 'key-test-ws2',
    });

    if (res3.conflict) {
      console.error('FAIL: Different workspace should NOT conflict with ws1 post:', res3);
      failures++;
    } else {
      console.log('PASS: Different workspace publish allowed without cross-workspace conflict.');
    }
  } catch (err: any) {
    console.error('FAIL: Exception in step 3:', err.message);
    failures++;
  }

  // Step 4: Same post in a DIFFERENT organization (Org B / Workspace A1) -> MUST BE ALLOWED (Org Isolation)
  console.log('[Step 4] Publishing same content in DIFFERENT organization (Org B)...');
  try {
    const res4 = await SocialPublishingService.publish({
      userId: userA,
      organizationId: orgB,
      workspaceId: wsA1,
      body: sampleBody,
      platforms: ['facebook'],
      idempotencyKey: 'key-test-orgB',
    });

    if (res4.conflict) {
      console.error('FAIL: Different organization should NOT conflict:', res4);
      failures++;
    } else {
      console.log('PASS: Different organization publish allowed.');
    }
  } catch (err: any) {
    console.error('FAIL: Exception in step 4:', err.message);
    failures++;
  }

  // Step 5: Same workspace but DIFFERENT destination (e.g. linkedin) -> MUST BE ALLOWED (Destination Isolation)
  console.log('[Step 5] Publishing same content to DIFFERENT destination (linkedin)...');
  try {
    const res5 = await SocialPublishingService.publish({
      userId: userA,
      organizationId: orgA,
      workspaceId: wsA1,
      body: sampleBody,
      platforms: ['linkedin'],
      idempotencyKey: 'key-test-linkedin',
    });

    if (res5.conflict) {
      console.error('FAIL: Different destination should NOT conflict with facebook post:', res5);
      failures++;
    } else {
      console.log('PASS: Different destination publish allowed without conflict.');
    }
  } catch (err: any) {
    console.error('FAIL: Exception in step 5:', err.message);
    failures++;
  }

  console.log('----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL 5-WAY IDEMPOTENCY ACCEPTANCE TESTS PASSED!');
  }
}

run().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
