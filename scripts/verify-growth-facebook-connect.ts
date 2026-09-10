import * as dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';

dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config();

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the Facebook connect audit.');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for the Facebook connect audit.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required for the Facebook connect audit.');
}

import { NextRequest } from 'next/server';
import { GET } from '../apps/ralion/src/app/api/oauth/[provider]/connect/route';
import { verifyOAuthState } from '@ralion/integrations';
import { getServiceSupabase } from '../apps/ralion/src/lib/auth/serverAuth';
import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

async function runOAuthConnectVerification() {
  console.log('=== VERIFYING GROWTH FACEBOOK CONNECT AUTH + ROUTING ===\n');

  const supabase = getServiceSupabase();
  const TEST_TENANT_ID = process.env.TEST_PAMELTEX_TENANT_ID;
  if (!TEST_TENANT_ID) {
    throw new Error('TEST_PAMELTEX_TENANT_ID is required for the Facebook connect audit.');
  }

  const testEmail = `facebook-connect-audit-${Date.now()}@example.invalid`;
  const testPassword = `Audit-${randomBytes(24).toString('base64url')}!`;
  let testToken = '';
  let testUserId = '';

  try {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: TEST_TENANT_ID,
        workspace_id: TEST_TENANT_ID,
        full_name: 'Facebook Connect Audit User',
      },
    });

    if (createError || !created.user) {
      throw new Error(createError?.message || 'Unable to create Facebook connect audit user.');
    }

    testUserId = created.user.id;

    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) throw new Error(signInError.message);
    testToken = signInData.session?.access_token || '';

    console.log(`Authentic tenant JWT obtained: ${Boolean(testToken)}`);

    console.log('\n--- 1. Testing Unauthenticated Request ---');
    const unauthReq = new NextRequest('https://rasalilabs.com/ralion/api/oauth/facebook/connect?intent=page_connection', {
      method: 'GET',
      headers: {
        host: 'rasalilabs.com',
        origin: 'https://rasalilabs.com',
      },
    });

    const unauthRes = await GET(unauthReq, { params: Promise.resolve({ provider: 'facebook' }) });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    const unauthBody = await unauthRes.json();
    assert.strictEqual(unauthBody.error, 'AUTHENTICATION_REQUIRED', 'Error must be AUTHENTICATION_REQUIRED');
    console.log('✅ PASS: Unauthenticated request is rejected with 401 AUTHENTICATION_REQUIRED');

    console.log('\n--- 2. Testing Authenticated Facebook Connect ---');
    const authReq = new NextRequest('https://rasalilabs.com/ralion/api/oauth/facebook/connect?intent=page_connection', {
      method: 'GET',
      headers: {
        host: 'rasalilabs.com',
        origin: 'https://rasalilabs.com',
        authorization: `Bearer ${testToken}`,
        'x-user-id': testUserId,
        'x-workspace-id': TEST_TENANT_ID,
        'x-organization-id': TEST_TENANT_ID,
      },
    });

    const authRes = await GET(authReq, { params: Promise.resolve({ provider: 'facebook' }) });
    assert.strictEqual(authRes.status, 200, 'Authenticated request must return 200');

    const authBody = await authRes.json();
    assert.strictEqual(authBody.success, true, 'Response must have success: true');
    assert.strictEqual(authBody.provider, 'facebook', 'Provider must be facebook');
    assert(authBody.authorizationUrl, 'Must return authorizationUrl');
    assert(authBody.authorizationUrl.startsWith('https://www.facebook.com/'), 'Auth URL must point to Facebook');
    assert(authBody.stateToken, 'Must return signed stateToken');

    // Do not log the authorization URL or signed state token because both are security-sensitive.
    console.log('✅ PASS: Authenticated request returned a Facebook authorization URL and signed state token');

    console.log('\n--- 3. Verifying Signed OAuth State & Tenant Isolation ---');
    const decodedState = verifyOAuthState(authBody.stateToken);

    assert.strictEqual(decodedState.valid, true, 'State signature must be valid');
    assert.strictEqual(decodedState.userId, testUserId, 'State must contain authenticated userId');
    assert.strictEqual(decodedState.provider, 'facebook', 'State must contain facebook provider');
    assert.strictEqual(decodedState.intent, 'page_connection', 'State must preserve page_connection intent');
    assert.strictEqual(decodedState.organizationId, TEST_TENANT_ID, 'State must preserve organizationId');
    console.log('✅ PASS: Signed OAuth state preserves authenticated tenant context');

    console.log('\n========================================');
    console.log('GROWTH FACEBOOK CONNECT AUDIT: ALL PASSED');
    console.log('========================================');
  } finally {
    if (testUserId) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(testUserId);
      if (cleanupError) {
        console.warn('Facebook connect audit user cleanup failed:', cleanupError.message);
      }
    }
  }
}

runOAuthConnectVerification().catch((error) => {
  console.error('Test failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
