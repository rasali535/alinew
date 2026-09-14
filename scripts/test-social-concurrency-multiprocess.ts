// =====================================================================
// Ralion OS — Multi-Process Social Publishing Concurrency Acceptance Test
// Enforces:
// 1. Separate Node OS child processes (NOT single-process Promise.all)
// 2. Mock database & dispatch receiver handling atomic PostgreSQL RPC calls
// 3. True multi-process lease claiming and deduplication
// 4. Exactly one process granted dispatch; all other processes receive HTTP 409 conflict
// 5. Zero double-dispatch across independent worker processes
// =====================================================================

import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

interface ClaimRecord {
  claimId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  leaseToken: string;
  userId: string;
  orgId: string;
  wsId: string;
  destination: string;
  idempotencyKey: string;
  bodyHash: string;
  createdAt: number;
}

async function run() {
  console.log('--- STARTING MULTI-PROCESS SOCIAL PUBLISHING CONCURRENCY ACCEPTANCE TEST ---');
  let failures = 0;

  // 1. Setup Mock Database & Dispatch Receiver Server
  const claims = new Map<string, ClaimRecord>();
  let totalClaimAttempts = 0;
  let grantedClaims = 0;
  let conflictsReturned = 0;
  let completionsReceived = 0;

  const server = http.createServer((req, res) => {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', () => {
      const url = req.url || '';
      const method = req.method || 'GET';

      // Route: RPC claim_social_publish_dispatch
      if (method === 'POST' && url.includes('/rest/v1/rpc/claim_social_publish_dispatch')) {
        totalClaimAttempts++;
        const parsed = JSON.parse(rawBody);
        const boundaryKey = `${parsed.p_user_id}:${parsed.p_organization_id}:${parsed.p_workspace_id}:${parsed.p_destination}:${parsed.p_idempotency_key}`;

        const existing = claims.get(boundaryKey);
        if (existing) {
          conflictsReturned++;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              conflict: true,
              claim_status: existing.status === 'COMPLETED' ? 'ALREADY_COMPLETED' : 'IN_PROGRESS',
              claim_id: existing.claimId,
              message: 'Publish dispatch already in progress or completed',
            })
          );
          return;
        }

        // Atomically grant claim to first process
        const claimId = crypto.randomUUID();
        claims.set(boundaryKey, {
          claimId,
          status: 'IN_PROGRESS',
          leaseToken: parsed.p_lease_token,
          userId: parsed.p_user_id,
          orgId: parsed.p_organization_id,
          wsId: parsed.p_workspace_id,
          destination: parsed.p_destination,
          idempotencyKey: parsed.p_idempotency_key,
          bodyHash: parsed.p_body_hash,
          createdAt: Date.now(),
        });
        grantedClaims++;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            conflict: false,
            claim_id: claimId,
            claim_status: 'IN_PROGRESS',
            lease_token: parsed.p_lease_token,
          })
        );
        return;
      }

      // Route: RPC complete_social_publish_dispatch
      if (method === 'POST' && url.includes('/rest/v1/rpc/complete_social_publish_dispatch')) {
        completionsReceived++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(true));
        return;
      }

      // Route: RPC fail_social_publish_dispatch
      if (method === 'POST' && url.includes('/rest/v1/rpc/fail_social_publish_dispatch')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(true));
        return;
      }

      // Route: Insert into social_posts
      if (method === 'POST' && url.includes('/rest/v1/social_posts')) {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ id: crypto.randomUUID() }]));
        return;
      }

      // Route: Query social_posts for duplicates
      if (method === 'GET' && url.includes('/rest/v1/social_posts')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      // Route: Query social_connections
      if (method === 'GET' && url.includes('/rest/v1/social_connections')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      // Default mock fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const mockPort = address.port;
  const mockSupabaseUrl = `http://127.0.0.1:${mockPort}`;
  console.log(`[Mock Receiver] Running on ${mockSupabaseUrl}`);

  // 2. Launch multiple separate Node OS processes simultaneously
  const workerCount = 3;
  const workerScript = path.resolve(__dirname, 'concurrency-worker.ts');
  const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
  const preloadScript = path.resolve(__dirname, 'preload-server-only.cjs');

  console.log(`[Spawn] Launching ${workerCount} separate Node child processes to publish identical payload simultaneously...`);

  const workerPromises = Array.from({ length: workerCount }, (_, i) => {
    return new Promise<{ workerId: string; pid?: number; conflict?: boolean; overallStatus?: string; statusCode?: number; error?: string }>((resolve) => {
      const workerId = `worker-proc-${i + 1}`;
      const child = spawn(process.execPath, ['-r', preloadScript, tsxCli, workerScript, workerId], {
        env: {
          ...process.env,
          SUPABASE_URL: mockSupabaseUrl,
          NEXT_PUBLIC_SUPABASE_URL: mockSupabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: 'test-mock-service-role-key-never-live',
          NODE_ENV: 'test',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', () => {
        const resultMatch = stdout.match(/WORKER_RESULT:(.+)/);
        if (resultMatch) {
          try {
            resolve(JSON.parse(resultMatch[1]));
            return;
          } catch {}
        }
        const errorMatch = stdout.match(/WORKER_ERROR:(.+)/);
        if (errorMatch) {
          try {
            resolve(JSON.parse(errorMatch[1]));
            return;
          } catch {}
        }
        resolve({ workerId, error: stderr || stdout || 'Unknown error' });
      });
    });
  });

  const results = await Promise.all(workerPromises);

  // 3. Analyze Results
  console.log('\n--- MULTI-PROCESS EXECUTION RESULTS ---');
  results.forEach((r: any) => {
    console.log(`- ${r.workerId} (PID ${r.pid}): status=${r.overallStatus}, conflict=${r.conflict}, HTTP=${r.statusCode}, errors=${JSON.stringify(r.errors || r.error)}`);
  });

  const grantedWorkers = results.filter((r) => r.conflict === false && (r.overallStatus === 'PUBLISHED' || r.statusCode === 200));
  const conflictWorkers = results.filter((r) => r.conflict === true || r.statusCode === 409);

  console.log('\n--- VERIFICATION CHECKS ---');

  // Check 1: Exactly one worker succeeded
  if (grantedWorkers.length === 1) {
    console.log(`PASS: Exactly one worker (${grantedWorkers[0].workerId}, PID ${grantedWorkers[0].pid}) acquired the atomic lease and published.`);
  } else {
    console.error(`FAIL: Expected exactly 1 granted worker, found ${grantedWorkers.length}:`, grantedWorkers);
    failures++;
  }

  // Check 2: All other workers were rejected with conflict (HTTP 409)
  if (conflictWorkers.length === workerCount - 1) {
    console.log(`PASS: All other ${conflictWorkers.length} workers received atomic conflict (HTTP 409).`);
  } else {
    console.error(`FAIL: Expected ${workerCount - 1} conflict workers, found ${conflictWorkers.length}:`, conflictWorkers);
    failures++;
  }

  // Check 3: Mock DB receiver state
  if (grantedClaims === 1) {
    console.log(`PASS: Mock database receiver granted exactly 1 claim.`);
  } else {
    console.error(`FAIL: Expected 1 granted claim at receiver, got ${grantedClaims}`);
    failures++;
  }

  if (conflictsReturned === workerCount - 1) {
    console.log(`PASS: Mock database receiver returned ${conflictsReturned} conflicts.`);
  } else {
    console.error(`FAIL: Expected ${workerCount - 1} conflicts at receiver, got ${conflictsReturned}`);
    failures++;
  }

  // Cleanup
  server.close();

  console.log('\n----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL MULTI-PROCESS SOCIAL CONCURRENCY TESTS PASSED!');
  }
}

run().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
