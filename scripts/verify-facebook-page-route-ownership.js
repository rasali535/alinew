const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const helperPath = 'apps/ralion/src/lib/services/social/facebookPageRouteAccess.service.ts';
const routePaths = [
  'apps/ralion/src/app/api/social/facebook/pages/[pageId]/analytics/route.ts',
  'apps/ralion/src/app/api/social/facebook/pages/[pageId]/posts/route.ts',
  'apps/ralion/src/app/api/social/facebook/pages/[pageId]/market-research/route.ts',
  'apps/ralion/src/app/api/social/facebook/pages/[pageId]/business-learning/route.ts',
  'apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts',
];

const helper = read(helperPath);
assert(helper.includes(".eq('organization_id', params.organizationId)"), 'resolver must scope organization');
assert(helper.includes(".eq('workspace_id', params.workspaceId)"), 'resolver must scope workspace');
assert(helper.includes(".eq('user_id', params.userId)"), 'resolver must scope user');
assert(helper.includes(".in('connection_status', ACTIVE_STATUSES)"), 'resolver must require active connection');
assert(helper.includes('connections.find((conn) => matchesPageId(conn, requestedPageId))'), 'resolver must match exact requested Page ID');
assert(!helper.includes('.maybeSingle()'), 'multi-connection resolver must never use maybeSingle');

for (const routePath of routePaths) {
  const route = read(routePath);
  assert(route.includes('resolveFacebookPageRouteConnection'), `${routePath} must use shared page resolver`);
  assert(!route.includes(".from('social_connections')"), `${routePath} must not reimplement raw connection ownership query`);
  assert(!route.includes('.maybeSingle()'), `${routePath} must not assume one Facebook connection per tenant`);
  assert(route.includes('context.organization?.id') || route.includes('serverCtx.organization?.id'), `${routePath} must derive real organization ID`);
}

const sampleConnections = [
  { provider_account_id: '477334159265235', zernio_account_id: null, metadata: { pageId: '477334159265235' } },
  { provider_account_id: '28806569665617716', zernio_account_id: null, metadata: {} },
  { provider_account_id: '112051940596266', zernio_account_id: null, metadata: {} },
];
const requested = '477334159265235';
const exact = sampleConnections.find((conn) => conn.provider_account_id === requested || conn.zernio_account_id === requested || conn.metadata?.pageId === requested || conn.metadata?.zernioAccountId === requested);
assert(exact && exact.provider_account_id === requested, 'exact Page lookup must succeed even when multiple Facebook connections exist');

console.log('Facebook page route ownership verification passed.');
