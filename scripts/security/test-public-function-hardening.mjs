import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const migration = fs.readFileSync(new URL('../../supabase/migrations/20261006042634_harden_public_function_execution.sql', import.meta.url), 'utf8');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ralion-function-hardening-'));
const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const database = new EmbeddedPostgres({ databaseDir: directory, port, user: 'postgres', password: 'isolated-test', persistent: false, createPostgresUser: process.getuid?.() === 0 });
let client;
try {
  await database.initialise();
  await database.start();
  client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: 'isolated-test', database: 'postgres' });
  await client.connect();
  await client.query(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO PUBLIC;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE public.organization_members (user_id uuid, organization_id uuid);
    INSERT INTO public.organization_members VALUES
      ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021'),
      ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000022');
    CREATE FUNCTION public.get_user_organizations() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() $$;
    CREATE FUNCTION public.has_permission(text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT auth.uid() IS NOT NULL $$;
    CREATE FUNCTION public.has_product_access(text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT auth.uid() IS NOT NULL $$;
    CREATE FUNCTION public.get_org_edition(uuid) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'community'::text $$;
    CREATE FUNCTION public.org_has_feature(uuid,text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
    CREATE FUNCTION public.log_ralion_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
    CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN; END $$;
    CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
    CREATE TABLE public.test_records (organization_id uuid, updated_at timestamptz);
    ALTER TABLE public.test_records ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_records ON public.test_records TO authenticated USING (organization_id IN (SELECT public.get_user_organizations()));
    GRANT SELECT, UPDATE ON public.test_records TO authenticated;
    INSERT INTO public.test_records VALUES ('00000000-0000-0000-0000-000000000021',NULL), ('00000000-0000-0000-0000-000000000022',NULL);
    CREATE TRIGGER audit_row BEFORE UPDATE ON public.test_records FOR EACH ROW EXECUTE FUNCTION public.log_ralion_audit();
    CREATE TRIGGER timestamp_row BEFORE UPDATE ON public.test_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  `);
  await client.query(migration);
  await client.query(migration); // Reapplying must preserve least privilege.
  const scalar = async sql => (await client.query(sql)).rows[0].value;
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar(`SELECT has_schema_privilege('${role}', 'public', 'CREATE') AS value`), false);
  }
  assert.equal(await scalar(`SELECT count(*)::int AS value FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE')`), 0);
  for (const fn of ['handle_new_user()', 'log_ralion_audit()', 'rls_auto_enable()', 'get_org_edition(uuid)', 'org_has_feature(uuid,text)']) {
    assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.${fn}','EXECUTE') AS value`), false);
    assert.equal(await scalar(`SELECT has_function_privilege('service_role','public.${fn}','EXECUTE') AS value`), true);
  }
  await client.query('SET ROLE anon');
  await assert.rejects(client.query('SELECT public.get_user_organizations()'), error => error.code === '42501');
  await assert.rejects(client.query('CREATE TABLE public.attack_object(id int)'), error => error.code === '42501');
  await client.query('RESET ROLE; SET ROLE authenticated');
  await client.query("SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',false)");
  const visible = (await client.query('SELECT organization_id FROM public.test_records')).rows;
  assert.deepEqual(visible, [{ organization_id: '00000000-0000-0000-0000-000000000021' }]);
  assert.equal((await client.query('UPDATE public.test_records SET updated_at = NULL RETURNING updated_at')).rowCount, 1);
  assert.equal(await scalar('SELECT updated_at IS NOT NULL AS value FROM public.test_records'), true);
  await assert.rejects(client.query("SELECT public.get_org_edition('00000000-0000-0000-0000-000000000022')"), error => error.code === '42501');
  await client.query('RESET ROLE');
  // No baseline functions: a fresh preview must still apply without an error.
  await client.query('CREATE DATABASE empty_preview');
  const preview = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: 'isolated-test', database: 'empty_preview' });
  await preview.connect();
  try { await preview.query(migration); } finally { await preview.end(); }
  console.log('PASS: anonymous RPC/DDL denial, authenticated tenant isolation, trigger execution, server access, migration idempotency and empty-preview application.');
} finally {
  await client?.end();
  await database.stop();
  fs.rmSync(directory, { recursive: true, force: true });
}
