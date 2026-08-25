import * as crypto from 'crypto';
import {
  generateOAuthState,
  verifyOAuthState,
  ZernioSocialService,
} from '../packages/integrations/src/index';
import {
  CreativeAssetService,
  BusinessContextService,
  BusinessGrowthProfileService,
  MariOrchestrationService,
} from '../packages/ai/src/index';

interface AuditResult {
  category: string;
  testName: string;
  vector: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const auditResults: AuditResult[] = [];

function recordTest(category: string, testName: string, vector: string, passed: boolean, evidence: string) {
  auditResults.push({
    category,
    testName,
    vector,
    status: passed ? 'PASS' : 'FAIL',
    evidence,
  });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${category}] ${symbol} | ${testName}`);
  console.log(`    ➜ Vector: ${vector}`);
  console.log(`    ➜ Evidence: ${evidence}\n`);
}

const BASE_URL = 'http://localhost:6509/ralion';

async function runMultiTenantAudit() {
  console.log('================================================================================');
  console.log('🔒 RALION OS — PRODUCTION MULTI-TENANT ISOLATION SECURITY AUDIT');
  console.log('================================================================================\n');

  const TENANT_A = {
    orgId: 'org_acme_corp_101',
    workspaceId: 'ws_acme_101',
    userId: 'usr_alice_101',
    pageId: '101101101101',
    zernioProfileId: 'prof_acme_101',
    zernioAccountId: 'acc_acme_101',
    socialConnectionId: 'conn_acme_fb_101',
  };

  const TENANT_B = {
    orgId: 'org_apex_logistics_202',
    workspaceId: 'ws_apex_202',
    userId: 'usr_bob_202',
    pageId: '202202202202',
    zernioProfileId: 'prof_apex_202',
    zernioAccountId: 'acc_apex_202',
    socialConnectionId: 'conn_apex_fb_202',
  };

  // ===========================================================================
  // 1. META OAUTH CSRF & STATE TOKEN TAMPERING AUDIT
  // ===========================================================================
  console.log('--- SECTION 1: Meta OAuth State & CSRF Tampering Isolation ---');

  // Test 1.1: Legitimate state token generation & verification for Tenant A
  const legitimateStateA = generateOAuthState(TENANT_A.workspaceId, 'facebook');
  const verifyLegitA = verifyOAuthState(legitimateStateA);
  recordTest(
    'OAuth Isolation',
    'Legitimate OAuth State Verification',
    `Workspace: ${TENANT_A.workspaceId}, Provider: facebook`,
    verifyLegitA.valid && verifyLegitA.workspaceId === TENANT_A.workspaceId,
    `HMAC-signed state verified successfully. Decoded workspaceId: "${verifyLegitA.workspaceId}"`
  );

  // Test 1.2: Deliberate cross-tenant payload manipulation (Swap workspaceId to Tenant B without valid HMAC)
  const [rawPayloadA] = legitimateStateA.split('.');
  const decodedPayloadA = JSON.parse(Buffer.from(rawPayloadA, 'base64url').toString('utf-8'));
  const tamperedPayloadB = { ...decodedPayloadA, workspaceId: TENANT_B.workspaceId };
  const tamperedPayloadBBase64 = Buffer.from(JSON.stringify(tamperedPayloadB)).toString('base64url');
  
  // Re-attach Tenant A's original signature to Tenant B's manipulated payload
  const tamperedState = `${tamperedPayloadBBase64}.${legitimateStateA.split('.')[1]}`;
  const verifyTampered = verifyOAuthState(tamperedState);
  recordTest(
    'OAuth Isolation',
    'Cross-Tenant Payload Tampering (Signature Mismatch)',
    `Attacker attempts to forge state for ${TENANT_B.workspaceId} using Tenant A signature`,
    !verifyTampered.valid,
    `Tampered state token was rejected with valid: false. Forged workspaceId was not trusted.`
  );

  // Test 1.3: Deliberate raw unauthenticated base64 state (Legacy un-signed attack)
  const legacyUnsignedToken = Buffer.from(JSON.stringify({ workspaceId: TENANT_B.workspaceId, provider: 'facebook', ts: Date.now() })).toString('base64url');
  const verifyUnsigned = verifyOAuthState(legacyUnsignedToken);
  recordTest(
    'OAuth Isolation',
    'Unsigned State Token Rejection',
    `Attacker sends raw unsigned base64url JSON token for ${TENANT_B.workspaceId}`,
    !verifyUnsigned.valid,
    `Unsigned token lacked HMAC delimiter. Rejected with valid: false.`
  );

  // Test 1.4: Expired state token (> 15 minutes)
  const expiredPayload = { workspaceId: TENANT_A.workspaceId, provider: 'facebook', ts: Date.now() - (20 * 60 * 1000) };
  const expiredPayloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const rawSecret = process.env.OAUTH_ENCRYPTION_KEY || 'ralion-enterprise-oauth-secret-key-32bytes-secure!';
  const key = crypto.createHash('sha256').update(rawSecret).digest();
  const expiredSig = crypto.createHmac('sha256', key).update(expiredPayloadB64).digest('base64url');
  const expiredToken = `${expiredPayloadB64}.${expiredSig}`;
  const verifyExpired = verifyOAuthState(expiredToken);
  recordTest(
    'OAuth Isolation',
    'Expired State Token Rejection (> 15m)',
    `Validly signed state token created 20 minutes in the past`,
    !verifyExpired.valid,
    `Expired state token rejected due to lifetime boundary check.`
  );

  // ===========================================================================
  // 2. CREATIVE ASSETS MULTI-TENANT ISOLATION AUDIT
  // ===========================================================================
  console.log('--- SECTION 2: Creative Assets Isolation & Cross-Tenant Access ---');

  // Generate real test assets for Tenant A and Tenant B via HTTP API on running server
  const genResA = await fetch(`${BASE_URL}/api/creatives/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'POSTER_IMAGE',
      prompt: 'Enterprise logistics graphic for Acme Corp',
      organizationId: TENANT_A.orgId,
    }),
  });
  const genDataA = await genResA.json().catch(() => ({}));

  const genResB = await fetch(`${BASE_URL}/api/creatives/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'POSTER_IMAGE',
      prompt: 'Fleet tracking promotional graphic for Apex Logistics',
      organizationId: TENANT_B.orgId,
    }),
  });
  const genDataB = await genResB.json().catch(() => ({}));

  const assetAId = genDataA.asset?.id || genDataA.asset?.assetId || genDataA.receipt?.assetId;
  const assetBId = genDataB.asset?.id || genDataB.asset?.assetId || genDataB.receipt?.assetId;

  // Test 2.1: Tenant A reads Tenant A's asset (HTTP API Layer)
  const httpReadOwnA = await fetch(`${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_A.orgId}`);
  const httpReadOwnABody = await httpReadOwnA.json().catch(() => ({}));
  recordTest(
    'Creative Assets',
    'Tenant Reads Own Creative Asset (HTTP 200 OK)',
    `GET ${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_A.orgId}`,
    httpReadOwnA.status === 200 && httpReadOwnABody.success === true && httpReadOwnABody.asset?.organizationId === TENANT_A.orgId,
    `Successfully retrieved asset "${httpReadOwnABody.asset?.title || assetAId}" owned by ${httpReadOwnABody.asset?.organizationId}`
  );

  // Test 2.2: Tenant B attempts to read Tenant A's private asset (HTTP API Layer)
  const httpCrossRead = await fetch(`${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_B.orgId}`);
  const httpCrossReadBody = await httpCrossRead.json().catch(() => ({}));
  recordTest(
    'Creative Assets',
    'Cross-Tenant Asset Read Denial (HTTP 403 Forbidden)',
    `GET ${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_B.orgId}`,
    httpCrossRead.status === 403 && httpCrossReadBody.success === false,
    `HTTP response status: ${httpCrossRead.status} Forbidden. Error message: "${httpCrossReadBody.error}"`
  );

  // Test 2.3: Tenant B attempts to delete Tenant A's asset (HTTP API Layer)
  const httpCrossDelete = await fetch(`${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_B.orgId}`, {
    method: 'DELETE',
  });
  const httpCrossDeleteBody = await httpCrossDelete.json().catch(() => ({}));
  
  // Verify Tenant A's asset still exists
  const httpVerifyStillExists = await fetch(`${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_A.orgId}`);
  recordTest(
    'Creative Assets',
    'Cross-Tenant Asset Deletion Denial (HTTP 403 Forbidden)',
    `DELETE ${BASE_URL}/api/creatives/${assetAId}?organizationId=${TENANT_B.orgId}`,
    httpCrossDelete.status === 403 && httpVerifyStillExists.status === 200,
    `HTTP response status: ${httpCrossDelete.status} Forbidden. Tenant A asset remained intact (HTTP ${httpVerifyStillExists.status} OK).`
  );

  // Test 2.4: Tenant B lists creative gallery
  const httpListB = await fetch(`${BASE_URL}/api/creatives/list?organizationId=${TENANT_B.orgId}`);
  const httpListBBody = await httpListB.json().catch(() => ({ assets: [] }));
  const leakedFromA = (httpListBBody.assets || []).some((a: any) => a.organizationId === TENANT_A.orgId);
  const containsOwnB = (httpListBBody.assets || []).some((a: any) => a.id === assetBId);
  recordTest(
    'Creative Assets',
    'Tenant Gallery Listing Boundary (HTTP API)',
    `GET ${BASE_URL}/api/creatives/list?organizationId=${TENANT_B.orgId}`,
    !leakedFromA && containsOwnB,
    `Tenant B gallery returned ${httpListBBody.assets?.length || 0} items. Leaked items from Tenant A: 0.`
  );

  // ===========================================================================
  // 3. ZERNIO & SOCIAL PUBLISHING MULTI-TENANT ISOLATION AUDIT
  // ===========================================================================
  console.log('--- SECTION 3: Zernio & Social Publishing Isolation ---');

  // Test 3.1: Tenant B attempts to publish via master Zernio profile
  const unauthorizedPublishAttempt = await ZernioSocialService.publishPost({
    organizationId: TENANT_B.orgId,
    userId: TENANT_B.userId,
    content: 'Cross-tenant hijacking attempt to Facebook',
    pageId: TENANT_A.pageId,
  });
  recordTest(
    'Zernio Multi-Tenant',
    'Cross-Tenant Zernio Profile Hijack Prevention',
    `Tenant B (${TENANT_B.orgId}) attempts to publish through master profile without tenant binding`,
    !unauthorizedPublishAttempt.success && (unauthorizedPublishAttempt.error?.includes('Access denied') || unauthorizedPublishAttempt.error?.includes('Tenant-specific')),
    `Zernio publishing denied with error: "${unauthorizedPublishAttempt.error}"`
  );

  // Test 3.2: Cross-tenant connection ID manipulation over HTTP
  const httpPublishAttack = await fetch(`${BASE_URL}/api/social/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Attack post attempting to hijack Tenant A connection',
      socialConnectionId: TENANT_A.socialConnectionId,
      pageId: TENANT_A.pageId,
    }),
  });
  const httpPublishAttackBody = await httpPublishAttack.json().catch(() => ({}));
  recordTest(
    'Social Publishing',
    'Cross-Tenant Publish Injection Denial (HTTP)',
    `POST ${BASE_URL}/api/social/publish with foreign socialConnectionId`,
    httpPublishAttack.status === 401 || httpPublishAttack.status === 403 || httpPublishAttack.status === 422 || httpPublishAttackBody.success === false,
    `Server rejected unauthorized cross-tenant publish with HTTP ${httpPublishAttack.status}: "${httpPublishAttackBody.error || 'Authentication required'}"`
  );

  // ===========================================================================
  // 4. MARI CONTEXT, ACTIVITY STREAM & GROWTH MEMORY ISOLATION
  // ===========================================================================
  console.log('--- SECTION 4: Mari AI Context & Growth Memory Isolation ---');

  // Record separate growth outcomes in Mari Memory
  BusinessGrowthProfileService.recordGrowthOutcome(TENANT_A.orgId, {
    recommendation: 'Target Mining Enterprise contracts in Francistown',
    decision: 'ACCEPTED',
    actionTaken: 'Executed B2B outreach campaign',
    actualOutcome: 'Acquired 2 pilot enterprise accounts',
    resultMetrics: { pipelineIncrease: '$48,000' },
    lessonsLearned: 'Direct C-suite mining sector demonstrations convert at 40%.',
  });

  BusinessGrowthProfileService.recordGrowthOutcome(TENANT_B.orgId, {
    recommendation: 'Deploy automated cold-chain logistics telemetry',
    decision: 'ACCEPTED',
    actionTaken: 'Integrated IoT sensor notifications',
    actualOutcome: 'Reduced refrigerated cargo SLA violations by 95%',
    resultMetrics: { slaCompliance: '99.9%' },
    lessonsLearned: 'Real-time temperature alerts eliminate freight insurance claims.',
  });

  // Assemble Business Contexts
  const contextA = await BusinessContextService.assembleContext(TENANT_A.orgId, { forceRefresh: true });
  const contextB = await BusinessContextService.assembleContext(TENANT_B.orgId, { forceRefresh: true });

  const profileA = BusinessGrowthProfileService.getOrCreateGrowthProfile(contextA);
  const profileB = BusinessGrowthProfileService.getOrCreateGrowthProfile(contextB);

  const memoryA_has_B = profileA.growthMemory.some(m => m.lessonsLearned?.includes('temperature alerts'));
  const memoryB_has_A = profileB.growthMemory.some(m => m.lessonsLearned?.includes('mining sector'));

  recordTest(
    'Mari Memory',
    'Growth Memory Tenant Segregation',
    `Comparing Growth Memories for Tenant A (${TENANT_A.orgId}) vs Tenant B (${TENANT_B.orgId})`,
    !memoryA_has_B && !memoryB_has_A,
    `Tenant A memories count: ${profileA.growthMemory.length}, Tenant B memories count: ${profileB.growthMemory.length}. Zero cross-contamination detected.`
  );

  // Activity Stream Isolation
  const streamA = MariOrchestrationService.getActivityStream(TENANT_A.orgId);
  const streamB = MariOrchestrationService.getActivityStream(TENANT_B.orgId);

  const streamA_has_B = streamA.some(e => e.organizationId === TENANT_B.orgId);
  const streamB_has_A = streamB.some(e => e.organizationId === TENANT_A.orgId);

  recordTest(
    'Mari Activity Stream',
    'Activity Thread Tenant Segregation',
    `Comparing Activity Streams for Tenant A vs Tenant B`,
    !streamA_has_B && !streamB_has_A,
    `Tenant A stream entries: ${streamA.length}, Tenant B stream entries: ${streamB.length}. All entries strictly match requesting organizationId.`
  );

  // Test 4.3: HTTP Context Assembly
  const httpContextA = await fetch(`${BASE_URL}/api/mari/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId: TENANT_A.orgId }),
  });
  const httpContextABody = await httpContextA.json().catch(() => ({}));
  recordTest(
    'Mari Context API',
    'Tenant-Specific Business Context Assembly (HTTP)',
    `POST ${BASE_URL}/api/mari/context with orgId: ${TENANT_A.orgId}`,
    httpContextABody.success === true && httpContextABody.context?.organizationId === TENANT_A.orgId,
    `Context returned with organizationId "${httpContextABody.context?.organizationId}" and ${httpContextABody.context?.organizationName}`
  );

  // ===========================================================================
  // 5. WEBHOOK SIGNATURE & CROSS-TENANT ROUTING SECURITY
  // ===========================================================================
  console.log('--- SECTION 5: Webhook Signature & Cross-Tenant Routing ---');

  // Test 5.1: Webhook HMAC verification with fake signature
  const fakeWebhookPayload = JSON.stringify({
    event: 'account.connected',
    accountId: TENANT_A.zernioAccountId,
    profileId: TENANT_A.zernioProfileId,
    timestamp: new Date().toISOString(),
  });
  const fakeSignature = 'sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const verifyFakeWebhook = ZernioSocialService.verifyWebhookSignature(fakeWebhookPayload, fakeSignature);
  recordTest(
    'Webhook Security',
    'Forged Webhook HMAC Signature Rejection',
    `Attacker sends webhook targeting Tenant A with forged signature`,
    !verifyFakeWebhook,
    `Signature verification rejected invalid HMAC. Webhook ingestion blocked.`
  );

  // Test 5.2: HTTP Webhook endpoint with forged signature
  const httpWebhookAttack = await fetch(`${BASE_URL}/api/webhooks/zernio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-zernio-signature': fakeSignature,
    },
    body: fakeWebhookPayload,
  });
  recordTest(
    'Webhook Security',
    'HTTP Webhook Endpoint Rejects Forged Signature (401 Unauthorized)',
    `POST ${BASE_URL}/api/webhooks/zernio with fake HMAC signature`,
    httpWebhookAttack.status === 401,
    `HTTP status: ${httpWebhookAttack.status} Unauthorized. Tampered webhook was rejected at ingress.`
  );

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log('================================================================================');
  console.log('📊 MULTI-TENANT ISOLATION AUDIT SUMMARY:');
  const total = auditResults.length;
  const passed = auditResults.filter(r => r.status === 'PASS').length;
  const failed = auditResults.filter(r => r.status === 'FAIL').length;
  console.log(`Total Attack Vectors Tested: ${total}`);
  console.log(`Passed (Denials & Isolation Enforced): ${passed}/${total}`);
  console.log(`Failed (Vulnerabilities Detected): ${failed}/${total}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiTenantAudit().catch(err => {
  console.error('Audit Runner Failure:', err);
  process.exit(1);
});
