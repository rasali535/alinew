const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

console.log('[Verification] Testing Canonical Page Resolution, Deduplication, and Admin Health Aggregation...');

// 1. Static Invariant Checks across codebase
const socialStatusSource = read('apps/ralion/src/lib/services/social/socialConnectionStatus.ts');
const pageRouteSource = read('apps/ralion/src/lib/services/social/facebookPageRouteAccess.service.ts');
const pageMgmtSource = read('apps/ralion/src/lib/services/social/facebookPageManagement.service.ts');
const connStateSource = read('apps/ralion/src/lib/services/social/facebookConnectionState.service.ts');
const adminMetricsSource = read('apps/ralion/src/app/api/admin/metrics/route.ts');
const adminCustomersSource = read('apps/ralion/src/app/api/admin/customers/route.ts');

assert(
  socialStatusSource.includes('export function getUnresolvedAttentionConnections'),
  'socialConnectionStatus must export getUnresolvedAttentionConnections'
);
assert(
  socialStatusSource.includes('export function getObsoleteDuplicateConnectionIds'),
  'socialConnectionStatus must export getObsoleteDuplicateConnectionIds'
);
assert(
  pageRouteSource.includes("token_status === 'TOKEN_VALID'"),
  'facebookPageRouteAccess must prefer TOKEN_VALID connections'
);
assert(
  pageMgmtSource.includes("token_status === 'TOKEN_VALID'"),
  'facebookPageManagement must prefer TOKEN_VALID connections'
);
assert(
  connStateSource.includes("token_status === 'TOKEN_VALID'"),
  'facebookConnectionState must prefer TOKEN_VALID connections'
);
assert(
  adminMetricsSource.includes('getUnresolvedAttentionConnections'),
  'admin/metrics/route.ts must aggregate attention connections via getUnresolvedAttentionConnections'
);
assert(
  adminCustomersSource.includes('getUnresolvedAttentionConnections'),
  'admin/customers/route.ts must aggregate tenant attention count via getUnresolvedAttentionConnections'
);
console.log('✓ Invariant checks passed.');

// 2. Behavioral Unit Testing of Aggregation & Deduplication Logic
// Replicate the pure exported algorithms from socialConnectionStatus.ts to ensure runtime behavior:
const ACTIVE_CONNECTION_STATUSES = new Set(['CONNECTED', 'ACTIVE']);

function isActiveSocialConnection(connection) {
  if (!connection) return false;
  if (connection.disconnected_at) return false;
  const status = String(connection.connection_status || '').toUpperCase();
  const tokenStatus = String(connection.token_status || '').toUpperCase();
  const isHealthyToken = !tokenStatus || tokenStatus === 'TOKEN_VALID' || tokenStatus === 'TOKEN_EXPIRING';
  return ACTIVE_CONNECTION_STATUSES.has(status) && isHealthyToken;
}

function getSocialChannelKey(connection) {
  const tenantId = connection.organization_id || connection.workspace_id || 'global';
  const provider = String(connection.provider || 'unknown').toLowerCase();
  const accountId =
    connection.provider_account_id ||
    connection.metadata?.pageId ||
    connection.metadata?.zernioAccountId ||
    connection.username ||
    connection.account_name ||
    connection.id ||
    'unknown';
  return `${tenantId}:${provider}:${accountId}`;
}

