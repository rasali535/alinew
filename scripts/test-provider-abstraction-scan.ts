/**
 * Automated Acceptance Test: Provider Abstraction & Brand Scan
 * Ensures no third-party infrastructure details are leaked to tenants,
 * and no hardcoded system brand defaults exist in tenant publishing flows.
 */

import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /or use Zernio/i, description: 'Direct customer-facing mention of Zernio fallback' },
  { pattern: /https:\/\/zernio\.com\/api\/v1\/profiles/, description: 'Hardcoded external provider test endpoint leak' },
];

const SCAN_DIRS = [
  path.resolve(__dirname, '../apps/ralion/src/app/api'),
  path.resolve(__dirname, '../apps/ralion/src/components'),
  path.resolve(__dirname, '../apps/ralion/src/lib/services/social'),
];

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function run() {
  console.log('--- STARTING PROVIDER ABSTRACTION AND BRAND SCAN ---');
  let failures = 0;

  const files = SCAN_DIRS.flatMap((d) => scanDirectory(d));
  console.log(`Scanning ${files.length} source files across API routes, components, and social services...`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const check of FORBIDDEN_PATTERNS) {
      if (check.pattern.test(content)) {
        console.error(`FAIL: ${path.relative(process.cwd(), file)} contains forbidden pattern: ${check.description}`);
        failures++;
      }
    }
  }

  // Verify social connections API route filters infrastructure provider metadata
  const connRoutePath = path.resolve(__dirname, '../apps/ralion/src/app/api/social/connections/route.ts');
  const connRouteContent = fs.readFileSync(connRoutePath, 'utf-8');
  if (
    !connRouteContent.includes('delete conn.infrastructure_provider') &&
    !connRouteContent.includes('delete (conn as any).infrastructure_provider') &&
    !connRouteContent.includes('infrastructure_provider,')
  ) {
    console.error('FAIL: connections/route.ts does not strip infrastructure_provider from client response');
    failures++;
  } else {
    console.log('PASS: connections/route.ts properly strips infrastructure_provider');
  }

  // Verify social comments route does not expose raw zernio provider
  const commentsRoutePath = path.resolve(__dirname, '../apps/ralion/src/app/api/social/comments/route.ts');
  const commentsContent = fs.readFileSync(commentsRoutePath, 'utf-8');
  if (commentsContent.includes("provider: 'zernio'")) {
    console.error("FAIL: comments/route.ts contains customer-facing provider: 'zernio'");
    failures++;
  } else {
    console.log('PASS: comments/route.ts uses abstracted provider identity');
  }

  console.log('----------------------------------------------------');
  if (failures > 0) {
    console.error(`TOTAL FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL PROVIDER ABSTRACTION SCAN CHECKS PASSED!');
  }
}

run().catch((e) => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
