/**
 * CORS Preflight & Tenant Header Acceptance Gauntlet
 * 
 * Verifies:
 * 1. Exact browser CORS preflight with Origin https://rasalilabs.com and headers:
 *    - authorization
 *    - content-type
 *    - x-user-id
 *    - x-workspace-id
 *    - x-organization-id
 * 2. Preflight returns status 204/200 with Access-Control-Allow-Origin: https://rasalilabs.com
 * 3. Access-Control-Allow-Headers explicitly permits x-workspace-id, x-organization-id, etc.
 * 4. Access-Control-Allow-Credentials is true and origin is not '*'
 * 5. Unknown/malicious origins do not receive permissive Access-Control-Allow-Origin
 * 6. Live API POST /api/mari/chat resolution with tenant headers
 */

import {
  getCorsHeaders,
  handleCorsPreflight,
  resolveAllowedOrigin,
  isOriginAllowed,
} from '../apps/ralion/src/lib/cors';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runCorsPreflightSuite() {
  console.log('='.repeat(70));
  console.log('🚀 RUNNING MARI AI CORS PREFLIGHT & TENANT HEADERS GAUNTLET');
  console.log('='.repeat(70));

  // Test 1: isOriginAllowed checks
  console.log('\n--- 1. ORIGIN VALIDATION TESTS ---');
  assert(isOriginAllowed('https://rasalilabs.com'), 'https://rasalilabs.com is allowed');
  assert(isOriginAllowed('https://www.rasalilabs.com'), 'https://www.rasalilabs.com is allowed');
  assert(isOriginAllowed('https://app.rasalilabs.com'), 'Subdomain app.rasalilabs.com is allowed');
  assert(isOriginAllowed('https://ralion-dynamic-backend.onrender.com'), 'Render domain is allowed');
  assert(isOriginAllowed('http://localhost:3000'), 'localhost:3000 is allowed');
  assert(isOriginAllowed('http://localhost:6509'), 'localhost:6509 is allowed');
  assert(isOriginAllowed('http://127.0.0.1:5173'), '127.0.0.1:5173 is allowed');
  assert(!isOriginAllowed('https://evil-attacker.com'), 'Untrusted domain evil-attacker.com is rejected');
  assert(!isOriginAllowed('https://fake-rasalilabs.com.attacker.org'), 'Phishing domain is rejected');

  // Test 2: Browser Preflight OPTIONS simulation for https://rasalilabs.com
  console.log('\n--- 2. BROWSER PREFLIGHT OPTIONS SIMULATION ---');
  const browserPreflightHeaders = new Headers({
    'origin': 'https://rasalilabs.com',
    'access-control-request-method': 'POST',
    'access-control-request-headers': 'authorization, content-type, x-organization-id, x-user-id, x-workspace-id',
  });

  const mockPreflightReq = new NextRequest('http://localhost:6509/api/mari/chat', {
    method: 'OPTIONS',
    headers: browserPreflightHeaders,
  });

  const preflightResponse = handleCorsPreflight(mockPreflightReq);
  assert(preflightResponse.status === 204, `Preflight returns status 204 (got ${preflightResponse.status})`);

  const respHeaders = preflightResponse.headers;
  const allowOrigin = respHeaders.get('access-control-allow-origin');
  assert(allowOrigin === 'https://rasalilabs.com', `Access-Control-Allow-Origin is https://rasalilabs.com (got ${allowOrigin})`);

  const allowCredentials = respHeaders.get('access-control-allow-credentials');
  assert(allowCredentials === 'true', `Access-Control-Allow-Credentials is true (got ${allowCredentials})`);

  const allowMethods = respHeaders.get('access-control-allow-methods');
  assert(allowMethods !== null && allowMethods.includes('POST'), `Access-Control-Allow-Methods contains POST (got ${allowMethods})`);

  const allowHeaders = (respHeaders.get('access-control-allow-headers') || '').toLowerCase();
  assert(allowHeaders.includes('x-workspace-id'), `Access-Control-Allow-Headers includes x-workspace-id (got: ${allowHeaders})`);
  assert(allowHeaders.includes('x-organization-id'), `Access-Control-Allow-Headers includes x-organization-id`);
  assert(allowHeaders.includes('x-user-id'), `Access-Control-Allow-Headers includes x-user-id`);
  assert(allowHeaders.includes('authorization'), `Access-Control-Allow-Headers includes authorization`);
  assert(allowHeaders.includes('content-type'), `Access-Control-Allow-Headers includes content-type`);

  // Test 3: Untrusted Origin Preflight (Regression Test)
  console.log('\n--- 3. UNTRUSTED ORIGIN REGRESSION TEST ---');
  const untrustedReq = new NextRequest('http://localhost:6509/api/mari/chat', {
    method: 'OPTIONS',
    headers: new Headers({
      'origin': 'https://malicious-site.com',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization, content-type, x-workspace-id',
    }),
  });

  const untrustedResp = handleCorsPreflight(untrustedReq);
  const untrustedAllowOrigin = untrustedResp.headers.get('access-control-allow-origin');
  assert(
    !untrustedAllowOrigin || untrustedAllowOrigin !== 'https://malicious-site.com',
    `Untrusted origin does not receive Access-Control-Allow-Origin: https://malicious-site.com (got: ${untrustedAllowOrigin || 'null/omitted'})`
  );

  // Test 4: Verify Live Next.js POST /api/mari/chat with CORS headers
  console.log('\n--- 4. SIMULATED POST /api/mari/chat WITH TENANT HEADERS ---');
  const { POST: mariChatHandler } = await import('../apps/ralion/src/app/api/mari/chat/route');
  
  const postReq = new NextRequest('http://localhost:6509/api/mari/chat', {
    method: 'POST',
    headers: new Headers({
      'origin': 'https://rasalilabs.com',
      'content-type': 'application/json',
      'x-user-id': 'usr_test_rasali',
      'x-workspace-id': 'ws_tenant_alpha',
      'x-organization-id': 'ras-ali-labs',
    }),
    body: JSON.stringify({
      query: 'What is the canonical company name for this workspace?',
    }),
  });

  const postResp = await mariChatHandler(postReq);
  assert(postResp.status === 200, `POST /api/mari/chat returns 200 (got ${postResp.status})`);
  
  const postAllowOrigin = postResp.headers.get('access-control-allow-origin');
  assert(postAllowOrigin === 'https://rasalilabs.com', `POST response includes Access-Control-Allow-Origin: https://rasalilabs.com (got ${postAllowOrigin})`);
  
  const postAllowCreds = postResp.headers.get('access-control-allow-credentials');
  assert(postAllowCreds === 'true', `POST response includes Access-Control-Allow-Credentials: true`);

  const json = await postResp.json();
  assert(json.success === true, `API returned success: true`);
  assert(json.companyName === 'Ras Ali Labs (Pty) Ltd' || json.companyName.includes('Ras Ali Labs'), `Company name is resolved canonically (got: ${json.companyName})`);
  assert(json.usage && typeof json.usage.totalTokens === 'number', `Usage telemetry recorded tokens: ${json.usage?.totalTokens}`);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 ALL CORS & TENANT PREFLIGHT SUITE TESTS PASSED 100%');
  console.log('='.repeat(70));
}

runCorsPreflightSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
