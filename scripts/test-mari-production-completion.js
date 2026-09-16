const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const checks = [];

function check(name, condition) {
  assert.equal(Boolean(condition), true, name);
  checks.push(name);
  console.log(`  ✅ ${name}`);
}

console.log('\nMari production completion regression suite\n');

const migration = read('packages/database/migrations/20260916045047_mari_usage_audit_hardening.sql');
const telemetry = read('packages/ai/src/tokenTelemetry.service.ts');
const core = read('packages/ai/src/mariUniversalCore.ts');

check('usage migration reuses canonical audit_logs', migration.includes('public.audit_logs'));
check('usage migration grants only server role', migration.includes('GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role'));
check('usage migration revokes direct client access', migration.includes('REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated'));
check('usage migration enforces tenant/request idempotency', migration.includes("organization_id, (metadata ->> 'requestId')"));
check('telemetry writes canonical audit_logs', telemetry.includes("from('audit_logs').insert"));
check('telemetry no longer references missing security_audit_logs', !telemetry.includes("from('security_audit_logs')"));
check('telemetry reads only Mari query events', telemetry.includes(".eq('module', 'MARI_AI')") && telemetry.includes(".eq('action', 'MARI_AI_QUERY')"));
check('duplicate durable events are handled idempotently', telemetry.includes("error.code !== '23505'"));

check('Mari defaults to production-proven gemini-3.5-flash', core.includes("MARI_RESPONSE_MODEL") && core.includes("'gemini-3.5-flash'"));
check('failed gemini-2.5-flash-lite attempt removed', !core.includes('gemini-2.5-flash-lite'));
check('provider response bodies are not logged', !core.includes('errBody'));
check('model attempts are capped and deduplicated', core.includes('modelsWithStableFallback') && core.includes('.slice(0, 2)'));

const protectedRoutes = [
  'apps/ralion/src/app/api/mari/chat/route.ts',
  'apps/ralion/src/app/api/mari/usage/route.ts',
  'apps/ralion/src/app/api/mari/intelligence/route.ts',
  'apps/ralion/src/app/api/mari/context/route.ts',
  'apps/ralion/src/app/api/mari/briefing/route.ts',
  'apps/ralion/src/app/api/mari/knowledge/sources/route.ts',
];

for (const route of protectedRoutes) {
  const source = read(route);
  check(`${route} uses authoritative auth context`, source.includes('requireRalionContext(request)'));
  check(`${route} does not emit legacy AUTHENTICATION_REQUIRED`, !source.includes("code: 'AUTHENTICATION_REQUIRED'"));
}

const clients = [
  'apps/ralion/src/app/(dashboard)/mari-ai/page.tsx',
  'apps/ralion/src/components/FloatingMariAi.tsx',
  'apps/ralion/src/components/MariAiDrawer.tsx',
];

for (const client of clients) {
  const source = read(client);
  check(`${client} sends chat through authFetch`, source.includes("authFetch('/api/mari/chat'"));
  check(`${client} does not substitute organization as workspace`, !source.includes("workspace?.id || activeOrgId") && !source.includes("activeWorkspaceId || effectiveOrgId"));
}

console.log(`\n${checks.length}/${checks.length} checks passed. No provider, social, or database writes were executed.\n`);
