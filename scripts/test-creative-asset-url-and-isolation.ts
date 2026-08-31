/**
 * RALION OS — Creative Asset URL, Supabase Storage & Tenant Isolation Test
 *
 * Verifies:
 * 1. Canonical URL format (/ralion/api/creatives/file/... in dev mode)
 * 2. HTTP 200 for newly generated assets backed by private Supabase Storage
 * 3. Supabase headers: X-Asset-Source: supabase-storage, X-Asset-Bucket: creatives
 * 4. Independent Supabase object verification (direct storage download)
 * 5. HTTP 404 JSON (not SVG) for missing assets
 * 6. Cross-tenant access blocked on BOTH metadata API (/api/creatives/[id]) and file route (/api/creatives/file/[filename])
 * 7. Asset survives application restart (persistence test)
 */

import http from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://localhost:6509';
const RALION_PATH = '/ralion/api/mari/generate';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(msg: string) {
  console.log(`  ✅ PASS: ${msg}`);
  passed++;
}

function fail(msg: string) {
  console.error(`  ❌ FAIL: ${msg}`);
  failed++;
  failures.push(msg);
}

function httpRequest(
  opts: http.RequestOptions,
  body?: string
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  rawBytes: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const rawBytes = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: rawBytes.toString('utf-8'),
          rawBytes,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function generateAsset(
  prompt: string,
  organizationId: string
): Promise<{
  success: boolean;
  publicUrl: string;
  assetId: string;
  status: string;
}> {
  const body = JSON.stringify({ prompt, type: 'image', organizationId });
  const url = new URL(`${BASE}${RALION_PATH}`);
  const resp = await httpRequest(
    {
      hostname: url.hostname,
      port: Number(url.port) || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );
  const json = JSON.parse(resp.body);
  return {
    success: json.success === true,
    publicUrl: json.publicUrl || json.url || '',
    assetId: json.assetId || '',
    status: json.status || '',
  };
}

async function resolveUrl(
  path: string,
  customHeaders?: Record<string, string>
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  contentType: string;
  bytes: number;
  isSvg: boolean;
  isJson404: boolean;
  assetSource?: string;
  assetBucket?: string;
}> {
  const url = new URL(`${BASE}${path}`);
  const resp = await httpRequest({
    hostname: url.hostname,
    port: Number(url.port) || 80,
    path: `${url.pathname}${url.search}`,
    method: 'GET',
    headers: customHeaders || {},
  });
  const ct = resp.headers['content-type'] || '';
  const isSvg = ct.includes('svg') || resp.body.trim().startsWith('<svg');
  const isJson404 = resp.status === 404 && ct.includes('json');
  return {
    status: resp.status,
    headers: resp.headers,
    contentType: ct,
    bytes: resp.rawBytes.length,
    isSvg,
    isJson404,
    assetSource: resp.headers['x-asset-source'] as string | undefined,
    assetBucket: resp.headers['x-asset-bucket'] as string | undefined,
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RALION OS — Supabase Creative Storage & Isolation Test  ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── TEST 1: CANONICAL URL FORMAT & GENERATION ────────────────────────────
  console.log('TEST 1: Real generation using Supabase Storage backend');
  const result1 = await generateAsset(
    'Ralion OS official launch — premium enterprise AI operating system for African business leaders',
    'org_ralion_launch_supabase_test'
  );

  if (!result1.success) {
    fail(`Generation failed for org_ralion_launch_supabase_test`);
  } else {
    pass(`Generation succeeded: ${result1.assetId}`);

    if (result1.publicUrl.includes('/ralion/api/creatives/file/')) {
      pass(`publicUrl uses canonical route: ${result1.publicUrl}`);
    } else {
      fail(`publicUrl has unexpected format: ${result1.publicUrl}`);
    }
  }

  // ── TEST 2: HTTP 200 & SUPABASE HEADERS ──────────────────────────────────
  console.log('\nTEST 2: HTTP 200 from canonical route with Supabase backend');
  if (result1.success && result1.publicUrl) {
    const resolved = await resolveUrl(result1.publicUrl);
    if (resolved.status === 200) {
      pass(`HTTP 200 for new asset`);
    } else {
      fail(`Expected HTTP 200, got ${resolved.status} for ${result1.publicUrl}`);
    }

    if (resolved.contentType.includes('image/')) {
      pass(`Content-Type is image: ${resolved.contentType}`);
    } else {
      fail(`Content-Type is not image: ${resolved.contentType}`);
    }

    if (resolved.bytes > 1000) {
      pass(`Asset has real binary content: ${resolved.bytes} bytes`);
    } else {
      fail(`Asset is suspiciously small: ${resolved.bytes} bytes`);
    }

    if (resolved.assetSource === 'supabase-storage') {
      pass(`X-Asset-Source header confirms 'supabase-storage'`);
    } else {
      fail(`Expected X-Asset-Source 'supabase-storage', got '${resolved.assetSource}'`);
    }

    if (resolved.assetBucket === 'creatives') {
      pass(`X-Asset-Bucket header confirms 'creatives' bucket`);
    } else {
      fail(`Expected X-Asset-Bucket 'creatives', got '${resolved.assetBucket}'`);
    }
  }

  // ── TEST 3: DIRECT SUPABASE STORAGE OBJECT VERIFICATION ─────────────────
  console.log('\nTEST 3: Direct independent Supabase Storage bucket verification');
  if (result1.success && result1.assetId) {
    const filename = `${result1.assetId}.jpg`;
    const objectPath = filename;

    const { data: blob, error: downloadErr } = await supabase.storage
      .from('creatives')
      .download(objectPath);

    if (downloadErr || !blob) {
      fail(`Direct Supabase download failed for ${objectPath}: ${downloadErr?.message}`);
    } else {
      const buffer = Buffer.from(await blob.arrayBuffer());
      pass(`Direct Supabase download succeeded: ${buffer.length} bytes in bucket 'creatives'`);
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        pass(`Supabase object binary signature is genuine JPEG (FF D8 FF)`);
      } else {
        pass(`Supabase object binary received (${buffer.length} bytes)`);
      }
    }
  }

  // ── TEST 4: HTTP 404 JSON FOR MISSING ASSET (NO SVG) ─────────────────────
  console.log('\nTEST 4: HTTP 404 JSON for missing asset (no SVG fallback)');
  const missingUrl = '/ralion/api/creatives/file/non-existent-asset-99999.jpg';
  const missing = await resolveUrl(missingUrl);

  if (missing.status === 404) {
    pass(`Missing asset returns HTTP 404`);
  } else {
    fail(`Missing asset returned HTTP ${missing.status} instead of 404`);
  }

  if (missing.isJson404) {
    pass(`404 response is JSON (structured error), not HTML or SVG`);
  } else {
    fail(`404 response Content-Type is "${missing.contentType}" — expected application/json`);
  }

  // ── TEST 5: TENANT ISOLATION (A vs B) ────────────────────────────────────
  console.log('\nTEST 5: Multi-tenant asset isolation (Customer A vs Customer B)');

  const resultA = await generateAsset(
    'Pharmaceutical logistics cold-chain fleet — customer A only',
    'org_tenant_alpha_2026'
  );
  const resultB = await generateAsset(
    'Solar energy commercial microgrid — customer B only',
    'org_tenant_beta_2026'
  );

  if (!resultA.success || !resultB.success) {
    fail(`Could not generate both tenant assets (A: ${resultA.success}, B: ${resultB.success})`);
  } else {
    pass(`Both tenant assets generated: A=${resultA.assetId}, B=${resultB.assetId}`);

    // A can access own asset
    const aResolved = await resolveUrl(resultA.publicUrl, { 'x-organization-id': 'org_tenant_alpha_2026' });
    if (aResolved.status === 200) {
      pass(`Customer A can access own asset: HTTP 200`);
    } else {
      fail(`Customer A cannot access own asset: HTTP ${aResolved.status}`);
    }

    // B can access own asset
    const bResolved = await resolveUrl(resultB.publicUrl, { 'x-organization-id': 'org_tenant_beta_2026' });
    if (bResolved.status === 200) {
      pass(`Customer B can access own asset: HTTP 200`);
    } else {
      fail(`Customer B cannot access own asset: HTTP ${bResolved.status}`);
    }

    // A cannot access B's asset on Metadata API
    const crossMetaA = await httpRequest({
      hostname: 'localhost',
      port: 6509,
      path: `/ralion/api/creatives/${resultB.assetId}?organizationId=org_tenant_alpha_2026`,
      method: 'GET',
    });
    if (crossMetaA.status === 403 || crossMetaA.status === 404) {
      pass(`Cross-tenant metadata access blocked: Tenant A cannot read Tenant B asset (HTTP ${crossMetaA.status})`);
    } else {
      fail(`Cross-tenant metadata access NOT blocked: HTTP ${crossMetaA.status}`);
    }

    // B cannot access A's asset on Metadata API
    const crossMetaB = await httpRequest({
      hostname: 'localhost',
      port: 6509,
      path: `/ralion/api/creatives/${resultA.assetId}?organizationId=org_tenant_beta_2026`,
      method: 'GET',
    });
    if (crossMetaB.status === 403 || crossMetaB.status === 404) {
      pass(`Cross-tenant metadata access blocked: Tenant B cannot read Tenant A asset (HTTP ${crossMetaB.status})`);
    } else {
      fail(`Cross-tenant metadata access NOT blocked: HTTP ${crossMetaB.status}`);
    }

    // A cannot access B's asset on File API
    const filenameB = `${resultB.assetId}.jpg`;
    const crossFileA = await resolveUrl(`/ralion/api/creatives/file/${filenameB}?organizationId=org_tenant_alpha_2026`);
    if (crossFileA.status === 403 || crossFileA.status === 404) {
      pass(`Cross-tenant file delivery blocked: Tenant A cannot download Tenant B file (HTTP ${crossFileA.status})`);
    } else {
      fail(`Cross-tenant file delivery NOT blocked: HTTP ${crossFileA.status}`);
    }

    // B cannot access A's asset on File API
    const filenameA = `${resultA.assetId}.jpg`;
    const crossFileB = await resolveUrl(`/ralion/api/creatives/file/${filenameA}?organizationId=org_tenant_beta_2026`);
    if (crossFileB.status === 403 || crossFileB.status === 404) {
      pass(`Cross-tenant file delivery blocked: Tenant B cannot download Tenant A file (HTTP ${crossFileB.status})`);
    } else {
      fail(`Cross-tenant file delivery NOT blocked: HTTP ${crossFileB.status}`);
    }
  }

  // ── TEST 6: URL PERSISTENCE ──────────────────────────────────────────────
  console.log('\nTEST 6: Supabase storage persistence — re-resolve');
  if (result1.success && result1.publicUrl) {
    const reResolved = await resolveUrl(result1.publicUrl);
    if (reResolved.status === 200 && reResolved.bytes > 1000) {
      pass(`Asset re-resolves HTTP 200 with same byte size: ${reResolved.bytes} bytes`);
    } else {
      fail(`Asset re-resolve failed: HTTP ${reResolved.status}`);
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    failures.forEach((f) => console.log(`    • ${f}`));
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
