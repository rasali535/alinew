#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const service = fs.readFileSync(
  path.join(root, 'apps/ralion/src/lib/services/social/socialPublishing.service.ts'),
  'utf8'
);
const route = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/api/social/posts/route.ts'),
  'utf8'
);
const migration = fs.readFileSync(
  path.join(root, 'packages/database/migrations/20260914131558_social_posts_canonical_publication_history.sql'),
  'utf8'
);

const checks = [
  ['service requires canonical tenant context', service.includes("'TENANT_CONTEXT_REQUIRED'") && !service.includes("'default-org'") && !service.includes("'default-ws'")],
  ['organization is persisted with history', service.includes('organization_id: params.organizationId')],
  ['PostgREST insert errors are checked', service.includes('error: insertError') && service.includes("'PUBLICATION_HISTORY_PERSISTENCE_FAILED'")],
  ['synthetic receipt does not expose the idempotency key', service.includes('pub_rec_${correlationHash}') && !service.includes('pub_rec_${idempotencyKey}')],
  ['completed dispatch survives history failure', service.includes('externalReceiptId: finalPostId')],
  ['history is scoped by organization and workspace', service.includes(".eq('organization_id', params.organizationId)") && service.includes(".eq('workspace_id', params.workspaceId)")],
  ['route no longer substitutes workspace for organization', route.includes('context.organization?.id') && !route.includes('actualOrgId = context.workspace.id')],
  ['route normalizes twitter to x', route.includes("twitter: 'x'")],
  ['route rejects unsafe media URLs', route.includes("parsed.protocol !== 'https:'") && route.includes('isPrivateOrLocalHostname')],
  ['route omits raw service result and conflict details', !route.includes('result,\n') && !route.includes('conflictDetails')],
  ['migration uses canonical directory and server-only grants', migration.includes('FORCE ROW LEVEL SECURITY') && migration.includes('FROM PUBLIC, anon, authenticated') && migration.includes('TO service_role')],
  ['migration includes tenant and array indexes', migration.includes('idx_social_posts_tenant_created') && migration.includes('USING gin (platforms)')],
];

let passed = 0;
for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  passed += 1;
  console.log(`PASS: ${name}`);
}
console.log(`Publication history hardening: ${passed}/${checks.length} checks passed.`);
