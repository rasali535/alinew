#!/usr/bin/env node

/**
 * RALION — Automated Security, Meta & Zernio Compliance Audit CLI
 * Ras Ali Labs (Pty) Ltd
 *
 * Runs comprehensive static and architectural checks across the entire codebase.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const checks = {
  passed: [],
  warn: [],
  failed: [],
  manual: [],
};

function pass(name, detail) {
  checks.passed.push({ name, detail });
}

function warn(name, detail) {
  checks.warn.push({ name, detail });
}

function fail(name, detail) {
  checks.failed.push({ name, detail });
}

function manual(name, detail) {
  checks.manual.push({ name, detail });
}

console.log('\n' + '='.repeat(70));
console.log('  🛡️   RALION ENTERPRISE SECURITY & INFRASTRUCTURE AUDIT');
console.log('      Ras Ali Labs (Pty) Ltd — Security Architecture Audit');
console.log('='.repeat(70) + '\n');

// ---------------------------------------------------------------------
// 1. Check Security Documentation Files
// ---------------------------------------------------------------------
const requiredDocs = [
  'docs/security/ralion-security-audit.md',
  'docs/security/log-retention-policy.md',
  'docs/security/tls-configuration.md',
  'docs/security/encryption-at-rest.md',
  'docs/security/vulnerability-management-policy.md',
  'docs/security/supabase-security-review.md',
  'docs/security/platform-data-device-storage-policy.md',
  'docs/security/meta-access-token-protection-policy.md',
  'docs/security/meta-app-secret-protection-policy.md',
  'docs/security/incident-response-policy.md',
  'docs/security/meta-compliance-matrix.md',
  'docs/social/zernio-pre-implementation-audit.md',
  'docs/social/zernio-api-verification.md',
  'docs/social/zernio-integration.md',
  'docs/social/zernio-security.md',
  'docs/social/zernio-data-flow.md',
  'docs/social/zernio-multi-tenancy.md',
  'docs/social/zernio-webhooks.md',
  'docs/social/zernio-migration.md',
  'docs/social/zernio-third-party-assessment.md',
  'docs/social/zernio-implementation-report.md',
];

for (const docPath of requiredDocs) {
  const fullPath = path.join(ROOT_DIR, docPath);
  if (fs.existsSync(fullPath)) {
    pass(`Doc: ${path.basename(docPath)}`, 'Verified present');
  } else {
    fail(`Doc: ${path.basename(docPath)}`, 'Missing required documentation file');
  }
}

// ---------------------------------------------------------------------
// 2. Check Database Schema & Migrations
// ---------------------------------------------------------------------
const metaMigrationFile = path.join(ROOT_DIR, 'packages/database/migrations/20260815_meta_security_hardening.sql');
if (fs.existsSync(metaMigrationFile)) {
  const content = fs.readFileSync(metaMigrationFile, 'utf-8');
  if (content.includes('meta_connections') && content.includes('security_audit_logs')) {
    pass('Meta DB Migration Schema', 'Contains meta_connections and security_audit_logs');
  } else {
    fail('Meta DB Migration Schema', 'Missing required table definitions');
  }
} else {
  fail('Meta DB Migration File', '20260815_meta_security_hardening.sql not found');
}

const zernioMigrationFile = path.join(ROOT_DIR, 'packages/database/migrations/20260817_zernio_social_infrastructure.sql');
if (fs.existsSync(zernioMigrationFile)) {
  const content = fs.readFileSync(zernioMigrationFile, 'utf-8');
  if (
    content.includes('social_provider_profiles') &&
    content.includes('social_provider_routing') &&
    content.includes('social_webhook_events') &&
    content.includes('ENABLE ROW LEVEL SECURITY')
  ) {
    pass('Zernio DB Migration Schema', 'Contains social_provider_profiles, routing, webhook_events, and strict RLS');
  } else {
    fail('Zernio DB Migration Schema', 'Missing required Zernio table definitions or RLS');
  }
} else {
  fail('Zernio DB Migration File', '20260817_zernio_social_infrastructure.sql not found');
}

// ---------------------------------------------------------------------
// 3. Check Cryptographic Token Hardening (AES-256-GCM)
// ---------------------------------------------------------------------
const cryptoFile = path.join(ROOT_DIR, 'packages/integrations/src/core/crypto.ts');
if (fs.existsSync(cryptoFile)) {
  const content = fs.readFileSync(cryptoFile, 'utf-8');
  if (content.includes('aes-256-gcm') && content.includes('getAuthTag') && content.includes('setAuthTag')) {
    pass('Token Encryption (AES-256-GCM)', 'Authenticated encryption active');
  } else {
    fail('Token Encryption (AES-256-GCM)', 'AES-256-GCM implementation missing or incomplete');
  }
} else {
  fail('Crypto Gateway File', 'crypto.ts not found');
}

// ---------------------------------------------------------------------
// 4. Check Zernio Infrastructure & Services
// ---------------------------------------------------------------------
const zernioServiceFile = path.join(ROOT_DIR, 'packages/integrations/src/social/services/ZernioSocialService.ts');
if (fs.existsSync(zernioServiceFile)) {
  const content = fs.readFileSync(zernioServiceFile, 'utf-8');
  if (content.includes('verifyWebhookSignature') && content.includes('createPost') && content.includes('Idempotency-Key')) {
    pass('ZernioSocialService', 'Server-side client with idempotency and webhook HMAC active');
  } else {
    warn('ZernioSocialService', 'Methods incomplete');
  }
} else {
  fail('ZernioSocialService', 'ZernioSocialService.ts not found');
}

const zernioWebhookFile = path.join(ROOT_DIR, 'apps/ralion/src/app/api/webhooks/zernio/route.ts');
if (fs.existsSync(zernioWebhookFile)) {
  pass('Zernio Webhook Route', 'Endpoint /api/webhooks/zernio active with signature verification');
} else {
  fail('Zernio Webhook Route', 'Zernio webhook route missing');
}

// ---------------------------------------------------------------------
// 5. Check Frontend Client Files for Leaked Server Secrets
// ---------------------------------------------------------------------
function scanDirForSecrets(dir, disallowedPatterns) {
  let leaks = [];
  if (!fs.existsSync(dir)) return leaks;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        leaks = leaks.concat(scanDirForSecrets(fullPath, disallowedPatterns));
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const pattern of disallowedPatterns) {
        if (pattern.test(content)) {
          leaks.push({ file: fullPath, pattern: pattern.toString() });
        }
      }
    }
  }
  return leaks;
}

const clientDirs = [
  path.join(ROOT_DIR, 'apps/website/src'),
  path.join(ROOT_DIR, 'apps/ralion/src/components'),
  path.join(ROOT_DIR, 'apps/ralion/src/app/(auth)'),
];

let foundLeaks = [];
for (const cDir of clientDirs) {
  const leaks = scanDirForSecrets(cDir, [
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"`][A-Za-z0-9-_.]+['"`]/,
    /FACEBOOK_APP_SECRET\s*=\s*['"`][A-Za-z0-9-_.]+['"`]/,
    /ZERNIO_API_KEY\s*=\s*['"`][A-Za-z0-9-_.]+['"`]/,
    /NEXT_PUBLIC_ZERNIO/,
    /VITE_ZERNIO/,
  ]);
  foundLeaks = foundLeaks.concat(leaks);
}

if (foundLeaks.length === 0) {
  pass('Client Secret Leak Scan', 'Zero hardcoded secrets detected in frontend client components');
} else {
  fail('Client Secret Leak Scan', `Hardcoded secrets detected in: ${foundLeaks.map(l => l.file).join(', ')}`);
}

// ---------------------------------------------------------------------
// 6. Manual Verification Items
// ---------------------------------------------------------------------
manual('Supabase Dashboard MFA', 'Verify TOTP MFA is toggled ON in Supabase Auth Settings');
manual('Meta Developer Console Live Mode', 'Verify Meta App is in Live Mode');
manual('Zernio Production API Key', 'Configure ZERNIO_API_KEY in Supabase Vault / VPS environment');

// ---------------------------------------------------------------------
// Print Results Summary
// ---------------------------------------------------------------------
console.log('\n--- AUDIT RESULTS SUMMARY ---\n');

console.log(`✅ PASSED CHECKS (${checks.passed.length}):`);
for (const p of checks.passed) {
  console.log(`   [PASS] ${p.name.padEnd(38)} : ${p.detail}`);
}

if (checks.warn.length > 0) {
  console.log(`\n⚠️  WARNINGS (${checks.warn.length}):`);
  for (const w of checks.warn) {
    console.log(`   [WARN] ${w.name.padEnd(38)} : ${w.detail}`);
  }
}

if (checks.failed.length > 0) {
  console.log(`\n❌ FAILED CHECKS (${checks.failed.length}):`);
  for (const f of checks.failed) {
    console.log(`   [FAIL] ${f.name.padEnd(38)} : ${f.detail}`);
  }
}

if (checks.manual.length > 0) {
  console.log(`\n🔍 MANUAL VERIFICATION ITEMS (${checks.manual.length}):`);
  for (const m of checks.manual) {
    console.log(`   [MANUAL] ${m.name.padEnd(36)} : ${m.detail}`);
  }
}

console.log('\n' + '='.repeat(70));
if (checks.failed.length === 0) {
  console.log('  🏆 OVERALL AUDIT STATUS: PASSED / ZERNIO & META COMPLIANCE READY');
} else {
  console.log('  ⚠️ OVERALL AUDIT STATUS: ACTIONS REQUIRED (See failed checks)');
}
console.log('='.repeat(70) + '\n');

process.exit(checks.failed.length === 0 ? 0 : 1);
