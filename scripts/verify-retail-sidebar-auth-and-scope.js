/**
 * Regression: authenticated, workspace-scoped Retail sidebar discovery.
 * Catches the Frosthub bug where plain fetch omitted bearer JWT + tenant hints.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = p => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const layout = read('../apps/ralion/src/app/(dashboard)/layout.tsx');
const sidebar = read('../packages/ui/src/Sidebar.tsx');
const route = read('../apps/ralion/src/app/api/retail/entitlement/route.ts');
const api = read('../apps/ralion/src/lib/api-config.ts');

assert(layout.includes("import { authFetch } from '@/lib/api-config'"),
  'Dashboard layout must import the canonical authenticated API helper.');
assert(/await authFetch\(url,\s*\{\s*cache:\s*'no-store'\s*\}\)/.test(layout),
  'Retail sidebar discovery must use authFetch and disable caching.');
assert(!/fetch\(\s*['"`]\/api\/retail\/entitlement/.test(layout),
  'Do not use unauthenticated fetch on Retail entitlement endpoint.');
assert(layout.includes('encodeURIComponent(workspaceId)') &&
       layout.includes('encodeURIComponent(organizationId)'),
  'Explicit tenant hints must be sent to the authoritative server.');
assert(layout.includes('res.ok && data?.isEntitled === true && data?.status === \'ACTIVE\''),
  'Retail navigation must be enabled only after a successful active entitlement response.');
assert(layout.includes('dbRetailEntitled !== null') &&
       layout.includes('dbRetailEntitled.organizationId === organization?.id') &&
       layout.includes('dbRetailEntitled.workspaceId === workspace?.id'),
  'An old workspace entitlement must never enable Retail in a new workspace.');
assert(layout.includes('request !== latestRequest') &&
       layout.includes('active = false'),
  'Stale async replies must not reactivate another workspace.');
assert(layout.includes("window.addEventListener('focus', onFocus)") &&
       layout.includes("document.addEventListener('visibilitychange', onVisibilityChange)") &&
       layout.includes('60_000'),
  'Existing customer sessions must revalidate after a trial is granted.');
assert(layout.includes("window.addEventListener('ralion:retail-entitlement-updated'"),
  'Explicit entitlement updates must be observable in the sidebar.');
assert(sidebar.includes('if (isRetailActive)') &&
       sidebar.includes("href: '/ralion/retail'") &&
       layout.includes('hasRetailEntitlement={hasRetailEntitlement}'),
  'Both responsive sidebars must receive the authoritative Retail access result.');
assert(route.includes('requireRalionContext(request)') &&
       route.includes('verifyEntitlement(context)') &&
       route.includes('validateClientWorkspaceScope(request, context)'),
  'Backend must enforce authoritative tenant access regardless of UI.');
assert(api.includes("'x-ralion-auth-token'") &&
       api.includes("'x-workspace-id'") &&
       api.includes("'x-organization-id'"),
  'Hostinger JWT forwarding and tenant-scoped auth hints must remain intact.');

console.log('PASS: Retail sidebar uses authenticated API, active DB entitlement, scoped/race-safe state, rechecks on return, and server tenant guard.');
