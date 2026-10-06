const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual service and route with a two-tenant database fixture.
// Provider/token calls are counted: denied requests must never reach them.
const scope = { organizationId: 'org-a', workspaceId: 'workspace-a' };
const owned = '00000000-0000-0000-0000-000000000011';
const foreign = '00000000-0000-0000-0000-000000000012';
const otherWorkspace = '00000000-0000-0000-0000-000000000013';
const rows = [
  { id: owned, organization_id: 'org-a', workspace_id: 'workspace-a', provider: 'facebook' },
  { id: foreign, organization_id: 'org-b', workspace_id: 'workspace-b', provider: 'facebook' },
  { id: otherWorkspace, organization_id: 'org-a', workspace_id: 'workspace-b', provider: 'facebook' },
];
let tokens = 0;
let updates = 0;
let databaseError = false;
const database = {
  from() {
    const filters = [];
    let mutation;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      update(value) { mutation = value; return query; },
      async maybeSingle() {
        return { data: rows.find(row => filters.every(([key, value]) => row[key] === value)) || null, error: databaseError ? { message: 'offline' } : null };
      },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          assert(filters.some(([key]) => key === 'organization_id'));
          assert(filters.some(([key]) => key === 'workspace_id'));
          for (const row of rows.filter(row => filters.every(([key, value]) => row[key] === value))) {
            if (mutation) { Object.assign(row, mutation); updates++; }
          }
          return { data: [], error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  },
};
function load(file, imports) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require(name) { assert(name in imports, `Unexpected import: ${name}`); return imports[name]; }, Date, console });
  return exports;
}
const integrations = { SocialProviderRegistry: {}, ZernioSocialService: {} };
const service = load('apps/ralion/src/lib/services/social/socialConnectionHealth.service.ts', {
  'server-only': {}, '@ralion/integrations/server': integrations,
  './socialTokenManager.service': { SocialTokenManager: { async getValidToken() { tokens++; return null; } } },
  '@/lib/supabase/server': { getPrivilegedSupabase: () => database },
}).SocialConnectionHealthService;
const route = load('apps/ralion/src/app/api/social/connections/route.ts', {
  'next/server': {}, '@ralion/integrations/server': integrations,
  '@/lib/services/social/socialDisconnect.service': {},
  '@/lib/services/social/facebookConnectionState.service': {},
  '@/lib/services/social/socialConnectionHealth.service': { SocialConnectionHealthService: service },
  '@/lib/services/auditLogger.service': {},
  '@/lib/cors': { corsJsonResponse: (body, options) => ({ body, status: options?.status || 200 }), handleCorsPreflight() {} },
  '@/lib/auth/serverAuth': { getServiceSupabase: () => database, requireRalionContext: async () => ({ context: { organization: { id: scope.organizationId }, workspace: { id: scope.workspaceId }, user: { id: 'user-a' } } }) },
});
(async () => {
  const invoke = connectionId => route.POST({ json: async () => ({ action: 'health_check', connectionId, organizationId: 'org-b', workspaceId: 'workspace-b' }) });
  assert.equal((await invoke(undefined)).status, 400);
  assert.equal((await invoke('not-a-uuid')).status, 400);
  assert.equal((await invoke(foreign)).status, 404);
  assert.equal((await invoke(otherWorkspace)).status, 404);
  await assert.rejects(service.checkConnectionHealth(owned, {}), error => error.statusCode === 403);
  assert.equal(tokens, 0);
  assert.equal(updates, 0);
  databaseError = true;
  assert.equal((await invoke(owned)).status, 503);
  assert.equal(tokens, 0);
  databaseError = false;
  assert.equal((await invoke(owned)).status, 200);
  assert.equal(tokens, 1);
  assert.equal(updates, 1);
  assert.equal(rows[0].connection_status, 'RECONNECT_REQUIRED');
  assert.equal(rows[1].connection_status, undefined);
  assert.equal(rows[2].connection_status, undefined);
  console.log('PASS: real social health route denies foreign tenants/workspaces before credential or provider access; owned connection works; database errors fail closed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
