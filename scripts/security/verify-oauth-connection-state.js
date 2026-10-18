#!/usr/bin/env node
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');
const social = read('apps/ralion/src/lib/services/social.service.ts');
const statusRoute = read('apps/ralion/src/app/api/oauth/[provider]/status/route.ts');
const refreshRoute = read('apps/ralion/src/app/api/oauth/[provider]/refresh/route.ts');
const connectRoute = read('apps/ralion/src/app/api/oauth/[provider]/connect/route.ts');
const callbackRoute = read('apps/ralion/src/app/api/oauth/[provider]/callback/route.ts');
const disconnect = read('apps/ralion/src/lib/services/social/socialDisconnect.service.ts');
const connectionsRoute = read('apps/ralion/src/app/api/social/connections/route.ts');
const growth = read('apps/ralion/src/app/(dashboard)/growth/page.tsx');
const migration = read('supabase/migrations/20261017190000_oauth_connection_state_workspace_isolation.sql');
const metaWorkspaceMigration = read('packages/database/migrations/20260923053000_meta_credentials_workspace_unique.sql');

const failures = [];
const requireCheck = (condition, message) => {
  if (!condition) failures.push(message);
};

requireCheck(
  social.includes('requireOAuthTenantScope') &&
  social.includes(".eq('organization_id', tenant.organizationId)") &&
  social.includes(".eq('workspace_id', tenant.workspaceId)"),
  'OAuth token resolution must require canonical organization + workspace scope.'
);
requireCheck(
  social.includes("disconnected_at: null") &&
  social.includes("health_error_message: null"),
  'Reconnect/refresh must clear stale disconnected and health-error state.'
);
requireCheck(
  social.includes('persistRefreshedOAuthTokens') &&
  social.includes("token_status: 'TOKEN_VALID'"),
  'Provider refresh must durably restore canonical connection state.'
);
requireCheck(
  social.includes('tiktokAdapter') && social.includes("grant_type: 'refresh_token'"),
  'TikTok refresh must use the real provider refresh-token grant.'
);

requireCheck(
  statusRoute.includes('organizationId: required.context.organization.id') &&
  statusRoute.includes('workspaceId: required.context.workspace.id') &&
  statusRoute.includes('loadAllUserAccounts(user.id, scope)') &&
  statusRoute.includes('loadOAuthTokens(user.id, provider, scope)'),
  'OAuth status must resolve only the authenticated tenant/workspace.'
);

requireCheck(
  refreshRoute.includes('REFRESH_TOKEN_NOT_ACCEPTED') &&
  refreshRoute.includes('persistRefreshedOAuthTokens') &&
  refreshRoute.includes('xAdapter.refreshAccessToken') &&
  refreshRoute.includes('youtubeAdapter.refreshToken') &&
  refreshRoute.includes('tiktokAdapter.refreshAccessToken'),
  'OAuth refresh must reject browser secrets, call real providers, and persist results.'
);
requireCheck(
  !refreshRoute.includes('getConnectorForProvider') &&
  !refreshRoute.includes("refreshed_access_token_"),
  'OAuth refresh must never use the generic/mock connector.'
);

requireCheck(
  connectRoute.includes('verifierStateId') &&
  connectRoute.includes('oauth_verifier_${provider}_${verifierStateId}'),
  'PKCE verifier storage must be bound to one signed OAuth attempt.'
);
requireCheck(
  callbackRoute.includes('provider_state_mismatch') &&
  callbackRoute.includes('verified.provider.trim().toLowerCase() !== provider.trim().toLowerCase()') &&
  callbackRoute.includes('verifierCookieName'),
  'OAuth callback must bind signed state to both provider and PKCE attempt.'
);

requireCheck(
  disconnect.includes(".eq('organization_id', tenantId)") &&
  disconnect.includes(".eq('workspace_id', workspaceId)") &&
  disconnect.includes(".eq('user_id', userId)") &&
  !disconnect.includes('workspace_id.eq.${workspaceId},user_id.eq.${userId}'),
  'Disconnect must use conjunctive tenant/workspace/user ownership, never OR broadening.'
);

requireCheck(
  connectionsRoute.includes(".in('token_status', ['TOKEN_VALID', 'TOKEN_EXPIRING'])") &&
  connectionsRoute.includes(".is('disconnected_at', null)"),
  'Connected-account API must hide expired/revoked/disconnected records.'
);

requireCheck(
  !growth.includes('AuthService.linkSocialAccount(providerKey)') &&
  !growth.includes(".from('social_connections').upsert") &&
  growth.includes("await authFetch('/api/social/connections'") &&
  growth.includes('const authoritativeAccounts = await loadConnectedAccounts()'),
  'Growth connection state must be server-authoritative with no split-brain OAuth/database fallback.'
);

requireCheck(
  migration.includes('idx_social_connections_workspace_user_provider_account_unique') &&
  migration.includes('idx_social_account_tokens_workspace_user_provider_unique') &&
  metaWorkspaceMigration.includes('idx_meta_connections_workspace_identity_unique') &&
  metaWorkspaceMigration.includes('(workspace_id, user_id, provider, meta_user_id)'),
  'Database uniqueness must include workspace for OAuth connection/token identities.'
);
requireCheck(
  migration.includes('REVOKE ALL ON public.social_account_tokens FROM anon, authenticated') &&
  migration.includes('social_account_tokens_service_role_only'),
  'Legacy OAuth token vault must be server-only.'
);

if (failures.length) {
  console.error(`[security:oauth-connection-state] FAILED — ${failures.length} invariant(s).`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log('[security:oauth-connection-state] PASS — OAuth state, refresh, disconnect, tenant uniqueness, and Growth UI are server-authoritative and workspace isolated.');
