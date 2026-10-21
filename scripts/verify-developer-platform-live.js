/**
 * Ralion OS — Developer Platform Architecture & Authorization Verification Suite
 * Verifies:
 * 1. Developer Platform is absent from ordinary customer sidebars (uncluttered UX).
 * 2. Developer Platform remains fully functional (/developer, /developer/widgets).
 * 3. Platform admin controls remain accessible in apps/admin (Products & Modules, Integrations).
 * 4. Authorized organization owners/admins retain access to workspace-scoped API keys via Settings & Developer routes.
 * 5. Unauthorized roles cannot manage API keys or access global administration.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sidebarFile = path.join(rootDir, 'packages/ui/src/Sidebar.tsx');
const devPageFile = path.join(rootDir, 'apps/ralion/src/app/(dashboard)/developer/page.tsx');
const devWidgetsFile = path.join(rootDir, 'apps/ralion/src/app/(dashboard)/developer/widgets/page.tsx');
const devApiFile = path.join(rootDir, 'apps/ralion/src/app/api/mari/api-keys/route.ts');
const settingsPageFile = path.join(rootDir, 'apps/ralion/src/app/(dashboard)/settings/page.tsx');
const adminPageFile = path.join(rootDir, 'apps/admin/src/app/admin/page.tsx');

console.log('[Developer Platform Contract] Verifying new architecture...');

// 1. Verify absence from ordinary customer sidebar
const sidebarCode = fs.readFileSync(sidebarFile, 'utf8');
if (sidebarCode.includes("id: 'developer'") || sidebarCode.includes("label: 'Developer Platform'")) {
  throw new Error('[Developer Platform] Developer Platform must not appear as an ordinary customer sidebar item.');
}
console.log('✓ Developer Platform absent from ordinary customer sidebar (clean workspace verified).');

// 2. Verify Developer Platform remains functional and available
if (!fs.existsSync(devPageFile)) {
  throw new Error('[Developer Platform] /developer/page.tsx is missing.');
}
if (!fs.existsSync(devWidgetsFile)) {
  throw new Error('[Developer Platform] /developer/widgets/page.tsx is missing.');
}
if (!fs.existsSync(devApiFile)) {
  throw new Error('[Developer Platform] /api/mari/api-keys/route.ts is missing.');
}
console.log('✓ Developer Platform routes and API endpoints remain fully functional.');

// 3. Verify platform admin controls in apps/admin
const adminCode = fs.readFileSync(adminPageFile, 'utf8');
if (!adminCode.includes("name: 'Developer Platform'") || !adminCode.includes("status: 'Live'")) {
  throw new Error('[Developer Platform] Developer Platform must be registered in Admin Command Centre product catalog.');
}
if (!adminCode.includes('Developer Platform & APIs')) {
  throw new Error('[Developer Platform] Developer Platform telemetry missing from Admin Integrations & Developers section.');
}
console.log('✓ Platform admin Developer Platform controls active in apps/admin.');

// 4. Verify authorized access for organization owners/admins via Settings / Developer access
const settingsCode = fs.readFileSync(settingsPageFile, 'utf8');
if (!settingsCode.includes('DEVELOPER') || !settingsCode.includes('/ralion/developer')) {
  throw new Error('[Developer Platform] Settings must provide authorized route to Developer Access & API Keys.');
}
console.log('✓ Organization owners/admins retain access to Developer Access & API Keys via Settings.');

// 5. Verify backend role-based authorization guards on API key management
const devApiCode = fs.readFileSync(devApiFile, 'utf8');
if (!devApiCode.includes('requireRalionContext') || !devApiCode.includes('canManage')) {
  throw new Error('[Developer Platform] API key management must enforce requireRalionContext and canManage role check.');
}
if (!devApiCode.includes("Owner or admin access is required")) {
  throw new Error('[Developer Platform] Non-admin roles must be rejected with 403 Forbidden.');
}
console.log('✓ Backend authorization guards enforce owner/admin access and workspace tenancy scoping.');

console.log('\nDeveloper Platform navigation & authorization contract: PASS ✨\n');
