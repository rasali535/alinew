import * as dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';

dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config();

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the tenant validation audit.');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for the tenant validation audit.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required for the tenant validation audit.');
}

import { NextRequest } from 'next/server';
import { POST as mariChatPOST } from '../apps/ralion/src/app/api/mari/chat/route';
import { POST as mariBriefingPOST } from '../apps/ralion/src/app/api/mari/briefing/route';
import { GET as mariWebsiteSyncGET } from '../apps/ralion/src/app/api/mari/knowledge/website-sync/route';
import { getServiceSupabase } from '../apps/ralion/src/lib/auth/serverAuth';

async function runApiSecurityTests() {
  console.log('=== MARI API ROUTE TENANT VALIDATION & 403 FORGERY REJECTION AUDIT ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: unknown) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Detail:', detail);
      failed++;
    }
  }

  const supabase = getServiceSupabase();
  const PAMELTEX_ID = process.env.TEST_PAMELTEX_TENANT_ID;
  const RAS_ALI_ID = process.env.TEST_RAS_ALI_TENANT_ID;

  if (!PAMELTEX_ID || !RAS_ALI_ID) {
    throw new Error('TEST_PAMELTEX_TENANT_ID and TEST_RAS_ALI_TENANT_ID are required.');
  }

  // Create a short-lived test identity. Never persist a reusable test password in source.
  const testEmail = `tenant-audit-${Date.now()}@example.invalid`;
  const testPassword = `Audit-${randomBytes(24).toString('base64url')}!`;
  let pameltexToken = '';
  let createdUserId: string | null = null;

  try {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: PAMELTEX_ID,
        workspace_id: PAMELTEX_ID,
        full_name: 'Tenant Security Audit User',
      },
    });

    if (createError || !created.user) {
      throw new Error(createError?.message || 'Unable to create tenant audit user.');
    }
    createdUserId = created.user.id;

    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      throw new Error(signInError.message);
    }

    pameltexToken = signInData.session?.access_token || '';
  } catch (error) {
    console.warn('Could not generate audit JWT:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log(`Pameltex authentic JWT token obtained: ${Boolean(pameltexToken)}`);

  try {
    console.log('\n--- 1. Testing Unauthenticated Private Tenant Forgery ---');
    {
      const req = new NextRequest('http://localhost:3000/api/mari/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': RAS_ALI_ID,
        },
        body: JSON.stringify({ query: 'What is our revenue?', organizationId: RAS_ALI_ID }),
      });

      const res = await mariChatPOST(req);
      const json = await res.json();
      assert(
        res.status === 401 && (json.code === 'AUTHENTICATION_REQUIRED' || json.error === 'AUTHENTICATION_REQUIRED'),
        'Unauthenticated request targeting another tenant is rejected with 401 AUTHENTICATION_REQUIRED',
        { status: res.status, code: json.code || json.error }
      );
    }

    if (pameltexToken) {
      console.log('\n--- 2. Testing Authenticated Tenant Header Forgery ---');
      {
        const req = new NextRequest('http://localhost:3000/api/mari/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pameltexToken}`,
            'x-organization-id': RAS_ALI_ID,
          },
          body: JSON.stringify({ query: 'Tell me about Facebook page', organizationId: PAMELTEX_ID }),
        });
        const res = await mariChatPOST(req);
        const json = await res.json();
        assert(res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH', 'Forged organization header is rejected', { status: res.status, code: json.code });
      }

      console.log('\n--- 3. Testing Authenticated Body Forgery ---');
      {
        const req = new NextRequest('http://localhost:3000/api/mari/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pameltexToken}`,
            'x-organization-id': PAMELTEX_ID,
          },
          body: JSON.stringify({ query: 'Tell me about Facebook page', organizationId: RAS_ALI_ID }),
        });
        const res = await mariChatPOST(req);
        const json = await res.json();
        assert(res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH', 'Forged body organizationId is rejected', { status: res.status, code: json.code });
      }

      console.log('\n--- 4. Testing Authenticated Workspace Forgery ---');
      {
        const req = new NextRequest('http://localhost:3000/api/mari/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pameltexToken}`,
            'x-organization-id': PAMELTEX_ID,
            'x-workspace-id': RAS_ALI_ID,
          },
          body: JSON.stringify({ query: 'What is our strategy?', organizationId: PAMELTEX_ID }),
        });
        const res = await mariChatPOST(req);
        const json = await res.json();
        assert(res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH', 'Forged workspace header is rejected', { status: res.status, code: json.code });
      }

      console.log('\n--- 5. Testing Valid Authenticated Tenant Request ---');
      {
        const req = new NextRequest('http://localhost:3000/api/mari/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pameltexToken}`,
            'x-organization-id': PAMELTEX_ID,
            'x-workspace-id': PAMELTEX_ID,
          },
          body: JSON.stringify({ query: 'What does my Facebook say about us?', organizationId: PAMELTEX_ID }),
        });
        const res = await mariChatPOST(req);
        const json = await res.json();
        assert(res.status === 200 && json.success === true, 'Valid tenant request succeeds', { status: res.status, success: json.success });
        assert(!JSON.stringify(json).includes(RAS_ALI_ID), 'Valid tenant response does not contain the other tenant UUID');
      }

      console.log('\n--- 6. Testing Mari Briefing Route Security ---');
      {
        const req = new NextRequest('http://localhost:3000/api/mari/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pameltexToken}` },
          body: JSON.stringify({ organizationId: RAS_ALI_ID }),
        });
        const res = await mariBriefingPOST(req);
        const json = await res.json();
        assert(res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH', 'Mari Briefing rejects cross-tenant parameter', { status: res.status, code: json.code });
      }

      console.log('\n--- 7. Testing Mari Website Sync Route Security ---');
      {
        const req = new NextRequest(`http://localhost:3000/api/mari/knowledge/website-sync?organizationId=${encodeURIComponent(RAS_ALI_ID)}`, {
          headers: { Authorization: `Bearer ${pameltexToken}` },
        });
        const res = await mariWebsiteSyncGET(req);
        const json = await res.json();
        assert(res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH', 'Mari Website Sync rejects cross-tenant parameter', { status: res.status, code: json.code });
      }
    }
  } finally {
    if (createdUserId) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(createdUserId);
      if (cleanupError) {
        console.warn('Audit user cleanup failed:', cleanupError.message);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`API SECURITY AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runApiSecurityTests().catch((error) => {
  console.error('API security test execution failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
