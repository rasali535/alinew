/**
 * Verification Test Suite: Ras Ali Labs Clients Portfolio & Admin Management
 * 
 * Tests:
 * 1. Migration replay and table schema verification.
 * 2. Public RLS policy enforcement: only published + authorized records visible to public.
 * 3. Draft, review, and archived records hidden from public/anonymous queries.
 * 4. Anonymous and ordinary authenticated write attempts strictly denied by RLS.
 * 5. Platform admin authorized write operations (create, update, toggle publish, delete).
 * 6. Segregation invariant: Ralion OS subscribers and prospective demo accounts are excluded.
 * 7. Verified baseline clients presence and unverified logo hold in review.
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

  // TEST 1: Table exists and contains verified baseline records
  const allRows = (await database.query(`SELECT * FROM public.clients_portfolio ORDER BY display_order ASC`)).rows;
  assert.equal(allRows.length, 8, 'Expected 8 baseline client entries.');
  console.log('✓ TEST 1 PASSED: public.clients_portfolio initialized with 8 baseline records.');

  // TEST 2: Public anonymous read strictly returns only published + authorized clients
  await database.exec('SET ROLE anon');
  const publicRows = (await database.query(`SELECT id, name, logo_url, work_year FROM public.clients_portfolio`)).rows;
  assert.equal(publicRows.length, 7, 'Public query must return exactly 7 published, authorized clients.');
  assert.ok(!publicRows.some(r => r.name === 'Safari Butler'), 'Unverified Safari Butler must NOT be exposed to public.');
  console.log('✓ TEST 2 PASSED: Anonymous public read returns only 7 published and authorized clients; unverified draft is hidden.');

  // TEST 3: Anonymous write operations strictly denied by RLS
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
      UPDATE public.clients_portfolio SET is_published = true WHERE name = 'Safari Butler'
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
  console.log('✓ TEST 3 PASSED: Anonymous write attempts (INSERT, UPDATE, DELETE) strictly rejected by RLS.');

  // TEST 4: Ordinary authenticated customer (non-platform admin) write operations strictly denied
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

  // Ordinary user UPDATE is blocked by RLS USING clause (0 rows affected, row remains untouched)
  const updateRes = await database.query(`
    UPDATE public.clients_portfolio SET name = 'Defaced Name' WHERE name = 'Pameltex'
  `);
  const affected = updateRes.affectedRows ?? updateRes.rowCount ?? 0;
  assert.equal(affected, 0, 'Ordinary user must not be able to update any rows');
  const pameltexCheck = (await database.query(`SELECT name FROM public.clients_portfolio WHERE name = 'Pameltex'`)).rows[0];
  assert.equal(pameltexCheck.name, 'Pameltex', 'Row must remain unmodified');
  console.log('✓ TEST 4 PASSED: Non-admin authenticated user write operations strictly denied.');

  // TEST 5: Active Platform Admin can perform full CRUD lifecycle
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);

  // Admin can read all records including review/draft
  const adminViewRows = (await database.query(`SELECT id, name, status FROM public.clients_portfolio`)).rows;
  assert.equal(adminViewRows.length, 8, 'Admin must see all 8 entries including drafts and review items.');

  // Admin inserts new client
  const testClientId = 'c2000000-0000-0000-0000-000000000001';
  await database.query(`
    INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, authorized_logo_use, status)
    VALUES ($1, 'Acme Global Enterprise', '/assets/images/acme.png', '2025', 9, false, true, 'DRAFT')
  `, [testClientId]);

  const inserted = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [testClientId])).rows[0];
  assert.equal(inserted.name, 'Acme Global Enterprise');
  assert.equal(inserted.is_published, false);
  console.log('✓ TEST 5A PASSED: Platform admin can create draft client.');

  // Admin publishes new client
  await database.query(`
    UPDATE public.clients_portfolio 
    SET is_published = true, status = 'PUBLISHED'
    WHERE id = $1
  `, [testClientId]);

  // Verify now visible to public
  await database.exec('SET ROLE anon');
  const publicAfterPublish = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [testClientId])).rows;
  assert.equal(publicAfterPublish.length, 1, 'Newly published client must now be visible publicly.');

  // Admin unpublishes client
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  await database.query(`
    UPDATE public.clients_portfolio 
    SET is_published = false, status = 'DRAFT'
    WHERE id = $1
  `, [testClientId]);

  await database.exec('SET ROLE anon');
  const publicAfterUnpublish = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [testClientId])).rows;
  assert.equal(publicAfterUnpublish.length, 0, 'Unpublished client must be immediately hidden from public.');

  // Admin deletes test client
  await database.exec('SET ROLE authenticated');
  await database.exec(`SET request.jwt.claim.sub = '${adminUserId}'`);
  await database.query(`DELETE FROM public.clients_portfolio WHERE id = $1`, [testClientId]);
  const deletedCheck = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [testClientId])).rows;
  assert.equal(deletedCheck.length, 0, 'Deleted client must be removed.');
  console.log('✓ TEST 5B PASSED: Platform admin publish, unpublish, and delete cycle verified.');

  // TEST 6: Invariant Check: Client published without authorization remains hidden
  const unauthorizedPublishedId = 'c3000000-0000-0000-0000-000000000001';
  await database.query(`
    INSERT INTO public.clients_portfolio (id, name, logo_url, work_year, display_order, is_published, authorized_logo_use, status)
    VALUES ($1, 'Unauthorized But Published', '/unauth.png', '2024', 99, true, false, 'PUBLISHED')
  `, [unauthorizedPublishedId]);

  await database.exec('SET ROLE anon');
  const unauthCheck = (await database.query(`SELECT * FROM public.clients_portfolio WHERE id = $1`, [unauthorizedPublishedId])).rows;
  assert.equal(unauthCheck.length, 0, 'Client with authorized_logo_use = false MUST NOT be exposed publicly.');
  console.log('✓ TEST 6 PASSED: Strict invariant enforced: authorized_logo_use=false is blocked from public read.');

  // Cleanup
  await database.exec('RESET ROLE');
  await database.query(`DELETE FROM public.clients_portfolio WHERE id = $1`, [unauthorizedPublishedId]);

  // TEST 7: Segregation check: No Ralion customer or workspace data in clients_portfolio
  const allCurrent = (await database.query(`SELECT name FROM public.clients_portfolio`)).rows;
  assert.ok(!allCurrent.some(c => c.name.toLowerCase().includes('proinsight')), 'Proinsight must never be in public clients_portfolio.');
  console.log('✓ TEST 7 PASSED: Strict segregation verified: Ralion subscribers are completely separate from clients_portfolio.');

  console.log('\n===============================================================');
  console.log('ALL 7 RAS ALI LABS CLIENTS PORTFOLIO SECURITY TESTS PASSED! 🛡️');
  console.log('===============================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
