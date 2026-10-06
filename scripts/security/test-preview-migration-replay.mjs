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
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM pg_tables WHERE schemaname='public'`), 97);
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
  console.log(`PASS: ${files.length} migrations replay; 97 tables; no production tenant/admin rows; signup provisioning and anonymous RPC denial; baseline preserves existing rows.`);
} finally {
  await database.close();
}
