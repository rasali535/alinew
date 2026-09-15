const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inspectorPath = path.join(
  root,
  'apps/ralion/src/app/api/admin/organizations/[id]/route.ts'
);
const inspectorSource = fs.readFileSync(inspectorPath, 'utf8');
const metricsSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/api/admin/metrics/route.ts'),
  'utf8'
);
const connectedUsersSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/api/admin/connected-users/route.ts'),
  'utf8'
);
const statusSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/lib/services/social/socialConnectionStatus.ts'),
  'utf8'
);
const mariSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/(dashboard)/mari-ai/page.tsx'),
  'utf8'
);
const settingsSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/(dashboard)/settings/page.tsx'),
  'utf8'
);
const onboardingSource = fs.readFileSync(
  path.join(root, 'apps/ralion/src/app/(dashboard)/onboarding/page.tsx'),
  'utf8'
);

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
    inspectorSource.includes('isActiveFacebookConnection') &&
      inspectorSource.includes("metaStatus = 'CONNECTED'"),
  ],
  [
    'revoked or expired tokens cannot produce a connected status',
    statusSource.includes("USABLE_TOKEN_STATUSES = new Set(['TOKEN_VALID', 'TOKEN_EXPIRING'])") &&
      statusSource.includes('!connection.disconnected_at'),
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
  [
    'metrics chooses the Ras Ali Labs business Page only from active Facebook rows',
    metricsSource.includes('activeFacebookConns.find') &&
      metricsSource.includes('RAS_ALI_LABS_ORGANIZATION_ID') &&
      metricsSource.includes('getSocialConnectionCapabilities(c).isBusinessPage'),
  ],
  [
    'metrics and connected-users never expose wildcard token-bearing connection rows',
    !metricsSource.includes(".from('social_connections').select('*')") &&
      !connectedUsersSource.includes(".from('social_connections')\n      .select('*')"),
  ],
  [
    'connected-users excludes disconnected historical connection rows',
    connectedUsersSource.includes('activeConns.forEach') &&
      !connectedUsersSource.includes('allSocialConns.forEach'),
  ],
  [
    'all website-sync callers use the refresh-aware authenticated fetch path',
    [mariSource, settingsSource, onboardingSource].every(source =>
      source.includes("authFetch('/api/mari/knowledge/website-sync") ||
      source.includes('authFetch(`/api/mari/knowledge/website-sync')
    ) &&
      ![mariSource, settingsSource, onboardingSource].some(source =>
        /fetch\(apiUrl[\s\S]{0,120}website-sync/.test(source)
      ),
  ],
  [
    'Mari website-sync sends canonical workspace ID instead of substituting organization ID',
    mariSource.includes("'x-workspace-id': activeWorkspaceId") &&
      !mariSource.includes("'x-workspace-id': orgId"),
  ],
  [
    'website-sync route preserves precise auth failure codes for refresh handling',
    fs.readFileSync(
      path.join(root, 'apps/ralion/src/app/api/mari/knowledge/website-sync/route.ts'),
      'utf8'
    ).includes('requireRalionContext(request)') &&
      !fs.readFileSync(
        path.join(root, 'apps/ralion/src/app/api/mari/knowledge/website-sync/route.ts'),
        'utf8'
      ).includes("code: 'AUTHENTICATION_REQUIRED'"),
  ],
];

for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  console.log(`PASS: ${name}`);
}

console.log(`Command Centre Facebook status: ${checks.length}/${checks.length} checks passed.`);
