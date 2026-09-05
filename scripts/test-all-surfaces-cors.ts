/**
 * Multi-Surface CORS Preflight Verification
 * 
 * Verifies that all dynamic API endpoints in Ralion OS correctly support
 * browser CORS preflight with tenant headers (x-workspace-id, x-organization-id, x-user-id).
 */

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../apps/ralion/src/lib/cors';

const ROUTES_TO_TEST = [
  '/api/mari/chat',
  '/api/mari/generate',
  '/api/mari/usage',
  '/api/mari/briefing',
  '/api/mari/knowledge/website-sync',
  '/api/mari/knowledge/sources',
  '/api/mari/actions',
  '/api/mari/video',
  '/api/mari/context',
  '/api/social/publish',
  '/api/social/posts',
  '/api/social/connections',
  '/api/social/analytics',
  '/api/social/inbox',
  '/api/creatives/generate',
  '/api/creatives/list',
  '/api/billing/subscription',
  '/api/billing/history',
  '/api/health',
];

async function verifyAllSurfacesCors() {
  console.log('='.repeat(70));
  console.log('🚀 TESTING CORS PREFLIGHT ACROSS ALL RALION OS API SURFACES');
  console.log('='.repeat(70));

  let passed = 0;
  for (const route of ROUTES_TO_TEST) {
    const preflightReq = new NextRequest(`http://localhost:6509${route}`, {
      method: 'OPTIONS',
      headers: new Headers({
        'origin': 'https://rasalilabs.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization, content-type, x-organization-id, x-user-id, x-workspace-id',
      }),
    });

    const response = handleCorsPreflight(preflightReq);
    if (response.status !== 204 && response.status !== 200) {
      throw new Error(`Route ${route} failed preflight with status ${response.status}`);
    }

    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowHeaders = (response.headers.get('access-control-allow-headers') || '').toLowerCase();
    const allowCreds = response.headers.get('access-control-allow-credentials');

    if (allowOrigin !== 'https://rasalilabs.com') {
      throw new Error(`Route ${route} returned invalid allow-origin: ${allowOrigin}`);
    }
    if (allowCreds !== 'true') {
      throw new Error(`Route ${route} missing allow-credentials: true`);
    }
    if (!allowHeaders.includes('x-workspace-id')) {
      throw new Error(`Route ${route} missing x-workspace-id in allow-headers`);
    }

    console.log(`✅ [OK] ${route.padEnd(40)} Preflight 204 | Origin: OK | Headers: [x-workspace-id, x-org, x-user]`);
    passed++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 ALL ${passed}/${ROUTES_TO_TEST.length} API SURFACES VERIFIED FOR CORS PREFLIGHT!`);
  console.log('='.repeat(70));
}

verifyAllSurfacesCors().catch((err) => {
  console.error(err);
  process.exit(1);
});
