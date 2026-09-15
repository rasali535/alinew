const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inspectorPath = path.join(
  root,
  'apps/ralion/src/app/api/admin/organizations/[id]/route.ts'
);
const inspectorSource = fs.readFileSync(inspectorPath, 'utf8');

const checks = [
  [
    'tenant inspector scopes social connections by organization',
    inspectorSource.includes(".eq('organization_id', organizationId)"),
  ],
  [
    'tenant inspector does not select token-bearing wildcard rows',
    !inspectorSource.includes(".from('social_connections')\n      .select('*')"),
  ],
  [
    'active Facebook state is derived from live connection records',
    inspectorSource.includes("provider === 'facebook'") &&
      inspectorSource.includes("connectionStatus === 'CONNECTED'") &&
      inspectorSource.includes("metaStatus = 'CONNECTED'"),
  ],
  [
    'revoked or expired tokens cannot produce a connected status',
    inspectorSource.includes("tokenStatus === 'TOKEN_VALID'") &&
      inspectorSource.includes("tokenStatus === 'TOKEN_EXPIRING'"),
  ],
  [
    'business Page connections are preferred over personal profiles',
    inspectorSource.includes('getSocialConnectionCapabilities(c).isBusinessPage'),
  ],
  [
    'Command Centre response includes the fields consumed by its UI',
    inspectorSource.includes('metaStatus,') &&
      inspectorSource.includes('facebookStatus,') &&
      inspectorSource.includes('facebookPage,') &&
      inspectorSource.includes('facebookFollowers,'),
  ],
];

for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  console.log(`PASS: ${name}`);
}

console.log(`Command Centre Facebook status: ${checks.length}/${checks.length} checks passed.`);