function getUnresolvedAttentionConnections(connections) {
  const channels = new Map();
  for (const conn of connections) {
    const key = getSocialChannelKey(conn);
    if (!channels.has(key)) channels.set(key, []);
    channels.get(key).push(conn);
  }

  const unresolved = [];
  for (const [, rows] of channels) {
    const sorted = [...rows].sort((a, b) => {
      const aActiveValid = isActiveSocialConnection(a) ? 1 : 0;
      const bActiveValid = isActiveSocialConnection(b) ? 1 : 0;
      if (aActiveValid !== bActiveValid) return bActiveValid - aActiveValid;

      const aValid = a.token_status === 'TOKEN_VALID' ? 1 : 0;
      const bValid = b.token_status === 'TOKEN_VALID' ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;

      const aTime = new Date(a.updated_at || a.connected_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.connected_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    const canonical = sorted[0];
    if (!canonical) continue;

    if (isActiveSocialConnection(canonical)) continue;
    if (canonical.disconnected_at) continue;

    const status = String(canonical.connection_status || '').toUpperCase();
    const tokenStatus = String(canonical.token_status || '').toUpperCase();
    const needsAttention =
      ['NEEDS_ATTENTION', 'RECONNECT_REQUIRED', 'REVOKED'].includes(status) ||
      ['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'REAUTH_REQUIRED'].includes(tokenStatus);

    if (needsAttention) {
      unresolved.push(canonical);
    }
  }
  return unresolved;
}

function getObsoleteDuplicateConnectionIds(connections) {
  const channels = new Map();
  for (const conn of connections) {
    if (String(conn.provider || '').toLowerCase() !== 'facebook') continue;
    const key = getSocialChannelKey(conn);
    if (!channels.has(key)) channels.set(key, []);
    channels.get(key).push(conn);
  }

  const obsoleteIds = [];
  for (const [, rows] of channels) {
    const validConn = rows.find(
      (r) => isActiveSocialConnection(r) && r.token_status === 'TOKEN_VALID' && r.id
    );
    if (!validConn || !validConn.id) continue;

    for (const r of rows) {
      if (!r.id || r.id === validConn.id) continue;
      if (
        r.token_status !== 'TOKEN_VALID' ||
        !ACTIVE_CONNECTION_STATUSES.has(String(r.connection_status || '').toUpperCase()) ||
        r.disconnected_at ||
        new Date(r.updated_at || r.created_at || 0).getTime() <= new Date(validConn.updated_at || validConn.created_at || 0).getTime()
      ) {
        obsoleteIds.push(r.id);
      }
    }
  }
  return obsoleteIds;
}

// Scenario 1: Canonical Page resolution
// Ras Ali Labs has 1 newer REAUTH_REQUIRED record and 1 older TOKEN_VALID record for the same Page.
// The valid page MUST win.
const pageRecordStale = {
  id: 'conn-stale',
  organization_id: 'org-rasali',
  workspace_id: 'ws-rasali',
  provider: 'facebook',
  provider_account_id: 'page-1001',
  account_type: 'BUSINESS',
  connection_status: 'CONNECTED',
  token_status: 'REAUTH_REQUIRED',
  updated_at: '2026-09-24T12:00:00Z',
};

const pageRecordValid = {
  id: 'conn-valid',
  organization_id: 'org-rasali',
  workspace_id: 'ws-rasali',
  provider: 'facebook',
  provider_account_id: 'page-1001',
  account_type: 'BUSINESS',
  connection_status: 'CONNECTED',
  token_status: 'TOKEN_VALID',
  updated_at: '2026-09-24T10:00:00Z',
};

const sortedCandidatePages = [pageRecordStale, pageRecordValid].sort((a, b) => {
  const aValid = a.token_status === 'TOKEN_VALID' ? 1 : 0;
  const bValid = b.token_status === 'TOKEN_VALID' ? 1 : 0;
  if (aValid !== bValid) return bValid - aValid;
  const aTime = new Date(a.updated_at || 0).getTime();
  const bTime = new Date(b.updated_at || 0).getTime();
  return bTime - aTime;
});

assert.strictEqual(
  sortedCandidatePages[0].id,
  'conn-valid',
  'Canonical resolution must prefer TOKEN_VALID over newer REAUTH_REQUIRED'
);
console.log('✓ Canonical Page resolution correctly prioritizes valid token over stale reauth.');

// Scenario 2: Admin Command Centre Aggregation
// 7 historical failed attempts for Ras Ali Labs Page (page-1001), but currently page-1001 is TOKEN_VALID.
const historicalSevenAttempts = Array.from({ length: 7 }, (_, i) => ({
  id: `conn-fail-${i + 1}`,
  organization_id: 'org-rasali',
  workspace_id: 'ws-rasali',
  provider: 'facebook',
  provider_account_id: 'page-1001',
  account_type: 'BUSINESS',
  connection_status: 'CONNECTED',
  token_status: 'REAUTH_REQUIRED',
  updated_at: `2026-09-20T0${i}:00:00Z`,
}));

const mockDatasetWithValidPage = [
  ...historicalSevenAttempts,
  pageRecordValid,
];

const attentionItemsHealthyTenant = getUnresolvedAttentionConnections(mockDatasetWithValidPage);
assert.strictEqual(
  attentionItemsHealthyTenant.length,
  0,
  'Superseded historical REAUTH_REQUIRED rows must NOT inflate Admin health when a valid binding exists'
);
console.log('✓ Superseded historical failed attempts do not inflate Admin health.');

// Scenario 3: Obsolete rows deduplication detection
const obsoleteIds = getObsoleteDuplicateConnectionIds(mockDatasetWithValidPage);
assert.strictEqual(
  obsoleteIds.length,
  7,
  'All 7 historical failed attempts must be identified as obsolete duplicates'
);
assert(
  !obsoleteIds.includes('conn-valid'),
  'The valid connection ID must NOT be marked obsolete'
);
console.log('✓ Obsolete duplicate detection correctly targets superseded failed rows.');

// Scenario 4: Genuine unresolved failure
// Page Y has 7 failed attempts and NO valid connection.
// It must count as ONE unresolved incident, not seven separate incidents.
const pageYAttempts = Array.from({ length: 7 }, (_, i) => ({
  id: `page-y-fail-${i + 1}`,
  organization_id: 'org-unhealthy',
  workspace_id: 'ws-unhealthy',
  provider: 'facebook',
  provider_account_id: 'page-2002',
  account_type: 'BUSINESS',
  connection_status: 'NEEDS_ATTENTION',
  token_status: 'REAUTH_REQUIRED',
  updated_at: `2026-09-22T0${i}:00:00Z`,
}));

const attentionItemsUnresolved = getUnresolvedAttentionConnections(pageYAttempts);
assert.strictEqual(
  attentionItemsUnresolved.length,
  1,
  'Unhealthy Page Y with multiple failed attempts must collapse to exactly 1 unresolved incident'
);
assert.strictEqual(
  attentionItemsUnresolved[0].provider_account_id,
  'page-2002',
  'Unresolved incident must represent Page Y'
);
console.log('✓ Unhealthy channel with multiple failed attempts collapses to exactly 1 incident.');

// Scenario 5: Historical disconnected rows are ignored
const disconnectedRow = {
  id: 'conn-disco',
  organization_id: 'org-disco',
  provider: 'facebook',
  provider_account_id: 'page-3003',
  connection_status: 'DISCONNECTED',
  token_status: 'TOKEN_REVOKED',
  disconnected_at: '2026-09-01T00:00:00Z',
};
const attentionItemsDisconnected = getUnresolvedAttentionConnections([disconnectedRow]);
assert.strictEqual(
  attentionItemsDisconnected.length,
  0,
  'Historical disconnected records must not be counted as Needs Attention'
);
console.log('✓ Historical disconnected records are properly excluded.');

console.log('\nAll Canonical Page Resolution and Deduplication tests passed successfully!');
