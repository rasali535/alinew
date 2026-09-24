const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

function expect(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`[Growth/Social/Admin] Missing invariant: ${label}`);
}

const growth = read('apps/ralion/src/app/(dashboard)/growth/page.tsx');
const inboxRoute = read('apps/ralion/src/app/api/social/inbox/route.ts');
const inboxService = read('apps/ralion/src/lib/services/social/socialInbox.service.ts');
const publishRoute = read('apps/ralion/src/app/api/social/publish/route.ts');
const adminMetrics = read('apps/ralion/src/app/api/admin/metrics/route.ts');
const adminCustomers = read('apps/ralion/src/app/api/admin/customers/route.ts');
const adminPage = read('apps/ralion/src/app/admin/page.tsx');

// Growth must reset account-specific state and scope every fetch/action to the exact selection.
expect(growth, 'Account switching is an isolation boundary', 'account changes explicitly reset provider-specific UI state');
expect(growth, 'fetchPostsForConnection(selectedConn.id)', 'post feed follows the selected connection');
expect(growth, 'setInboxConversations([])', 'inbox state is cleared during account changes');
expect(growth, 'socialConnectionId: targetConn.id', 'publishing targets the selected connection');
expect(growth, 'platforms: [targetPlatform]', 'publishing sends the selected provider');
expect(growth, 'Publish to {selectedPlatformLabel}', 'publishing CTA names the selected provider');
expect(growth, "selectedPlatform === 'instagram' ? 'Instagram Inbox'", 'inbox heading follows Instagram selection');

// Inbox reads and replies must fail closed around provider + connection identity.
expect(inboxRoute, "searchParams.get('connectionId')", 'inbox API accepts the selected connection ID');
expect(inboxRoute, 'provider,\n      connectionId,', 'inbox read passes provider and connection to the service');
expect(inboxRoute, 'connectionId,\n      provider:', 'inbox reply passes connection and provider to the service');
expect(inboxService, 'SOCIAL_CONNECTION_REQUIRED', 'inbox service rejects unbound selected connections');

// Publishing failures preserve actionable platform details instead of flattening every 422.
expect(publishRoute, 'socialConnectionId,', 'publish route accepts selected social connection');
expect(publishRoute, 'result.statusCode', 'publish route preserves service HTTP status');
expect(publishRoute, 'platformResults: sanitizedPlatformResults', 'publish route returns safe provider results');

// Command Centre must expose Facebook and Instagram separately and surface unhealthy tokens.
expect(adminMetrics, 'connectedInstagramAccounts', 'admin metrics count active Instagram accounts');
expect(adminMetrics, 'connectedFacebookAccounts', 'admin metrics count active Facebook accounts');
expect(adminMetrics, 'socialAttentionCount', 'admin metrics count reconnect-required accounts');
expect(adminMetrics, 'socialAlerts:', 'admin metrics return actionable social alerts');
expect(adminCustomers, 'socialConnections:', 'tenant directory returns provider-aware social bindings');
expect(adminCustomers, 'socialProviderCounts', 'tenant directory summarizes providers');
expect(adminPage, 'Reconnect required', 'Admin UI displays reconnect-required accounts');
expect(adminPage, 'Instagram', 'Admin UI displays Instagram telemetry');
expect(adminPage, 'Last sync:', 'Admin UI displays channel sync freshness');

console.log('Growth, Social and Admin account-awareness contract: PASS');
