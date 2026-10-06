const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('apps/ralion/src/lib/api-config.ts', 'utf8');

assert.match(source, /function isTerminalRefreshFailure\(error: any\)/);
assert.match(source, /refresh_token_not_found/);
assert.match(source, /auth session missing/i);
assert.match(source, /await clearTerminalBrowserSession\(refreshed\.error\)/);
assert.match(source, /'ralion-app-auth-token'/);
assert.match(source, /'ralion_active_workspace_id'/);
assert.match(source, /error: 'AUTH_SESSION_EXPIRED'/);
assert.match(source, /else if \(_terminalRefreshFailure\)/);
assert.match(source, /redirectToRalionLoginAfterSessionExpiry\(\)/);

const retryIndex = source.indexOf("body?.code === 'AUTH_TOKEN_INVALID'");
const expiredIndex = source.indexOf("error: 'AUTH_SESSION_EXPIRED'");
assert(retryIndex > 0 && expiredIndex > retryIndex, 'expired-session recovery must remain scoped to AUTH_TOKEN_INVALID retry handling');

const terminalMatcher = source.match(/function isTerminalRefreshFailure[\s\S]*?\n}/)?.[0] || '';
assert(!/status\s*===\s*500/.test(terminalMatcher), 'transient/server failures must not be treated as terminal refresh-token failures');

console.log('PASS: revoked refresh tokens are purged and surfaced as AUTH_SESSION_EXPIRED without weakening auth checks.');
