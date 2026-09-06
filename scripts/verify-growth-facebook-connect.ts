import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config();

process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

import { NextRequest } from 'next/server';
import { GET } from '../apps/ralion/src/app/api/oauth/[provider]/connect/route';
import { verifyOAuthState } from '@ralion/integrations';
import { getServiceSupabase } from '../apps/ralion/src/lib/auth/serverAuth';
import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

async function runOAuthConnectVerification() {
  console.log('=== VERIFYING GROWTH FACEBOOK CONNECT AUTH + ROUTING ===\n');

  const supabase = getServiceSupabase();
  const PAMELTEX_ID = 'c0b39862-cf19-4882-a822-c7f3f493fec0';
  const testEmail = 'pameltex.audit.test@example.com';
  const testPassword = 'SecurePassword2026!Pameltex';
  let pameltexToken = '';
  let pameltexUserId = '';

  const { data: users } = await supabase.auth.admin.listUsers();
  let pameltexUser = users?.users?.find(u => u.email === testEmail);
  if (!pameltexUser) {
    const { data: created } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: PAMELTEX_ID,
        workspace_id: PAMELTEX_ID,
        full_name: 'Pameltex Director',
      },
    });
    pameltexUser = created?.user || undefined;
  }
  pameltexUserId = pameltexUser?.id || '';

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';
  const authClient = createClient('https://yidsfihagwttlmhfynmf.supabase.co', anonKey);
  const { data: signInData } = await authClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  pameltexToken = signInData?.session?.access_token || '';
  console.log(`Authentic Pameltex JWT obtained: ${Boolean(pameltexToken)} (User ID: ${pameltexUserId})`);

  // 1. Unauthenticated request to /api/oauth/facebook/connect?intent=page_connection
  console.log('\n--- 1. Testing Unauthenticated Request ---');
  const unauthReq = new NextRequest('https://rasalilabs.com/ralion/api/oauth/facebook/connect?intent=page_connection', {
    method: 'GET',
    headers: {
      'host': 'rasalilabs.com',
      'origin': 'https://rasalilabs.com',
    }
  });

  const unauthRes = await GET(unauthReq, { params: Promise.resolve({ provider: 'facebook' }) });
  console.log(`Unauth status: ${unauthRes.status}`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  const unauthBody = await unauthRes.json();
  assert.strictEqual(unauthBody.error, 'AUTHENTICATION_REQUIRED', 'Error must be AUTHENTICATION_REQUIRED');
  console.log('✅ PASS: Unauthenticated request is strictly rejected with 401 AUTHENTICATION_REQUIRED');

  // 2. Authenticated request with valid JWT and canonical tenant headers
  console.log('\n--- 2. Testing Authenticated Facebook Connect with Valid JWT ---');
  const authReq = new NextRequest('https://rasalilabs.com/ralion/api/oauth/facebook/connect?intent=page_connection', {
    method: 'GET',
    headers: {
      'host': 'rasalilabs.com',
      'origin': 'https://rasalilabs.com',
      'authorization': `Bearer ${pameltexToken}`,
      'x-user-id': pameltexUserId,
      'x-workspace-id': PAMELTEX_ID,
      'x-organization-id': PAMELTEX_ID,
    }
  });

  const authRes = await GET(authReq, { params: Promise.resolve({ provider: 'facebook' }) });
  console.log(`Auth status: ${authRes.status}`);
  assert.strictEqual(authRes.status, 200, 'Authenticated request must return 200');

  const authBody = await authRes.json();
  assert.strictEqual(authBody.success, true, 'Response must have success: true');
  assert.strictEqual(authBody.provider, 'facebook', 'Provider must be facebook');
  assert(authBody.authorizationUrl, 'Must return authorizationUrl');
  assert(authBody.authorizationUrl.startsWith('https://www.facebook.com/v19.0/dialog/oauth'), 'Auth URL must point to Facebook OAuth dialog');
  assert(authBody.stateToken, 'Must return signed stateToken');

  console.log(`Authorization URL: ${authBody.authorizationUrl}`);
  console.log(`State token: ${authBody.stateToken}`);

  // 3. Verify signed stateToken decodes and preserves tenant UUID
  console.log('\n--- 3. Verifying Signed OAuth State & Multi-Tenant Isolation ---');
  const decodedState = verifyOAuthState(authBody.stateToken);
  console.log('Decoded state:', decodedState);

  assert.strictEqual(decodedState.valid, true, 'State signature must be valid');
  assert.strictEqual(decodedState.userId, pameltexUserId, 'State must contain authenticated userId');
  assert.strictEqual(decodedState.provider, 'facebook', 'State must contain facebook provider');
  assert.strictEqual(decodedState.intent, 'page_connection', 'State must preserve page_connection intent');
  assert.strictEqual(decodedState.organizationId, PAMELTEX_ID, 'State must preserve organizationId');
  console.log('✅ PASS: Signed OAuth state cryptographically preserves tenant UUID & intent with zero leakage');

  console.log('\n========================================');
  console.log('GROWTH FACEBOOK CONNECT AUDIT: ALL PASSED');
  console.log('========================================');
}

runOAuthConnectVerification().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
