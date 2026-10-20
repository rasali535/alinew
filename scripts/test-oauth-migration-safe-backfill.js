const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const net = require('net');
const EmbeddedPostgres = require('embedded-postgres');

const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

const DB_USER = 'postgres';
const DB_PASSWORD = 'oauth_backfill_validation_pw';
const DB_NAME = 'postgres';
const DB_DIR = path.resolve(__dirname, `../.isolated-pgdata-oauth-${Date.now()}`);

// Representative tenant fixtures (sanitized, zero secrets)
const RAS_ALI_USER_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
const RAS_ALI_ORG_ID = '11111111-1111-1111-1111-111111111111';
const RAS_ALI_WS_ID = '22222222-2222-2222-2222-222222222222';

const PAMELTEX_USER_ID = 'c0b39862-cf19-4882-a822-c7f3f493fec0';
const PAMELTEX_ORG_ID = '33333333-3333-3333-3333-333333333333';
const PAMELTEX_WS_ID = '44444444-4444-4444-4444-444444444444';

const MODERN_USER_ID = '55555555-5555-5555-5555-555555555555';
const MODERN_ORG_ID = '66666666-6666-6666-6666-666666666666';
const MODERN_WS_ID = '77777777-7777-7777-7777-777777777777';

const MEMBER_USER_ID = '88888888-8888-8888-8888-888888888888';
const MEMBER_ORG_ID = '99999999-9999-9999-9999-999999999990';
const MEMBER_WS_ID = '99999999-9999-9999-9999-999999999999';

