#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const pageService = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/services/social/facebookPageManagement.service.ts'), 'utf8');
const connectionState = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/services/social/facebookConnectionState.service.ts'), 'utf8');
const metaCredential = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/services/metaCredential.service.ts'), 'utf8');
const socialService = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/services/social.service.ts'), 'utf8');
const serverAuth = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/auth/serverAuth.ts'), 'utf8');
const postsByConnection = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/social/posts/by-connection/route.ts'), 'utf8');
const adminHealth = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/admin/system/health/route.ts'), 'utf8');

const failures = [];

function forbid(source, regex, message) {
  if (regex.test(source)) failures.push(message);
}

function requirePattern(source, regex, message) {
  if (!regex.test(source)) failures.push(message);
}

function selectedColumns(source) {
  const columns = [];
  const selectRegex = /\.select\(\s*(['"])(.*?)\1\s*\)/gs;
  for (const match of source.matchAll(selectRegex)) {
    columns.push(...match[2].split(',').map((value) => value.trim()));
  }
  return columns;
}

forbid(pageService, /metadata\?\.pageAccessToken/, 'Plaintext pageAccessToken read path is forbidden.');
forbid(pageService, /sat\?\.access_token/, 'Legacy plaintext social_account_tokens.access_token fallback is forbidden.');
if (selectedColumns(pageService).includes('access_token')) {
  failures.push('Queries must not select plaintext access_token columns.');
}
forbid(pageService, /MetaCredentialService\.getValidToken\(/, 'User-global Meta token fallback is forbidden for Page operations.');
forbid(pageService, /default-(?:tenant|workspace|org|user)/, 'Synthetic default tenant identifiers are forbidden.');
forbid(pageService, /totalReach\s*\*\s*1\.4/, 'Derived impressions from reach are forbidden.');
forbid(pageService, /[?&]access_token=/, 'Meta access tokens must never be placed in Graph API query strings.');
forbid(pageService, /\.from\(['"]social_account_tokens['"]\)/, 'Facebook Page management must not use user-global social_account_tokens rows.');

requirePattern(pageService, /\.eq\('organization_id',\s*tenantId\)/, 'Facebook connection queries must be tenant-scoped.');
requirePattern(pageService, /\.eq\('user_id',\s*userId\)/, 'Facebook connection queries must be authenticated-user scoped.');
requirePattern(pageService, /SocialTokenManager\.getValidToken\(conn\.id,\s*'facebook'\)/, 'Direct Graph access must use the selected connection token path.');
requirePattern(pageService, /MetaCredentialService\.getValidTokenForWorkspace\(userId,\s*workspaceId,\s*'facebook'\)/, 'Page selection must use an exact workspace-bound OAuth credential.');
requirePattern(pageService, /Authorization:\s*`Bearer \$\{fbToken\}`/, 'Direct Graph access must send Meta token in the Authorization header.');
requirePattern(pageService, /requireTenantId\(/, 'Facebook Page operations must fail closed without canonical tenant context.');
requirePattern(pageService, /requireUserId\(/, 'Facebook Page operations must fail closed without authenticated user context.');
forbid(connectionState, /\.or\(`workspace_id\.eq\.\$\{workspaceId\},user_id\.eq\.\$\{userId\}`\)/, 'Facebook state queries must not widen workspace scope with a user-global OR condition.');
requirePattern(connectionState, /MetaCredentialService\.getValidTokenForWorkspace\(userId,\s*workspaceId,\s*'facebook'\)/, 'Facebook state resolution must use the workspace-bound OAuth credential.');
requirePattern(metaCredential, /\.eq\('workspace_id',\s*workspaceId\)/, 'Workspace credential lookup must filter by workspace_id.');
requirePattern(metaCredential, /\.eq\('user_id',\s*userId\)/, 'Workspace credential lookup must filter by authenticated user_id.');
requirePattern(metaCredential, /satRow\.extra_meta\?\.workspaceId\s*!==\s*workspaceId/, 'Legacy Meta credential fallback must fail closed unless extra_meta.workspaceId exactly matches the requested workspace.');
requirePattern(socialService, /workspace_id:\s*tenant\.workspaceId/, 'Meta OAuth persistence must retain the validated signed workspace context.');
requirePattern(socialService, /requireOAuthTenantScope\(/, 'OAuth persistence must fail closed without canonical organization + workspace context.');

forbid(serverAuth, /https:\/\/yidsfihagwttlmhfynmf\.supabase\.co/, 'Server auth must not hardcode a production Supabase project URL.');
forbid(serverAuth, /targetWorkspaceId\s*=\s*primaryWorkspaceId/, 'Unauthorized tenant requests must not silently fall back to another workspace.');
requirePattern(serverAuth, /workspace_members/, 'Server auth must verify workspace membership for non-owner tenant access.');
requirePattern(serverAuth, /if \(error \|\| !member\) return null;/, 'Missing tenant membership must fail closed.');
requirePattern(postsByConnection, /\.eq\('workspace_id',\s*context\.workspace\.id\)[\s\S]{0,180}\.eq\('organization_id',\s*context\.organization\.id\)[\s\S]{0,180}\.eq\('user_id',\s*context\.user\.id\)/, 'Posts-by-connection lookup must enforce workspace, organization, and authenticated user scope.');
requirePattern(postsByConnection, /\.from\('social_posts'\)[\s\S]{0,700}\.eq\('social_connection_id',\s*socialConnectionId\)[\s\S]{0,400}\.eq\('organization_id',\s*context\.organization\.id\)[\s\S]{0,400}\.eq\('workspace_id',\s*context\.workspace\.id\)[\s\S]{0,400}\.eq\('user_id',\s*context\.user\.id\)/, 'Connection-bound local publication history must remain fully tenant and user scoped.');
requirePattern(adminHealth, /Cross-Tenant Social Connection Isolation/, 'Admin health must expose the social connection isolation canary.');
requirePattern(adminHealth, /RALION_SOCIAL_ISOLATION_FOREIGN_CONNECTION_ID/, 'Social isolation canary must use an explicit foreign connection.');
requirePattern(adminHealth, /if \(foreign\?\.id\) throw new Error\('Cross-tenant social isolation failed:/, 'Social isolation canary must fail closed if a foreign connection resolves.');


if (failures.length) {
  console.error(`[security:facebook-isolation] FAILED — ${failures.length} invariant(s).`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[security:facebook-isolation] PASS — tenant-scoped token handling, Graph authorization headers, and fail-closed access guards are enforced.');
