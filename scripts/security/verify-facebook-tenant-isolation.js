#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const pageService = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/services/social/facebookPageManagement.service.ts'), 'utf8');
const serverAuth = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/auth/serverAuth.ts'), 'utf8');

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
forbid(pageService, /MetaCredentialService\.getValidToken/, 'User-global Meta token fallback is forbidden for Page operations.');
forbid(pageService, /default-(?:tenant|workspace|org|user)/, 'Synthetic default tenant identifiers are forbidden.');
forbid(pageService, /totalReach\s*\*\s*1\.4/, 'Derived impressions from reach are forbidden.');

requirePattern(pageService, /\.eq\('organization_id',\s*tenantId\)/, 'Facebook connection queries must be tenant-scoped.');
requirePattern(pageService, /\.eq\('user_id',\s*userId\)/, 'Facebook connection queries must be authenticated-user scoped.');
requirePattern(pageService, /SocialTokenManager\.getValidToken\(conn\.id,\s*'facebook'\)/, 'Direct Graph access must use the selected connection token path.');
requirePattern(pageService, /requireTenantId\(/, 'Facebook Page operations must fail closed without canonical tenant context.');
requirePattern(pageService, /requireUserId\(/, 'Facebook Page operations must fail closed without authenticated user context.');

forbid(serverAuth, /https:\/\/yidsfihagwttlmhfynmf\.supabase\.co/, 'Server auth must not hardcode a production Supabase project URL.');
forbid(serverAuth, /targetWorkspaceId\s*=\s*primaryWorkspaceId/, 'Unauthorized tenant requests must not silently fall back to another workspace.');
requirePattern(serverAuth, /workspace_members/, 'Server auth must verify workspace membership for non-owner tenant access.');
requirePattern(serverAuth, /if \(error \|\| !member\) return null;/, 'Missing tenant membership must fail closed.');

if (failures.length) {
  console.error(`[security:facebook-isolation] FAILED — ${failures.length} invariant(s).`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[security:facebook-isolation] PASS — plaintext token fallbacks, synthetic tenant defaults, and unscoped tenant access guards are absent.');
