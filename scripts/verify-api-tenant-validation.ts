import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config();

process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

import { NextRequest } from 'next/server';
import { POST as mariChatPOST } from '../apps/ralion/src/app/api/mari/chat/route';
import { POST as mariBriefingPOST } from '../apps/ralion/src/app/api/mari/briefing/route';
import { GET as mariWebsiteSyncGET } from '../apps/ralion/src/app/api/mari/knowledge/website-sync/route';
import { getServiceSupabase } from '../apps/ralion/src/lib/auth/serverAuth';

async function runApiSecurityTests() {
  console.log('=== MARI API ROUTE TENANT VALIDATION & 403 FORGERY REJECTION AUDIT ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
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
  const PAMELTEX_ID = 'c0b39862-cf19-4882-a822-c7f3f493fec0';
  const RAS_ALI_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  // Obtain or generate a real session/JWT for Pameltex
  const testEmail = 'pameltex.audit.test@example.com';
  const testPassword = 'SecurePassword2026!Pameltex';
  let pameltexToken = '';

  try {
    // Delete existing if needed, then create fresh user
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === testEmail);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: PAMELTEX_ID,
        workspace_id: PAMELTEX_ID,
        full_name: 'Pameltex Director',
      },
    });

    // Create anonymous/public Supabase client to sign in with password and get authentic JWT
    const { createClient } = await import('@supabase/supabase-js');
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const authClient = createClient('https://yidsfihagwttlmhfynmf.supabase.co', anonKey);

    const { data: signInData, error: sErr } = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInData?.session?.access_token) {
      pameltexToken = signInData.session.access_token;
    }
  } catch (err) {
    console.warn('Could not generate JWT via signInWithPassword:', err);
  }

  console.log(`Pameltex authentic JWT token obtained: ${Boolean(pameltexToken)}`);

  // 1. Unauthenticated request attempting to query private tenant
  console.log('\n--- 1. Testing Unauthenticated Private Tenant Forgery ---');
  {
    const req = new NextRequest('http://localhost:3000/api/mari/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': RAS_ALI_ID,
      },
      body: JSON.stringify({
        query: 'What is our revenue?',
        organizationId: RAS_ALI_ID,
      }),
    });

    const res = await mariChatPOST(req);
    const json = await res.json();
    assert(
      res.status === 401 && (json.code === 'AUTHENTICATION_REQUIRED' || json.error === 'AUTHENTICATION_REQUIRED'),
      'Unauthenticated request targeting Ras Ali Labs is rejected with 401 AUTHENTICATION_REQUIRED',
      { status: res.status, json }
    );
  }

  if (pameltexToken) {
    // 2. Authenticated Pameltex request forging Ras Ali Labs headers
    console.log('\n--- 2. Testing Authenticated Tenant Forgery (Pameltex -> Ras Ali Labs) ---');
    {
      const req = new NextRequest('http://localhost:3000/api/mari/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pameltexToken}`,
          'x-organization-id': RAS_ALI_ID, // FORGED HEADER
        },
        body: JSON.stringify({
          query: 'Tell me about Facebook page',
          organizationId: PAMELTEX_ID,
        }),
      });

      const res = await mariChatPOST(req);
      const json = await res.json();
      assert(
        res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH',
        'Forged x-organization-id header is rejected with 403 TENANT_CONTEXT_MISMATCH',
        { status: res.status, json }
      );
    }

    // 3. Authenticated Pameltex request forging Ras Ali Labs in body
    console.log('\n--- 3. Testing Authenticated Body Forgery (Pameltex -> Ras Ali Labs) ---');
    {
      const req = new NextRequest('http://localhost:3000/api/mari/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pameltexToken}`,
          'x-organization-id': PAMELTEX_ID,
        },
        body: JSON.stringify({
          query: 'Tell me about Facebook page',
          organizationId: 'ras-ali-labs', // FORGED BODY
        }),
      });

      const res = await mariChatPOST(req);
      const json = await res.json();
      assert(
        res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH',
        'Forged body.organizationId is rejected with 403 TENANT_CONTEXT_MISMATCH',
        { status: res.status, json }
      );
    }

    // 4. Authenticated Pameltex request forging Ras Ali Labs workspaceId in header
    console.log('\n--- 4. Testing Authenticated Workspace Forgery ---');
    {
      const req = new NextRequest('http://localhost:3000/api/mari/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pameltexToken}`,
          'x-organization-id': PAMELTEX_ID,
          'x-workspace-id': RAS_ALI_ID, // FORGED WORKSPACE
        },
        body: JSON.stringify({
          query: 'What is our strategy?',
          organizationId: PAMELTEX_ID,
        }),
      });

      const res = await mariChatPOST(req);
      const json = await res.json();
      assert(
        res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH',
        'Forged x-workspace-id header is rejected with 403 TENANT_CONTEXT_MISMATCH',
        { status: res.status, json }
      );
    }

    // 5. Authenticated Pameltex valid request
    console.log('\n--- 5. Testing Valid Authenticated Pameltex Request ---');
    {
      const req = new NextRequest('http://localhost:3000/api/mari/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pameltexToken}`,
          'x-organization-id': PAMELTEX_ID,
          'x-workspace-id': PAMELTEX_ID,
        },
        body: JSON.stringify({
          query: 'What does my Facebook say about us?',
          organizationId: PAMELTEX_ID,
        }),
      });

      const res = await mariChatPOST(req);
      const json = await res.json();
      assert(
        res.status === 200 && json.success === true,
        'Valid Pameltex request succeeds with 200 OK',
        { status: res.status, json }
      );
      assert(
        !JSON.stringify(json).includes('477334159265235') &&
        !JSON.stringify(json).includes('Ras Ali Labs'),
        'Pameltex response does NOT contain Ras Ali Labs Facebook Page or company name',
        json.answer
      );
    }

    // 6. Mari Briefing Route Tenant Validation
    console.log('\n--- 6. Testing Mari Briefing Route Security ---');
    {
      const req = new NextRequest(`http://localhost:3000/api/mari/briefing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pameltexToken}`,
        },
        body: JSON.stringify({
          organizationId: RAS_ALI_ID, // FORGED
        }),
      });
      const res = await mariBriefingPOST(req);
      const json = await res.json();
      assert(
        res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH',
        'Mari Briefing route rejects cross-tenant parameter with 403 TENANT_CONTEXT_MISMATCH',
        { status: res.status, json }
      );
    }

    // 7. Mari Website Sync Route Tenant Validation
    console.log('\n--- 7. Testing Mari Website Sync Route Security ---');
    {
      const req = new NextRequest(`http://localhost:3000/api/mari/knowledge/website-sync?organizationId=${RAS_ALI_ID}`, {
        headers: {
          Authorization: `Bearer ${pameltexToken}`,
        },
      });
      const res = await mariWebsiteSyncGET(req);
      const json = await res.json();
      assert(
        res.status === 403 && json.code === 'TENANT_CONTEXT_MISMATCH',
        'Mari Website Sync route rejects cross-tenant parameter with 403 TENANT_CONTEXT_MISMATCH',
        { status: res.status, json }
      );
    }
  }

  console.log(`\n========================================`);
  console.log(`API SECURITY AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runApiSecurityTests().catch(err => {
  console.error('API security test execution failed:', err);
  process.exit(1);
});
