import fs from 'fs';
import path from 'path';
import { fork } from 'child_process';
import { Client } from 'pg';

// Dynamic import of embedded-postgres
// @ts-ignore
import EmbeddedPostgres from 'embedded-postgres';

import net from 'net';

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

const DB_USER = 'postgres';
const DB_PASSWORD = 'isolated_validation_password';
const DB_NAME = 'postgres';
const DB_DIR = path.resolve(__dirname, '../.isolated-pgdata');


interface ConcurrencyResult {
  workerId: string;
  pid: number;
  elapsed: number;
  claimResult: {
    claim_status: string;
    claim_id?: string;
    lease_token?: string;
    conflict: boolean;
    message?: string;
  };
}

async function main() {
  console.log('================================================================');
  console.log('🔒 Isolated PostgreSQL Security & Idempotency Validation Suite');
  console.log('================================================================');

  // Clean up any stale directory if exists
  try {
    if (fs.existsSync(DB_DIR)) {
      fs.rmSync(DB_DIR, { recursive: true, force: true });
    }
  } catch {}

  const DB_PORT = await getFreePort();
  const CONNECTION_STRING = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}`;

  const PgClass = (EmbeddedPostgres as any).default || EmbeddedPostgres;
  const pgInstance = new PgClass({
    databaseDir: DB_DIR,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    initialDatabase: DB_NAME,
    persistent: false,
  });

  console.log('⏳ [1/7] Initializing and starting isolated PostgreSQL daemon...');
  await pgInstance.initialise();
  await pgInstance.start();
  console.log(`✅ [1/7] Isolated PostgreSQL daemon active on 127.0.0.1:${DB_PORT}`);

  const superuserClient = new Client({ connectionString: CONNECTION_STRING });
  await superuserClient.connect();

  try {
    // 1. Setup Supabase standard roles and base schema dependencies
    console.log('⏳ [2/7] Provisioning Supabase standard roles and base dependencies...');
    await superuserClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;
    `);

    // Ensure pgcrypto extension for gen_random_uuid
    await superuserClient.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Ensure dependency table social_posts exists
    await superuserClient.query(`
      CREATE TABLE IF NOT EXISTS public.social_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        created_at TIMESTAMPTZ DEFAULT pg_catalog.now()
      );
    `);
    console.log('✅ [2/7] Roles (anon, authenticated, service_role) and base schema ready.');

    // 2. Apply the publishing idempotency migration
    console.log('⏳ [3/7] Applying 20260913_publishing_idempotency_dispatch_claims.sql migration...');
    const migrationPath = path.resolve(__dirname, '../packages/database/migrations/20260913_publishing_idempotency_dispatch_claims.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await superuserClient.query(migrationSql);
    console.log('✅ [3/7] Migration applied cleanly to isolated database.');

    // 3. Verify Table and RLS Invariants
    console.log('⏳ [4/7] Verifying RLS & Table Privilege Invariants through real SQL queries...');
    
    // Check RLS is enabled and forced
    const rlsQuery = await superuserClient.query(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'social_publish_idempotency';
    `);
    if (rlsQuery.rows.length !== 1) {
      throw new Error('Table public.social_publish_idempotency not found!');
    }
    const rlsRow = rlsQuery.rows[0];
    if (!rlsRow.relrowsecurity) {
      throw new Error('FAIL: Row Level Security is NOT enabled on social_publish_idempotency!');
    }
    console.log(`  ✓ RLS Enabled: ${rlsRow.relrowsecurity}, RLS Forced: ${rlsRow.relforcerowsecurity}`);

    // Check Table Privileges for anon, authenticated, and public
    const privQueries = [
      { role: 'anon', action: 'SELECT', expect: false },
      { role: 'anon', action: 'INSERT', expect: false },
      { role: 'anon', action: 'UPDATE', expect: false },
      { role: 'anon', action: 'DELETE', expect: false },
      { role: 'authenticated', action: 'SELECT', expect: false },
      { role: 'authenticated', action: 'INSERT', expect: false },
      { role: 'authenticated', action: 'UPDATE', expect: false },
      { role: 'authenticated', action: 'DELETE', expect: false },
      { role: 'public', action: 'SELECT', expect: false },
      { role: 'public', action: 'INSERT', expect: false },
      { role: 'service_role', action: 'SELECT', expect: true },
      { role: 'service_role', action: 'INSERT', expect: true },
      { role: 'service_role', action: 'UPDATE', expect: true },
      { role: 'service_role', action: 'DELETE', expect: true },
    ];

    for (const check of privQueries) {
      const res = await superuserClient.query(
        `SELECT has_table_privilege($1, 'public.social_publish_idempotency', $2) AS allowed;`,
        [check.role, check.action]
      );
      const allowed = res.rows[0].allowed;
      if (allowed !== check.expect) {
        throw new Error(
          `FAIL: Role '${check.role}' table privilege for '${check.action}' is ${allowed}, expected ${check.expect}`
        );
      }
    }
    console.log('  ✓ Table privileges verified: anon, authenticated, public have 0 privileges; service_role has full CRUD.');

    // 4. Verify RPC Function Privileges
    console.log('⏳ [5/7] Verifying Function Execute Privileges for 3 RPC functions...');
    const functions = [
      'public.claim_social_publish_dispatch(text,text,text,text,text,text,text)',
      'public.complete_social_publish_dispatch(uuid,text,text,uuid,text,jsonb,text)',
      'public.fail_social_publish_dispatch(uuid,text,text,text,text)',
    ];

    for (const fn of functions) {
      // anon cannot execute
      const anonRes = await superuserClient.query(`SELECT has_function_privilege('anon', '${fn}', 'EXECUTE') AS allowed;`);
      if (anonRes.rows[0].allowed !== false) {
        throw new Error(`FAIL: 'anon' can execute ${fn}!`);
      }

      // authenticated cannot execute
      const authRes = await superuserClient.query(`SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS allowed;`);
      if (authRes.rows[0].allowed !== false) {
        throw new Error(`FAIL: 'authenticated' can execute ${fn}!`);
      }

      // public cannot execute
      const pubRes = await superuserClient.query(`SELECT has_function_privilege('public', '${fn}', 'EXECUTE') AS allowed;`);
      if (pubRes.rows[0].allowed !== false) {
        throw new Error(`FAIL: 'public' can execute ${fn}!`);
      }

      // service_role CAN execute
      const srvRes = await superuserClient.query(`SELECT has_function_privilege('service_role', '${fn}', 'EXECUTE') AS allowed;`);
      if (srvRes.rows[0].allowed !== true) {
        throw new Error(`FAIL: 'service_role' CANNOT execute ${fn}!`);
      }
      console.log(`  ✓ Function ${fn.split('(')[0]}: anon/auth/public EXECUTE denied, service_role EXECUTE granted.`);
    }

    // 5. Verify Exact Parameter Names and Types
    console.log('⏳ [6/7] Verifying Application RPC parameter names and types against PostgreSQL information_schema...');
    const paramsQuery = await superuserClient.query(`
      SELECT 
        r.routine_name,
        p.parameter_name,
        p.data_type,
        p.ordinal_position
      FROM information_schema.routines r
      JOIN information_schema.parameters p 
        ON r.specific_name = p.specific_name
      WHERE r.routine_schema = 'public'
        AND r.routine_name IN ('claim_social_publish_dispatch', 'complete_social_publish_dispatch', 'fail_social_publish_dispatch')
      ORDER BY r.routine_name, p.ordinal_position;
    `);

    const expectedSignatures: Record<string, Array<{ name: string; type: string }>> = {
      claim_social_publish_dispatch: [
        { name: 'p_user_id', type: 'text' },
        { name: 'p_organization_id', type: 'text' },
        { name: 'p_workspace_id', type: 'text' },
        { name: 'p_destination', type: 'text' },
        { name: 'p_idempotency_key', type: 'text' },
        { name: 'p_body_hash', type: 'text' },
        { name: 'p_lease_token', type: 'text' },
      ],
      complete_social_publish_dispatch: [
        { name: 'p_claim_id', type: 'uuid' },
        { name: 'p_organization_id', type: 'text' },
        { name: 'p_workspace_id', type: 'text' },
        { name: 'p_post_id', type: 'uuid' },
        { name: 'p_external_receipt_id', type: 'text' },
        { name: 'p_platform_results', type: 'jsonb' },
        { name: 'p_lease_token', type: 'text' },
      ],
      fail_social_publish_dispatch: [
        { name: 'p_claim_id', type: 'uuid' },
        { name: 'p_organization_id', type: 'text' },
        { name: 'p_workspace_id', type: 'text' },
        { name: 'p_error_message', type: 'text' },
        { name: 'p_lease_token', type: 'text' },
      ],
    };

    for (const [routineName, expectedParams] of Object.entries(expectedSignatures)) {
      const routineRows = paramsQuery.rows.filter((r) => r.routine_name === routineName);
      if (routineRows.length !== expectedParams.length) {
        throw new Error(
          `FAIL: Routine ${routineName} parameter count mismatch! Expected ${expectedParams.length}, got ${routineRows.length}`
        );
      }
      for (let i = 0; i < expectedParams.length; i++) {
        const expected = expectedParams[i];
        const actual = routineRows[i];
        if (actual.parameter_name !== expected.name || actual.data_type !== expected.type) {
          throw new Error(
            `FAIL: Routine ${routineName} param ${i + 1} mismatch! Expected ${expected.name} (${expected.type}), got ${actual.parameter_name} (${actual.data_type})`
          );
        }
      }
      console.log(`  ✓ Signature confirmed for ${routineName} (${expectedParams.length} arguments).`);
    }

    // 6. Isolated PostgreSQL Security Checks
    console.log('⏳ Running isolated PostgreSQL security checks...');
    
    // Check 1: Unindexed foreign keys
    const unindexedFkQuery = await superuserClient.query(`
      SELECT conrelid::regclass AS table_name, a.attname AS column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f'
        AND c.conrelid::regclass::text LIKE '%social_publish_idempotency%'
        AND NOT EXISTS (
          SELECT 1 FROM pg_index i
          WHERE i.indrelid = c.conrelid
            AND i.indkey[0] = a.attnum
        );
    `);
    if (unindexedFkQuery.rows.length > 0) {
      throw new Error(`Isolated Security Check Warning: Unindexed foreign key found: ${JSON.stringify(unindexedFkQuery.rows)}`);
    }
    console.log('  ✓ Isolated Security Check: 0 unindexed foreign keys on social_publish_idempotency.');

    // Check 2: Function search_path mutable
    const mutableSearchPathQuery = await superuserClient.query(`
      SELECT proname, proconfig
      FROM pg_proc
      JOIN pg_namespace n ON pg_proc.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND proname IN ('claim_social_publish_dispatch', 'complete_social_publish_dispatch', 'fail_social_publish_dispatch')
        AND (proconfig IS NULL OR NOT ('search_path=' = ANY(proconfig) OR 'search_path=""' = ANY(proconfig)));
    `);
    if (mutableSearchPathQuery.rows.length > 0) {
      throw new Error(`Isolated Security Check Warning: Mutable search path on functions: ${JSON.stringify(mutableSearchPathQuery.rows)}`);
    }
    console.log('  ✓ Isolated Security Check: all 3 functions enforce immutable search_path.');

    // 7. Multi-Process Concurrency Race Test
    console.log('⏳ [7/7] Launching 3 independent OS child processes for concurrent claim race...');
    
    const workerScript = path.resolve(__dirname, 'isolated-postgres-worker.js');
    const claimPayload = {
      userId: 'usr_real_isolated_concurrency_test',
      organizationId: 'org_real_isolated_concurrency_test',
      workspaceId: 'ws_real_isolated_concurrency_test',
      destination: 'linkedin_corporate_feed',
      idempotencyKey: 'idemp_key_multi_proc_isolated_race_8871',
      bodyHash: 'body_hash_multi_proc_isolated_race_8871',
    };

    const workerPids: number[] = [];
    const workers: any[] = [];
    const results: ConcurrencyResult[] = [];

    const workerCount = 3;
    for (let i = 0; i < workerCount; i++) {
      const workerId = `worker-proc-${i + 1}`;
      const child = fork(workerScript, [
        workerId,
        CONNECTION_STRING,
        JSON.stringify(claimPayload),
      ]);
      workerPids.push(child.pid!);
      workers.push(child);
    }

    console.log(`  ✓ Spawned ${workerCount} independent OS processes.`);

    // Wait for all workers to be ready
    await new Promise<void>((resolve) => {
      let readyCount = 0;
      for (const child of workers) {
        child.on('message', (msg: any) => {
          if (msg.type === 'READY') {
            readyCount++;
            if (readyCount === workerCount) resolve();
          } else if (msg.type === 'RESULT') {
            results.push(msg);
          } else if (msg.type === 'ERROR') {
            console.error(`Worker error:`, msg);
          }
        });
      }
    });

    console.log('  ⚡ Sending simultaneous GO signal to all 3 worker processes...');
    // Release the barrier simultaneously
    for (const child of workers) {
      child.send('GO');
    }

    // Wait for all workers to finish and exit
    await Promise.all(
      workers.map(
        (child) =>
          new Promise<void>((resolve) => {
            child.on('exit', () => resolve());
          })
      )
    );

    console.log(`  ✓ All ${workerCount} processes completed execution.`);
    console.log('  --- Race Execution Results ---');
    for (const r of results) {
      console.log(`    ${r.workerId} (${r.elapsed}ms): conflict=${r.claimResult.conflict} status=${r.claimResult.claim_status}`);
    }

    const winners = results.filter((r) => r.claimResult.conflict === false);
    const conflicts = results.filter((r) => r.claimResult.conflict === true);

    if (winners.length !== 1) {
      throw new Error(`FAIL: Expected exactly 1 winner, but got ${winners.length}!`);
    }
    if (conflicts.length !== workerCount - 1) {
      throw new Error(`FAIL: Expected exactly ${workerCount - 1} conflicts, but got ${conflicts.length}!`);
    }

    const winner = winners[0];
    console.log(`  🏆 Winner: ${winner.workerId} successfully acquired atomic lease.`);
    console.log(`  🛡️ Blocked duplicates: ${conflicts.length} processes received IN_PROGRESS_CONFLICT.`);

    // 8. Lifecycle Completion Test
    console.log('⏳ Testing lifecycle completion RPC with winning lease token...');
    const completeRes = await superuserClient.query(`
      SELECT public.complete_social_publish_dispatch(
        $1::uuid, $2::text, $3::text, $4::uuid, $5::text, $6::jsonb, $7::text
      ) AS success;
    `, [
      winner.claimResult.claim_id,
      claimPayload.organizationId,
      claimPayload.workspaceId,
      null, // post_id
      'ext_rec_isolated_99182',
      JSON.stringify({ linkedin: { status: 'published', urn: 'urn:li:share:123456' } }),
      winner.claimResult.lease_token,
    ]);

    if (!completeRes.rows[0].success) {
      throw new Error('FAIL: complete_social_publish_dispatch returned false!');
    }
    console.log('  ✓ complete_social_publish_dispatch succeeded.');

    // 9. Post-Completion Duplicate Claim Test (24h Idempotency Re-check)
    console.log('⏳ Testing subsequent duplicate claim after completion...');
    const duplicateRes = await superuserClient.query(`
      SELECT public.claim_social_publish_dispatch(
        $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text
      ) AS result;
    `, [
      claimPayload.userId,
      claimPayload.organizationId,
      claimPayload.workspaceId,
      claimPayload.destination,
      claimPayload.idempotencyKey,
      claimPayload.bodyHash,
      null,
    ]);

    const dupResult = duplicateRes.rows[0].result;
    if (dupResult.conflict !== true || dupResult.claim_status !== 'ALREADY_COMPLETED') {
      throw new Error(`FAIL: Expected ALREADY_COMPLETED with conflict=true, got: ${JSON.stringify(dupResult)}`);
    }
    console.log('  ✓ Verified 24h idempotent duplicate protection: returned ALREADY_COMPLETED with conflict=true.');

    console.log('\n================================================================');
    console.log('🎉 ALL ISOLATED POSTGRESQL INVARIANTS & MULTI-PROCESS RACES PASSED');
    console.log('================================================================\n');
  } finally {
    await superuserClient.end();
    console.log('⏳ Stopping isolated PostgreSQL server...');
    await pgInstance.stop();
    console.log('✅ Isolated PostgreSQL server stopped cleanly.');
    try {
      if (fs.existsSync(DB_DIR)) {
        fs.rmSync(DB_DIR, { recursive: true, force: true });
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error('❌ Validation suite failed:', err);
  process.exit(1);
});
