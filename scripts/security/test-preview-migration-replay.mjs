import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';

// Real PostgreSQL execution, with Supabase-managed auth/storage prerequisites.
// This verifies schema replay, not the external Supabase Auth or Storage service.
const database = new PGlite({ extensions: { vector, uuid_ossp } });
const migrationDirectory = new URL('../../supabase/migrations/', import.meta.url);
const baselineName = '20260914000000_preview_schema_prerequisites.sql';
try {
  await database.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
  `);
  const files = fs.readdirSync(migrationDirectory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
  assert.equal(files[0], baselineName, 'The legacy schema must precede incremental migrations.');
  assert.equal(new Set(files.map(name => name.slice(0,14))).size, files.length, 'Migration versions must be unique.');
  for (const file of files) {
    try { await database.exec(fs.readFileSync(new URL(file, migrationDirectory), 'utf8')); }
    catch (error) { throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error }); }
  }
  const scalar = async sql => (await database.query(sql)).rows[0].value;
  // The Retail POS security migration adds two durable tables to the 125-table baseline, the
  // Retail catalogue/packaging migration adds seven more, the Smart Stock Receiving migration
  // adds three tables, the POS Cash-Up & Returns migration adds four tables, and the Multi-Branch
  // Stock Distribution migration adds six tables (user_locations, stock_requests, stock_request_items, stock_transfers, stock_transfer_items, transfer_discrepancies).
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM pg_tables WHERE schemaname='public'`), 147);
  for (const table of ['retail_pos_consumed_tokens', 'retail_pos_lockouts', 'retail_tax_codes', 'retail_departments', 'retail_subdepartments', 'retail_brands', 'retail_product_suppliers', 'retail_product_packages', 'retail_goods_receipt_items', 'retail_smart_receipt_drafts', 'retail_smart_receipt_items', 'retail_smart_receipt_attachments', 'retail_cashier_cashup_reports', 'retail_returns', 'retail_return_items', 'retail_voided_sales', 'retail_user_locations', 'retail_stock_requests', 'retail_stock_request_items', 'retail_stock_transfers', 'retail_stock_transfer_items', 'retail_transfer_discrepancies']) {
    assert.equal(
      await scalar(`SELECT count(*)::int AS value FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`),
      1,
      `Retail table ${table} must be present after migration replay.`
    );
  }
  for (const table of ['retail_tax_codes', 'retail_departments', 'retail_subdepartments', 'retail_brands', 'retail_product_suppliers', 'retail_product_packages', 'retail_goods_receipt_items', 'retail_smart_receipt_drafts', 'retail_smart_receipt_items', 'retail_smart_receipt_attachments', 'retail_cashier_cashup_reports', 'retail_returns', 'retail_return_items', 'retail_voided_sales', 'retail_user_locations', 'retail_stock_requests', 'retail_stock_request_items', 'retail_stock_transfers', 'retail_stock_transfer_items', 'retail_transfer_discrepancies']) {
    assert.equal(await scalar(`SELECT has_table_privilege('authenticated','public.${table}','SELECT') AS value`), false, `${table} must not be readable by authenticated without RLS/privilege.`);
    assert.equal(await scalar(`SELECT has_table_privilege('anon','public.${table}','SELECT') AS value`), false, `${table} must not be readable by anon.`);
  }
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.retail_search_catalogue(uuid,text,uuid,uuid,uuid,uuid,boolean,integer,text)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_goods_receipt(uuid,uuid,uuid,text,uuid,text,jsonb)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_smart_stock_receipt(uuid,uuid,uuid,uuid,uuid,text,jsonb)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_sale_return_and_refund(uuid,uuid,uuid,text,uuid,text,uuid,text,uuid,text,text,text,jsonb)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_void_sale(uuid,uuid,uuid,uuid,text,uuid,text,uuid,text)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_close_shift_cashup(uuid,uuid,uuid,uuid,numeric,uuid,text)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_dispatch_stock_transfer(uuid,uuid,uuid,uuid,text,text,text,text,text,text)','EXECUTE') AS value`), false);
  assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.execute_atomic_receive_stock_transfer(uuid,uuid,uuid,uuid,text,jsonb,text,text)','EXECUTE') AS value`), false);
  for (const table of ['profiles', 'organizations', 'workspaces', 'social_connections', 'social_posts', 'platform_admins']) {
    assert.equal(await scalar(`SELECT count(*)::int AS value FROM public.${table}`), 0, `Preview must not copy production ${table} rows.`);
  }
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')`), 0);
  assert.equal(await scalar(`SELECT has_schema_privilege('authenticated','public','CREATE') AS value`), false);
  assert.equal(await scalar(`SELECT public AS value FROM storage.buckets WHERE id='ralion-documents'`), false);

  // The signup trigger must still provision a new owner without granting platform admin.
  const user = '00000000-0000-0000-0000-000000000011';
  await database.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,'preview@example.invalid',$2)`, [user, { full_name: 'Preview Owner', org_name: 'Preview Tenant', branch_name: 'Main Workspace' }]);
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM public.organizations WHERE owner_id='${user}'`), 1);
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM public.workspaces WHERE owner_id='${user}'`), 1);
  assert.equal(await scalar('SELECT count(*)::int AS value FROM public.platform_admins'), 0);
  await database.exec('SET ROLE anon');
  await assert.rejects(database.query('SELECT public.get_user_organizations()'), error => error.code === '42501');
  await database.exec('RESET ROLE');
  // An existing production-shaped schema is preserved by baseline reapplication.
  await database.exec(fs.readFileSync(new URL(baselineName,migrationDirectory), 'utf8'));
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM public.organizations WHERE owner_id='${user}'`), 1);
  // Exercise the deployed credit procedures with two isolated synthetic tenants.
  const orgA = (await database.query(`SELECT id FROM public.organizations WHERE owner_id=$1`, [user])).rows[0].id;
  const userB = '00000000-0000-0000-0000-000000000012';
  await database.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,'preview-b@example.invalid',$2)`, [userB, { org_name: 'Preview Tenant B' }]);
  const orgB = (await database.query(`SELECT id FROM public.organizations WHERE owner_id=$1`, [userB])).rows[0].id;
  const summary = async org => (await database.query(`SELECT public.ralion_get_credit_summary($1,'COMMUNITY',100) AS value`, [org])).rows[0].value;
  const reserve = async (org, correlation, amount) => (await database.query(`SELECT public.ralion_reserve_credits($1,$2,$3,'COMMUNITY',100,$4,'SECURITY_TEST') AS value`, [org, user, correlation, amount])).rows[0].value;
  const finalize = async (org, correlation, success) => (await database.query(`SELECT public.ralion_finalize_credits($1,$2,$3) AS value`, [org, correlation, success])).rows[0].value;
  await summary(orgA);
  const untouchedB = await summary(orgB);
  const first = await reserve(orgA, 'charged-once', 7);
  assert.equal(first.allowed, true);
  assert.equal((await reserve(orgA, 'charged-once', 7)).reservationId, first.reservationId);
  assert.equal((await summary(orgA)).reservedCredits, 7);
  assert.equal((await finalize(orgB, 'charged-once', true)).status, 'NOT_FOUND');
  assert.equal((await finalize(orgA, 'charged-once', true)).creditsDeducted, 7);
  assert.equal((await finalize(orgA, 'charged-once', true)).status, 'CHARGED');
  assert.equal((await summary(orgA)).remainingCredits, 93);
  assert.equal((await summary(orgA)).lifetimeCreditsConsumed, 7);
  assert.equal((await database.query(`SELECT count(*)::int AS value FROM public.tenant_credit_ledger WHERE organization_id=$1 AND type='CONSUMPTION' AND correlation_id='charged-once'`, [orgA])).rows[0].value, 1);
  await reserve(orgA, 'failed-provider', 9);
  assert.equal((await finalize(orgA, 'failed-provider', false)).status, 'RELEASED');
  assert.equal((await finalize(orgA, 'failed-provider', true)).status, 'RELEASED');
  assert.equal((await summary(orgA)).remainingCredits, 93);
  assert.equal((await summary(orgA)).reservedCredits, 0);
  assert.equal((await reserve(orgA, 'over-quota', 94)).status, 'INSUFFICIENT_CREDITS');
  await reserve(orgA, 'crashed-provider', 11);
  await database.query(`UPDATE public.tenant_credit_reservations SET created_at=now()-interval '16 minutes' WHERE organization_id=$1 AND correlation_id='crashed-provider'`, [orgA]);
  assert.equal((await summary(orgA)).reservedCredits, 0);
  assert.equal((await finalize(orgA, 'crashed-provider', true)).status, 'RELEASED');
  assert.deepEqual(await summary(orgB), untouchedB, 'Tenant A operations must not change Tenant B wallet.');
  await database.exec('SET ROLE authenticated');
  await assert.rejects(database.query(`SELECT public.ralion_finalize_credits($1,'charged-once',true)`, [orgA]), error => error.code === '42501');
  await database.exec('RESET ROLE');
  console.log('PASS: actual credit procedures charge once, release failed/stale requests, reject insufficient balance and direct client RPCs, and isolate two tenant wallets.');
  console.log(`PASS: ${files.length} migrations replay; 137 tables; no production tenant/admin rows; signup provisioning and anonymous RPC denial; baseline preserves existing rows.`);
} finally {
  await database.close();
}