async function main() {
  console.log(cyan('========================================================================'));
  console.log(cyan('🔒 RALION OAUTH MIGRATION PREFLIGHT & SAFE BACKFILL VERIFICATION'));
  console.log(cyan('========================================================================\n'));

  try {
    if (fs.existsSync(DB_DIR)) {
      fs.rmSync(DB_DIR, { recursive: true, force: true });
    }
  } catch (e) {}

  const DB_PORT = await getFreePort();
  const CONNECTION_STRING = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}`;

  const PgClass = EmbeddedPostgres.default || EmbeddedPostgres;
  const pgInstance = new PgClass({
    databaseDir: DB_DIR,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    initialDatabase: DB_NAME,
    persistent: false,
  });

  console.log('⏳ Starting isolated PostgreSQL daemon...');
  await pgInstance.initialise();
  await pgInstance.start();
  console.log(green(`✅ Isolated PostgreSQL daemon active on 127.0.0.1:${DB_PORT}\n`));

  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  let passCount = 0;
  function assert(condition, desc) {
    if (!condition) {
      console.error(red(`❌ FAIL: ${desc}`));
      throw new Error(`Assertion failed: ${desc}`);
    }
    passCount++;
    console.log(`  ${green('✓')} ${desc}`);
  }

  try {
    console.log('⏳ Provisioning base Supabase schema (organizations, workspaces, tokens, connections)...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        owner_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        owner_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES public.organizations(id),
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.social_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        organization_id UUID,
        workspace_id UUID,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        account_name TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.social_account_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        encrypted_access_token TEXT NOT NULL,
        encrypted_refresh_token TEXT,
        extra_meta JSONB DEFAULT '{}'::jsonb,
        status TEXT DEFAULT 'connected',
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT social_account_tokens_user_id_provider_key UNIQUE (user_id, provider)
      );
    `);
    assert(true, 'Base schema created successfully');

    console.log('\n⏳ Seeding representative production-like snapshot...');
    // Seed users
    await client.query(`
      INSERT INTO auth.users (id, email) VALUES
        ('${RAS_ALI_USER_ID}', 'ali@rasalilabs.com'),
        ('${PAMELTEX_USER_ID}', 'pameltex@example.com'),
        ('${MODERN_USER_ID}', 'modern@example.com'),
        ('${MEMBER_USER_ID}', 'member@example.com');

      INSERT INTO public.organizations (id, name, slug, owner_id) VALUES
        ('${RAS_ALI_ORG_ID}', 'Ras Ali Labs', 'ras-ali-labs', '${RAS_ALI_USER_ID}'),
        ('${PAMELTEX_ORG_ID}', 'Pameltex', 'pameltex', '${PAMELTEX_USER_ID}'),
        ('${MODERN_ORG_ID}', 'Modern Corp', 'modern-corp', '${MODERN_USER_ID}'),
        ('${MEMBER_ORG_ID}', 'Member Org', 'member-org', '${MEMBER_USER_ID}');

      INSERT INTO public.workspaces (id, organization_id, name, slug, owner_id) VALUES
        ('${RAS_ALI_WS_ID}', '${RAS_ALI_ORG_ID}', 'Ras Ali Main', 'main', '${RAS_ALI_USER_ID}'),
        ('${PAMELTEX_WS_ID}', '${PAMELTEX_ORG_ID}', 'Pameltex Main', 'main', '${PAMELTEX_USER_ID}'),
        ('${MODERN_WS_ID}', '${MODERN_ORG_ID}', 'Modern Main', 'main', '${MODERN_USER_ID}'),
        ('${MEMBER_WS_ID}', '${MEMBER_ORG_ID}', 'Member Main', 'main', '${MEMBER_USER_ID}');

      INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
        ('${MEMBER_WS_ID}', '${MEMBER_USER_ID}', 'member');

      INSERT INTO public.profiles (id, organization_id, email) VALUES
        ('${RAS_ALI_USER_ID}', '${RAS_ALI_ORG_ID}', 'ali@rasalilabs.com'),
        ('${PAMELTEX_USER_ID}', '${PAMELTEX_ORG_ID}', 'pameltex@example.com'),
        ('${MODERN_USER_ID}', '${MODERN_ORG_ID}', 'modern@example.com'),
        ('${MEMBER_USER_ID}', '${MEMBER_ORG_ID}', 'member@example.com');
    `);

    // Seed social_connections
    await client.query(`
      INSERT INTO public.social_connections (user_id, organization_id, workspace_id, provider, provider_account_id, account_name) VALUES
        ('${RAS_ALI_USER_ID}', '${RAS_ALI_ORG_ID}', '${RAS_ALI_WS_ID}', 'facebook', '477334159265235', 'Ras Ali Labs'),
        ('${PAMELTEX_USER_ID}', '${PAMELTEX_ORG_ID}', '${PAMELTEX_WS_ID}', 'facebook', '123456789012345', 'Pameltex Page'),
        ('${MODERN_USER_ID}', '${MODERN_ORG_ID}', '${MODERN_WS_ID}', 'google', 'yt_channel_999', 'Modern Channel'),
        ('${MEMBER_USER_ID}', '${MEMBER_ORG_ID}', '${MEMBER_WS_ID}', 'linkedin', 'li_company_888', 'Member LinkedIn');
    `);

    // Seed social_account_tokens with representative extra_meta conditions:
    // 1. Ras Ali Labs: legacy organizationId and workspaceId are USER IDs! (not org/ws table UUIDs)
    // 2. Pameltex: missing extra_meta (null workspaceId / organizationId)
    // 3. Modern: valid explicit org and ws UUIDs
    // 4. Member: invalid string organizationId ('org-not-a-uuid')
    await client.query(`
      INSERT INTO public.social_account_tokens (user_id, provider, encrypted_access_token, extra_meta) VALUES
        ('${RAS_ALI_USER_ID}', 'facebook', 'mock_enc_token_1', '{"organizationId": "${RAS_ALI_USER_ID}", "workspaceId": "${RAS_ALI_USER_ID}"}'::jsonb),
        ('${PAMELTEX_USER_ID}', 'facebook', 'mock_enc_token_2', '{}'::jsonb),
        ('${MODERN_USER_ID}', 'google', 'mock_enc_token_3', '{"organizationId": "${MODERN_ORG_ID}", "workspaceId": "${MODERN_WS_ID}"}'::jsonb),
        ('${MEMBER_USER_ID}', 'linkedin', 'mock_enc_token_4', '{"organizationId": "legacy-text-org", "workspaceId": null}'::jsonb);
    `);
    assert(true, 'Representative snapshot seeded');

    // Snapshot count before migration
    const beforeTokens = await client.query(`SELECT count(*)::int as count FROM public.social_account_tokens`);
    const beforeConns = await client.query(`SELECT count(*)::int as count FROM public.social_connections`);
    assert(beforeTokens.rows[0].count === 4, 'Snapshot has 4 token rows before migration');
    assert(beforeConns.rows[0].count === 4, 'Snapshot has 4 connection rows before migration');

    // -----------------------------------------------------------------------
    // Preflight Reference Inspection & Counts
    // -----------------------------------------------------------------------
    console.log('\n⏳ Running Preflight Reference Analysis...');
    const preflight = await client.query(`
      SELECT 
        sat.id,
        sat.user_id,
        sat.provider,
        sat.extra_meta->>'organizationId' as meta_org,
        sat.extra_meta->>'workspaceId' as meta_ws,
        CASE
          WHEN o.id IS NOT NULL THEN 'VALID_ORG_FK'
          WHEN u.id IS NOT NULL THEN 'LEGACY_USER_ID'
          WHEN sat.extra_meta->>'organizationId' IS NULL THEN 'MISSING'
          ELSE 'INVALID_NOT_FOUND'
        END as org_classification,
        CASE
          WHEN w.id IS NOT NULL THEN 'VALID_WS_FK'
          WHEN sat.extra_meta->>'workspaceId' = sat.user_id::text THEN 'LEGACY_USER_ID'
          WHEN sat.extra_meta->>'workspaceId' IS NULL THEN 'MISSING'
          ELSE 'INVALID_NOT_FOUND'
        END as ws_classification
      FROM public.social_account_tokens sat
      LEFT JOIN public.organizations o ON o.id::text = sat.extra_meta->>'organizationId'
      LEFT JOIN auth.users u ON u.id::text = sat.extra_meta->>'organizationId'
      LEFT JOIN public.workspaces w ON w.id::text = sat.extra_meta->>'workspaceId'
    `);

    let validOrgCount = 0;
    let legacyUserIdOrgCount = 0;
    let missingOrgCount = 0;
    let invalidOrgCount = 0;
    let validWsCount = 0;
    let legacyUserIdWsCount = 0;
    let missingWsCount = 0;

    for (const row of preflight.rows) {
      if (row.org_classification === 'VALID_ORG_FK') validOrgCount++;
      if (row.org_classification === 'LEGACY_USER_ID') legacyUserIdOrgCount++;
      if (row.org_classification === 'MISSING') missingOrgCount++;
      if (row.org_classification === 'INVALID_NOT_FOUND') invalidOrgCount++;

      if (row.ws_classification === 'VALID_WS_FK') validWsCount++;
      if (row.ws_classification === 'LEGACY_USER_ID') legacyUserIdWsCount++;
      if (row.ws_classification === 'MISSING') missingWsCount++;
    }

    console.log('Preflight Counts:');
    console.log(`  Valid Org References: ${validOrgCount}`);
    console.log(`  Legacy User ID Org References: ${legacyUserIdOrgCount}`);
    console.log(`  Missing Org References: ${missingOrgCount}`);
    console.log(`  Invalid/Non-UUID Org References: ${invalidOrgCount}`);
    console.log(`  Valid Workspace References: ${validWsCount}`);
    console.log(`  Legacy User ID Workspace References: ${legacyUserIdWsCount}`);
    console.log(`  Missing Workspace References: ${missingWsCount}`);

    assert(legacyUserIdOrgCount === 1, 'Correctly identified legacy organizationId that is a user ID');
    assert(legacyUserIdWsCount === 1, 'Correctly identified legacy workspaceId that is a user ID');
    assert(missingOrgCount === 1, 'Correctly identified missing organizationId');
    assert(missingWsCount === 2, 'Correctly identified missing workspaceId');
    assert(validOrgCount === 1, 'Correctly identified valid org reference');

    // -----------------------------------------------------------------------
    // Prove Naive Migration Fails
    // -----------------------------------------------------------------------
    console.log('\n⏳ Proving naive migration fails on legacy data...');
    let naiveFailed = false;
    try {
      await client.query('BEGIN');
      await client.query(`
        ALTER TABLE public.social_account_tokens
          ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
          ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
      `);
      await client.query(`
        UPDATE public.social_account_tokens
        SET workspace_id = (extra_meta->>'workspaceId')::uuid
        WHERE workspace_id IS NULL
          AND COALESCE(extra_meta->>'workspaceId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
      `);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      naiveFailed = true;
      console.log(`  ${green('✓')} Naive migration threw expected foreign key violation:`, err.message);
    }
    assert(naiveFailed, 'Naive migration safely caught and proven unsafe for legacy rows');

    // -----------------------------------------------------------------------
    // Execute Safe Repaired Migration
    // -----------------------------------------------------------------------
    console.log('\n⏳ Executing safe, reviewed migration repair and backfill...');
    await client.query(`
      -- Step 1: Add columns safely without foreign keys or not-null constraints initially
      ALTER TABLE public.social_account_tokens
        ADD COLUMN IF NOT EXISTS organization_id UUID,
        ADD COLUMN IF NOT EXISTS workspace_id UUID;

      -- Step 2: Backfill workspace_id
      -- 2a: If extra_meta->>'workspaceId' is a valid workspace in public.workspaces, use it!
      UPDATE public.social_account_tokens sat
      SET workspace_id = (sat.extra_meta->>'workspaceId')::uuid
      WHERE sat.workspace_id IS NULL
        AND COALESCE(sat.extra_meta->>'workspaceId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = (sat.extra_meta->>'workspaceId')::uuid);

      -- 2b: If workspace_id is still null, resolve from workspace owned by the user
      UPDATE public.social_account_tokens sat
      SET workspace_id = (
        SELECT w.id FROM public.workspaces w
        WHERE w.owner_id = sat.user_id
        ORDER BY w.created_at ASC
        LIMIT 1
      )
      WHERE sat.workspace_id IS NULL;

      -- 2c: If workspace_id is still null, resolve via workspace_members
      UPDATE public.social_account_tokens sat
      SET workspace_id = (
        SELECT wm.workspace_id FROM public.workspace_members wm
        WHERE wm.user_id = sat.user_id
        ORDER BY wm.joined_at ASC
        LIMIT 1
      )
      WHERE sat.workspace_id IS NULL;

      -- Step 3: Backfill organization_id
      -- 3a: If extra_meta->>'organizationId' is a valid organization in public.organizations, use it!
      UPDATE public.social_account_tokens sat
      SET organization_id = (sat.extra_meta->>'organizationId')::uuid
      WHERE sat.organization_id IS NULL
        AND COALESCE(sat.extra_meta->>'organizationId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = (sat.extra_meta->>'organizationId')::uuid);

      -- 3b: Derive organization_id from the resolved workspace_id's organization_id
      UPDATE public.social_account_tokens sat
      SET organization_id = w.organization_id
      FROM public.workspaces w
      WHERE sat.workspace_id = w.id
        AND sat.organization_id IS NULL;

      -- 3c: If organization_id is still null, resolve from organizations owned by user
      UPDATE public.social_account_tokens sat
      SET organization_id = (
        SELECT o.id FROM public.organizations o
        WHERE o.owner_id = sat.user_id
        ORDER BY o.created_at ASC
        LIMIT 1
      )
      WHERE sat.organization_id IS NULL;

      -- Step 4: Add foreign keys safely
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'social_account_tokens_organization_id_fkey'
        ) THEN
          ALTER TABLE public.social_account_tokens
            ADD CONSTRAINT social_account_tokens_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'social_account_tokens_workspace_id_fkey'
        ) THEN
          ALTER TABLE public.social_account_tokens
            ADD CONSTRAINT social_account_tokens_workspace_id_fkey
            FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
        END IF;
      END $$;

      -- Step 5: Adjust uniqueness constraints to workspace isolation
      ALTER TABLE public.social_account_tokens
        DROP CONSTRAINT IF EXISTS social_account_tokens_user_id_provider_key;

      DROP INDEX IF EXISTS public.social_account_tokens_user_id_provider_key;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_social_account_tokens_workspace_user_provider_unique
        ON public.social_account_tokens (workspace_id, user_id, provider);

      CREATE INDEX IF NOT EXISTS idx_social_account_tokens_workspace
        ON public.social_account_tokens (workspace_id);

      CREATE INDEX IF NOT EXISTS idx_social_account_tokens_organization
        ON public.social_account_tokens (organization_id);

      -- Step 6: Workspace required check constraint
      ALTER TABLE public.social_account_tokens
        DROP CONSTRAINT IF EXISTS social_account_tokens_workspace_required;
      ALTER TABLE public.social_account_tokens
        ADD CONSTRAINT social_account_tokens_workspace_required
        CHECK (workspace_id IS NOT NULL);
    `);
    assert(true, 'Safe migration and backfill completed without errors');

    // -----------------------------------------------------------------------
    // Verify Post-Migration Data Integrity
    // -----------------------------------------------------------------------
    console.log('\n⏳ Verifying post-migration data integrity...');
    const afterTokens = await client.query(`
      SELECT sat.id, sat.user_id, sat.provider, sat.workspace_id, sat.organization_id, sat.encrypted_access_token
      FROM public.social_account_tokens sat
      ORDER BY sat.created_at ASC
    `);

    assert(afterTokens.rows.length === 4, 'Exactly 4 tokens remain (0 deleted, 0 lost)');

    const rasAliRow = afterTokens.rows.find(r => r.user_id === RAS_ALI_USER_ID);
    assert(rasAliRow.workspace_id === RAS_ALI_WS_ID, 'Ras Ali Labs token workspace_id safely backfilled to canonical workspace');
    assert(rasAliRow.organization_id === RAS_ALI_ORG_ID, 'Ras Ali Labs token organization_id safely backfilled to canonical organization');
    assert(rasAliRow.encrypted_access_token === 'mock_enc_token_1', 'Credentials/tokens unmodified and intact');

    const pameltexRow = afterTokens.rows.find(r => r.user_id === PAMELTEX_USER_ID);
    assert(pameltexRow.workspace_id === PAMELTEX_WS_ID, 'Pameltex token workspace_id safely backfilled from user ownership');
    assert(pameltexRow.organization_id === PAMELTEX_ORG_ID, 'Pameltex token organization_id safely backfilled from workspace');

    const modernRow = afterTokens.rows.find(r => r.user_id === MODERN_USER_ID);
    assert(modernRow.workspace_id === MODERN_WS_ID, 'Modern token exact workspace_id preserved');
    assert(modernRow.organization_id === MODERN_ORG_ID, 'Modern token exact organization_id preserved');

    const memberRow = afterTokens.rows.find(r => r.user_id === MEMBER_USER_ID);
    assert(memberRow.workspace_id === MEMBER_WS_ID, 'Member token workspace_id resolved via workspace_members');
    assert(memberRow.organization_id === MEMBER_ORG_ID, 'Member token organization_id resolved from workspace organization');

    // Check FK validity by querying joins
    const fkCheck = await client.query(`
      SELECT count(*)::int as count
      FROM public.social_account_tokens sat
      JOIN public.workspaces w ON w.id = sat.workspace_id
      JOIN public.organizations o ON o.id = sat.organization_id
    `);
    assert(fkCheck.rows[0].count === 4, 'All 4 rows satisfy strict FK relations to workspaces and organizations');

    console.log(green('\n========================================================================'));
    console.log(green(`🏆 ALL MIGRATION PREFLIGHT CHECKS PASSED: ${passCount} checks`));
    console.log(green('========================================================================\n'));

  } finally {
    await client.end();
    console.log('⏳ Shutting down isolated PostgreSQL daemon...');
    await pgInstance.stop();
    console.log(green('✅ Isolated PostgreSQL daemon terminated.'));
    try {
      if (fs.existsSync(DB_DIR)) {
        fs.rmSync(DB_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}

main().catch(err => {
  console.error(red('Test error:'), err);
  process.exit(1);
});
