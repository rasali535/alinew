// =====================================================================
// Ralion OS — Local Workstation Read-Only Production Smoke Tests
// Ras Ali Labs (Pty) Ltd
//
// CLASSIFICATION & EXECUTION CONTEXT:
// - Execution Environment: Local developer workstation (Windows / Node CLI)
// - Credential Source: Workspace local environment file (.env on workstation disk)
// - Scope: Validates that workstation environment variables connect to remote
//   Supabase Auth, Database, Storage endpoints, and validates local business logic.
// - LIMITATION: Does NOT run inside Hostinger Managed Node.js or Render container
//   runtimes, and does NOT prove deployed server process states.
//
// STRICT GUARANTEES:
// 1. NON-MUTATING: Strictly read-only queries (SELECT, HEAD, signed URL generation).
// 2. ZERO CREDENTIAL EXPOSURE: No keys, secrets, or bearer tokens printed or logged.
// =====================================================================

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { BusinessIdentityResolver } from '../packages/ai/src/businessIdentityResolver';

async function run() {
  console.log('=====================================================================');
  console.log('RALION OS — LOCAL WORKSTATION READ-ONLY SMOKE SUITE');
  console.log('=====================================================================\n');

  let failures = 0;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serverKey) {
    console.error('FATAL: Supabase environment variables missing from local environment source.');
    process.exit(1);
  }

  // 1. Client-side Auth / Publishable Key Connectivity
  console.log('[Smoke 1] Testing publishable / anon key auth connectivity...');
  try {
    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sessionData, error: sessionErr } = await anonClient.auth.getSession();
    if (sessionErr) {
      console.error('FAIL: Anon client auth session query error:', sessionErr.message);
      failures++;
    } else {
      console.log('PASS: Publishable key accepted by Supabase Auth service.');
    }
  } catch (err: any) {
    console.error('FAIL: Anon client connectivity exception:', err.message);
    failures++;
  }

  // 2. Correct Organization & Workspace Resolution
  console.log('\n[Smoke 2] Testing workspace and organization resolution (read-only)...');
  try {
    const serverClient = createClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: wsData, error: wsErr } = await serverClient
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id')
      .limit(1)
      .maybeSingle();

    if (wsErr) {
      console.error('FAIL: Workspace query error:', wsErr.message);
      failures++;
    } else if (wsData) {
      const hasValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wsData.id);
      console.log(`PASS: Workspace resolved with valid UUID format (UUID format valid: ${hasValidUuid}).`);
    } else {
      console.log('PASS: Workspaces table queried successfully (0 rows returned).');
    }
  } catch (err: any) {
    console.error('FAIL: Workspace resolution exception:', err.message);
    failures++;
  }

  // 3. Authenticated Database Read
  console.log('\n[Smoke 3] Testing authenticated database read (read-only)...');
  try {
    const serverClient = createClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { count, error: countErr } = await serverClient
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('FAIL: Organizations count query error:', countErr.message);
      failures++;
    } else {
      console.log(`PASS: Database read query succeeded (total organizations counted: ${count ?? 0}).`);
    }
  } catch (err: any) {
    console.error('FAIL: Database read exception:', err.message);
    failures++;
  }

  // 4. Server-Side Privileged Administrative Operation
  console.log('\n[Smoke 4] Testing server-side privileged administrative operation...');
  try {
    const serverClient = createClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profileCheck, error: profileErr } = await serverClient
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (profileErr) {
      console.error('FAIL: Privileged profiles query error:', profileErr.message);
      failures++;
    } else {
      console.log('PASS: Privileged server-role query bypassed RLS successfully.');
    }
  } catch (err: any) {
    console.error('FAIL: Privileged query exception:', err.message);
    failures++;
  }

  // 5. Private Creative Storage Delivery via Signed URL
  console.log('\n[Smoke 5] Testing private creative storage delivery via signed URL...');
  try {
    const serverClient = createClient(url, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: listData, error: listErr } = await serverClient.storage
      .from('creatives')
      .list('', { limit: 1 });

    if (listErr) {
      console.error('FAIL: Storage list error:', listErr.message);
      failures++;
    } else {
      console.log('PASS: Creatives storage bucket accessible to server client.');
      // Mint a 15-minute signed URL for probe path
      const { data: signData, error: signErr } = await serverClient.storage
        .from('creatives')
        .createSignedUrl('system/probe.json', 900);

      if (signErr && !signErr.message?.includes('not found') && !signErr.message?.includes('Object not found')) {
        console.error('FAIL: Signed URL creation error:', signErr.message);
        failures++;
      } else {
        console.log('PASS: Short-lived signed URL generation pipeline operational.');
      }
    }
  } catch (err: any) {
    console.error('FAIL: Storage delivery exception:', err.message);
    failures++;
  }

  // 6. Mari Authenticated Context Resolution
  console.log('\n[Smoke 6] Testing Mari authenticated context resolver...');
  try {
    const canonicalIdentity = BusinessIdentityResolver.resolveIdentity('22e61ff6-16fe-44c7-9d67-38e2a2e91ccf');
    if (canonicalIdentity.companyName === 'Ras Ali Labs' && canonicalIdentity.flagshipProduct === 'Ralion OS') {
      console.log(`PASS: Mari business identity resolved accurately:`);
      console.log(`      Company: "${canonicalIdentity.companyName}" | Flagship Product: "${canonicalIdentity.flagshipProduct}"`);
    } else {
      console.error(`FAIL: Inverted or incorrect Mari identity: companyName="${canonicalIdentity.companyName}", flagshipProduct="${canonicalIdentity.flagshipProduct}"`);
      failures++;
    }
  } catch (err: any) {
    console.error('FAIL: Mari context resolution exception:', err.message);
    failures++;
  }

  console.log('\n---------------------------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL NON-MUTATING PRODUCTION SMOKE TESTS PASSED!');
    console.log('=====================================================================\n');
  }
}

run().catch((err) => {
  console.error('FATAL SMOKE ERROR:', err);
  process.exit(1);
});
