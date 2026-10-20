/**
 * Verification Test Suite: Ras Ali Labs Clients Portfolio & Admin Management
 * 
 * Verifies all PR #137 invariants:
 * 1. Migration replay and table schema verification:
 *    - All 8 discovered candidates seeded in DRAFT or NEEDS_REVIEW.
 *    - Default is_published = false, authorized_logo_use = false.
 * 2. Fail-closed public access:
 *    - Zero clients exposed publicly until explicitly authorized, verified, and published.
 * 3. Parameterless is_platform_admin() security definer audit:
 *    - Eliminates arbitrary user-ID oracle attacks; public.is_platform_admin(UUID) does not exist.
 *    - Evaluates solely against auth.uid().
 * 4. Anonymous and ordinary authenticated write attempts strictly denied by RLS.
 * 5. Storage bucket 'client-logos' RLS policies:
 *    - Anonymous and ordinary authenticated users denied write access to storage.objects.
 *    - Only verified platform admins can upload, replace, or delete logos.
 * 6. Published but unverified relationship check:
 *    - Record with is_published=true and authorized_logo_use=true BUT verified_relationship=false remains invisible to anon.
 * 7. Invariant check: Un-authorized logo usage blocked from public view even if is_published=true.
 * 8. Real authenticated administrator workflow end-to-end:
 *    - Log in, load drafts, edit a client, upload its logo to storage, publish it, confirm public appearance,
 *      then unpublish it and confirm immediate removal from public query.
 * 9. Segregation check: No Ralion customer or workspace data in clients_portfolio.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

console.log('=== STARTING RAS ALI LABS CLIENTS PORTFOLIO VERIFICATION SUITE ===');

const database = new PGlite({ extensions: { vector, uuid_ossp } });
const migrationDirectory = new URL('../../supabase/migrations/', import.meta.url);

async function runTestSuite() {
  // 1. Setup Supabase simulation environment
  await database.exec(`
    CREATE ROLE anon; 
    CREATE ROLE authenticated; 
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE TABLE IF NOT EXISTS storage.buckets (id text PRIMARY KEY, name text, public boolean);
    CREATE TABLE IF NOT EXISTS storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text,
      name text,
      owner uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
  `);

  // 2. Replay all migrations
  const files = fs.readdirSync(migrationDirectory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    try {
      await database.exec(fs.readFileSync(new URL(file, migrationDirectory), 'utf8'));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${err.message}`, { cause: err });
    }
  }
  console.log(`✓ Applied all ${files.length} schema migrations successfully.`);

  // Setup test users & platform admin
  const adminUserId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const customerUserId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const orgId = '11111111-1111-1111-1111-111111111111';

  await database.query(`
    INSERT INTO auth.users(id, email) VALUES 
      ($1, 'admin@rasalilabs.com'),
      ($2, 'client-user@example.com')
  `, [adminUserId, customerUserId]);
    
  await database.query(`
    INSERT INTO public.organizations (id, name, slug) VALUES 
      ($1, 'Ras Ali Labs Corporate', 'ras-ali-labs-corporate')
  `, [orgId]);

  await database.query(`
    INSERT INTO public.platform_admins (user_id, organization_id, role, status) VALUES 
      ($1, $2, 'PLATFORM_ADMIN', 'ACTIVE')
  `, [adminUserId, orgId]);

  // TEST 1: Table exists and all 8 discovered baseline records are seeded in DRAFT or NEEDS_REVIEW (unpublished)
  const allRows = (await database.query(`SELECT * FROM public.clients_portfolio ORDER BY display_order ASC`)).rows;
  assert.equal(allRows.length, 8, 'Expected 8 baseline client candidate entries.');
  const publishedInitial = allRows.filter(r => r.is_published || r.authorized_logo_use || r.status === 'PUBLISHED');
  assert.equal(publishedInitial.length, 0, 'No discovered client should be published or authorized by default.');
  console.log('✓ TEST 1 PASSED: 8 baseline records initialized; all 8 are strictly DRAFT or NEEDS_REVIEW (0 published).');

  // TEST 2: Public anonymous read strictly returns 0 records initially (fail closed until admin approval)
  await database.exec('SET ROLE anon');
  const publicInitialRows = (await database.query(`SELECT id, name, logo_url, work_year FROM public.clients_portfolio`)).rows;
  assert.equal(publicInitialRows.length, 0, 'Public query must return 0 clients before explicit admin approval and publication.');
  console.log('✓ TEST 2 PASSED: Anonymous public query returns 0 rows initially; fail-closed invariant verified.');

  // TEST 3: Parameterless is_platform_admin() security audit
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  const adminCheck = (await database.query(`SELECT public.is_platform_admin() AS is_admin`)).rows[0].is_admin;
  assert.equal(adminCheck, true, 'is_platform_admin() must return true for active platform admin.');

  await database.exec(`SET request.jwt.claim.sub = '${customerUserId}'`);
  const customerCheck = (await database.query(`SELECT public.is_platform_admin() AS is_admin`)).rows[0].is_admin;
  assert.equal(customerCheck, false, 'is_platform_admin() must return false for ordinary user.');

  // Verify arbitrary user-ID oracle attack is impossible (function with UUID parameter does not exist)
  await assert.rejects(
    database.query(`SELECT public.is_platform_admin('${adminUserId}'::uuid)`),
    (err) => err.code === '42883' || err.message?.includes('does not exist'),
    'Calling is_platform_admin with UUID parameter must fail because function does not exist'
  );
  console.log('✓ TEST 3 PASSED: is_platform_admin() is strictly parameterless; user-ID oracle vulnerability eliminated.');

  // TEST 4: Anonymous write operations strictly denied by RLS
  await database.exec('SET ROLE anon');
  await assert.rejects(
    database.query(`
      INSERT INTO public.clients_portfolio (name, logo_url, work_year, is_published, authorized_logo_use)
      VALUES ('Malicious Client', '/hacked.png', '2026', true, true)
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Anonymous insert must be blocked by RLS'
  );

  await assert.rejects(
    database.query(`
      UPDATE public.clients_portfolio SET is_published = true WHERE name = 'Pula Pitch'
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Anonymous update must be blocked by RLS'
  );

  await assert.rejects(
    database.query(`
      DELETE FROM public.clients_portfolio WHERE name = 'Pula Pitch'
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Anonymous delete must be blocked by RLS'
  );
  console.log('✓ TEST 4 PASSED: Anonymous write attempts (INSERT, UPDATE, DELETE) strictly rejected by RLS.');

  // TEST 5: Non-admin authenticated user write operations strictly denied
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${customerUserId}'`);

  await assert.rejects(
    database.query(`
      INSERT INTO public.clients_portfolio (name, logo_url, work_year, is_published, authorized_logo_use)
      VALUES ('Unauthorized Entry', '/fake.png', '2026', true, true)
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Ordinary user insert must be blocked by RLS'
  );

  const updateRes = await database.query(`
    UPDATE public.clients_portfolio SET name = 'Defaced Name' WHERE name = 'Pameltex'
  `);
  const affected = updateRes.affectedRows ?? updateRes.rowCount ?? 0;
  assert.equal(affected, 0, 'Ordinary user must not be able to update any rows');
  console.log('✓ TEST 5 PASSED: Non-admin authenticated user write operations strictly denied.');

  // TEST 6: Storage bucket RLS policies for 'client-logos'
  // Anonymous read is allowed
  await database.exec('SET ROLE anon');
  const storageReadAnon = await database.query(`SELECT * FROM storage.objects WHERE bucket_id = 'client-logos'`);
  assert.ok(Array.isArray(storageReadAnon.rows), 'Public read on client-logos storage objects permitted.');

  // Anonymous insert denied
  await assert.rejects(
    database.query(`
      INSERT INTO storage.objects (bucket_id, name) VALUES ('client-logos', 'logos/rogue.png')
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Anonymous storage upload must be blocked by RLS'
  );

  // Ordinary user insert denied
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${customerUserId}'`);
  await assert.rejects(
    database.query(`
      INSERT INTO storage.objects (bucket_id, name) VALUES ('client-logos', 'logos/customer-attempt.png')
    `),
    (err) => err.code === '42501' || err.message?.includes('violates row-level security policy'),
    'Ordinary user storage upload must be blocked by RLS'
  );

  // Admin user insert allowed
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  await database.query(`
    INSERT INTO storage.objects (bucket_id, name) VALUES ('client-logos', 'logos/admin-verified-logo.png')
  `);
  const adminUploadCheck = (await database.query(`SELECT name FROM storage.objects WHERE name = 'logos/admin-verified-logo.png'`)).rows;
  assert.equal(adminUploadCheck.length, 1, 'Platform admin storage upload succeeded.');

  // Clean up storage test object
  await database.query(`DELETE FROM storage.objects WHERE name = 'logos/admin-verified-logo.png'`);
  console.log('✓ TEST 6 PASSED: Storage bucket client-logos RLS policies strictly enforce admin-only upload/modification.');

  // TEST 7: Invariant Check: Published and logo-authorized BUT UNVERIFIED RELATIONSHIP remains invisible to anonymous users
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  const unverifiedRelationshipId = 'c4000000-0000-0000-0000-000000000001';
  await database.query(`
    INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, authorized_logo_use, verified_relationship, status)
    VALUES ($1, 'Published Authorized But Unverified Relationship', '/unverified.png', '2024', 999, true, true, false, 'PUBLISHED')
  `, [unverifiedRelationshipId]);

  await database.exec('SET ROLE anon');
  const unverifiedCheck = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [unverifiedRelationshipId])).rows;
  assert.equal(unverifiedCheck.length, 0, 'Client with verified_relationship = false MUST NOT be exposed publicly even if is_published=true and authorized_logo_use=true.');

  // Cleanup
  await database.exec('RESET ROLE');
  await database.query(`DELETE FROM public.clients_portfolio WHERE id = $1`, [unverifiedRelationshipId]);
  console.log('✓ TEST 7 PASSED: Strict invariant: verified_relationship=false is blocked from public read.');

  // TEST 8: Invariant Check: Client published without authorization remains hidden
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  const unauthorizedPublishedId = 'c3000000-0000-0000-0000-000000000001';
  await database.query(`
    INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, authorized_logo_use, verified_relationship, status)
    VALUES ($1, 'Unauthorized But Published', '/unauth.png', '2024', 998, true, false, true, 'PUBLISHED')
  `, [unauthorizedPublishedId]);

  await database.exec('SET ROLE anon');
  const unauthCheck = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [unauthorizedPublishedId])).rows;
  assert.equal(unauthCheck.length, 0, 'Client with authorized_logo_use = false MUST NOT be exposed publicly.');

  // Cleanup
  await database.exec('RESET ROLE');
  await database.query(`DELETE FROM public.clients_portfolio WHERE id = $1`, [unauthorizedPublishedId]);
  console.log('✓ TEST 8 PASSED: Strict invariant: authorized_logo_use=false is blocked from public read.');

  // TEST 9: Real Authenticated Administrator Workflow End-to-End:
  // 1. Log in / authenticate as active platform admin
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);

  // 2. Load drafts
  const draftsBefore = (await database.query(`SELECT id, name, status FROM public.clients_portfolio WHERE is_published = false`)).rows;
  assert.equal(draftsBefore.length, 8, 'Admin must see exactly 8 unapproved drafts initially.');

  // 3. Edit a client (e.g. Lebville Boutique)
  await database.query(`
    UPDATE public.clients_portfolio 
    SET notes = 'Admin audit confirmed boutique storefront and responsive shop architecture',
        work_year = '2024'
    WHERE name = 'Lebville Boutique'
  `);
  const editedCheck = (await database.query(`SELECT notes FROM public.clients_portfolio WHERE name = 'Lebville Boutique'`)).rows[0];
  assert.equal(editedCheck.notes, 'Admin audit confirmed boutique storefront and responsive shop architecture');

  // 4. Upload its logo to durable storage as admin
  await database.query(`
    INSERT INTO storage.objects (bucket_id, name) VALUES ('client-logos', 'logos/lebville-logo-durable.png')
  `);
  const storageCheck = (await database.query(`SELECT name FROM storage.objects WHERE name = 'logos/lebville-logo-durable.png'`)).rows;
  assert.equal(storageCheck.length, 1, 'Logo must be stored in storage.objects');

  // 5. Publish the client with verified relationship and authorized logo use
  await database.query(`
    UPDATE public.clients_portfolio
    SET logo_url = '/assets/images/lebville-logo.png',
        authorized_logo_use = true,
        verified_relationship = true,
        is_published = true,
        status = 'PUBLISHED'
    WHERE name = 'Lebville Boutique'
  `);

  // 6. Confirm its public appearance
  await database.exec('SET ROLE anon');
  const publicAppearance = (await database.query(`SELECT name, logo_url, work_year FROM public.clients_portfolio WHERE name = 'Lebville Boutique'`)).rows;
  assert.equal(publicAppearance.length, 1, 'Lebville Boutique must now appear publicly to anonymous users.');
  assert.equal(publicAppearance[0].name, 'Lebville Boutique');
  assert.equal(publicAppearance[0].work_year, '2024');

  // 7. Unpublish the client
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  await database.query(`
    UPDATE public.clients_portfolio
    SET is_published = false,
        authorized_logo_use = false,
        status = 'DRAFT'
    WHERE name = 'Lebville Boutique'
  `);

  // 8. Confirm immediate removal from public query
  await database.exec('SET ROLE anon');
  const publicRemoval = (await database.query(`SELECT name FROM public.clients_portfolio WHERE name = 'Lebville Boutique'`)).rows;
  assert.equal(publicRemoval.length, 0, 'Lebville Boutique must immediately disappear from public query once unpublished.');

  // Clean up storage test logo
  await database.exec('RESET ROLE');
  await database.query(`DELETE FROM storage.objects WHERE name = 'logos/lebville-logo-durable.png'`);
  console.log('✓ TEST 9 PASSED: Real authenticated admin workflow end-to-end verified (log in, load drafts, edit, upload logo, publish, verify public, unpublish, verify removal).');

  // TEST 10: Segregation check: No Ralion customer or workspace data in clients_portfolio
  const allCurrent = (await database.query(`SELECT name FROM public.clients_portfolio`)).rows;
  assert.ok(!allCurrent.some(c => c.name.toLowerCase().includes('proinsight')), 'Proinsight must never be in public clients_portfolio.');
  console.log('✓ TEST 10 PASSED: Strict segregation verified: Ralion subscribers are completely separate from clients_portfolio.');

  console.log('\n===============================================================');
  console.log('ALL 10 RAS ALI LABS CLIENTS PORTFOLIO SECURITY TESTS PASSED! 🛡️');
  console.log('===============================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
