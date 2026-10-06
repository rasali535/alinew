const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('apps/ralion/src/lib/api-config.ts', 'utf8');
const orgContext = fs.readFileSync('packages/auth/src/OrganizationContext.tsx', 'utf8');
const authService = fs.readFileSync('apps/ralion/src/lib/services/auth.service.ts', 'utf8');
const growth = fs.readFileSync('apps/ralion/src/app/(dashboard)/growth/page.tsx', 'utf8');

assert.match(source, /function isTerminalRefreshFailure\(error: any\)/);
assert.match(source, /refresh_token_not_found/);
assert.match(source, /auth session missing/i);
assert.match(source, /clearTerminalBrowserSession\(refreshed\.error, failedAccessToken\)/);
assert.match(source, /readStoredBrowserSession/);
assert.match(source, /currentAccessToken !== failedAccessToken/);
assert.match(source, /Preserving newer session after stale refresh failure/);
assert.match(source, /'ralion-app-auth-token'/);
assert.match(source, /'ralion_active_workspace_id'/);
assert.match(source, /error: 'AUTH_SESSION_EXPIRED'/);
assert.match(source, /else if \(_terminalRefreshFailure\)/);
assert.match(source, /redirectToRalionLoginAfterSessionExpiry\(\)/);

// Automatic recovery must never revoke a server-side Supabase session.
const terminalCleanup = source.match(/async function clearTerminalBrowserSession[\s\S]*?\n}/)?.[0] || '';
assert(!terminalCleanup.includes('.auth.signOut('), 'automatic refresh cleanup must not call Supabase signOut');

const orgTerminalCleanup = orgContext.match(/async function terminateInvalidSession[\s\S]*?\n}/)?.[0] || '';
assert(!orgTerminalCleanup.includes('.auth.signOut('), 'OrganizationContext terminal recovery must not call Supabase signOut');
assert(orgTerminalCleanup.includes('currentAccessToken !== failedAccessToken'), 'OrganizationContext must preserve a newer replacement session');

const getSessionBlock = authService.match(/static async getSession\(\)[\s\S]*?\n  }\n\n  \/\*\*/)?.[0] || '';
assert(!getSessionBlock.includes('.auth.signOut('), 'AuthService.getSession must not sign out automatically after a refresh error');
assert(authService.includes("await this.supabase.auth.signOut({ scope: 'local' });"), 'explicit user logout should end only the current Supabase session');

const retryIndex = source.indexOf("body?.code === 'AUTH_TOKEN_INVALID'");
const expiredIndex = source.indexOf("error: 'AUTH_SESSION_EXPIRED'");
assert(retryIndex > 0 && expiredIndex > retryIndex, 'expired-session recovery must remain scoped to AUTH_TOKEN_INVALID retry handling');

const terminalMatcher = source.match(/function isTerminalRefreshFailure[\s\S]*?\n}/)?.[0] || '';
assert(!/status\s*===\s*500/.test(terminalMatcher), 'transient/server failures must not be treated as terminal refresh-token failures');

// Orphaned image runs must stop quickly and auth loss must terminate recovery.
assert(growth.includes('POSTER_RUN_RECOVERY_WINDOW_MS = 2 * 60 * 1000'), 'poster recovery window must not resurrect a 30-minute spinner');
assert(growth.includes('VIDEO_RUN_RECOVERY_WINDOW_MS = 15 * 60 * 1000'), 'video recovery keeps a longer bounded reconciliation window');
assert(growth.includes('res.status === 401 || res.status === 403'), 'creative recovery must stop immediately when the authenticated session changes');
assert(!growth.includes('CREATIVE_RUN_MAX_AGE_MS = 30 * 60 * 1000'), 'legacy 30-minute orphan spinner window must remain removed');

console.log('PASS: stale refresh failures cannot revoke newer sessions, and orphan creative spinners recover safely.');
