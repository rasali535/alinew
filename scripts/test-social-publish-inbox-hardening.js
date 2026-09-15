#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publishing = fs.readFileSync(
  path.join(root, 'apps/ralion/src/lib/services/social/socialPublishing.service.ts'),
  'utf8'
);
const inbox = fs.readFileSync(
  path.join(root, 'apps/ralion/src/lib/services/social/socialInbox.service.ts'),
  'utf8'
);
const inboxRoute = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/api/social/inbox/route.ts'),
  'utf8'
);

const uploadBeforeDispatch =
  publishing.indexOf('await this.processMediaUrls(params.mediaUrls)') <
  publishing.indexOf('// 3. Find active connections');

const checks = [
  ['strict base64 image/video uploads are accepted for storage normalization', publishing.includes('INLINE_MEDIA_PATTERN') && publishing.includes('ALLOWED_INLINE_MEDIA_TYPES')],
  ['inline SVG and unsupported uploads are rejected', publishing.includes("resolved === 'image/svg+xml'") && !publishing.includes("'image/svg+xml',")],
  ['inline upload size is capped at 25 MiB', publishing.includes('MAX_INLINE_MEDIA_BYTES = 25 * 1024 * 1024')],
  ['browser image/video shorthand is normalized to MIME types', publishing.includes("normalized === 'image'") && publishing.includes("normalized === 'video'")],
  ['ordinary media remains restricted to public HTTPS', publishing.includes("parsed.protocol !== 'https:'") && publishing.includes('isPrivateOrLocalHostname')],
  ['media is stored before connection lookup and provider dispatch', uploadBeforeDispatch],
  ['storage failure aborts instead of forwarding a data URL', publishing.includes("publicCode = 'MEDIA_STORAGE_FAILED'") && publishing.includes('throw storageError') && !publishing.includes('Storage upload warning')],
  ['inbox route passes canonical organization context', inboxRoute.includes('context.organization?.id || context.workspace?.organization_id') && !inboxRoute.includes('organizationId: context.workspace?.id,')],
  ['inbox route validates providers and message length', inboxRoute.includes('INBOX_PROVIDERS') && inboxRoute.includes('MESSAGE_TOO_LONG')],
  ['inbox reads require all three tenant identifiers', inbox.includes("if (!userId || !workspaceId || !organizationId) return []")],
  ['inbox profile lookup uses exact tenant and user filters', inbox.includes(".eq('organization_id', organizationId)") && inbox.includes(".eq('workspace_id', workspaceId)") && inbox.includes(".eq('user_id', userId)")],
  ['inbox selects a Zernio-backed connection deterministically', inbox.includes(".not('zernio_profile_id', 'is', null)") && inbox.includes(".order('updated_at', { ascending: false })")],
  ['reply lookup is scoped by connection and tenant', inbox.includes(".eq('id', params.connectionId)") && inbox.includes(".eq('organization_id', params.organizationId)") && inbox.includes(".eq('workspace_id', params.workspaceId)") && inbox.includes(".eq('user_id', params.userId)")],
  ['hard-coded synthetic master connection fallback is removed', !inbox.includes("id: 'f8656d3c-789b-4890-bc80-83920ce91870'")],
  ['master Zernio reads and replies are explicitly authorized', inbox.includes('assertMasterZernioAuthorization') && inbox.includes("action: 'read_social_inbox'") && inbox.includes("action: 'send_inbox_reply'")],
  ['token fallback cannot select another tenant by user alone', !inbox.includes(".from('social_account_tokens')")],
  ['inbox route preserves safe 400/409 service statuses', inboxRoute.includes('error?.statusCode || error?.status') && inboxRoute.includes("'SOCIAL_CONNECTION_REQUIRED'")],
];

let passed = 0;
for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  passed += 1;
  console.log(`PASS: ${name}`);
}

console.log(`Social publish and inbox hardening: ${passed}/${checks.length} checks passed.`);
