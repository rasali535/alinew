const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const helper = read('apps/ralion/src/lib/supabase/server.ts');
const privilegedResolver = helper.slice(
  helper.indexOf('export function resolvePrivilegedSupabaseKey'),
  helper.indexOf('let privilegedClient')
);
const serviceFiles = [];

function collectTypeScriptFiles(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectTypeScriptFiles(relativePath);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) serviceFiles.push(relativePath);
  }
}

collectTypeScriptFiles('apps/ralion/src/lib/services');

const checks = [
  ['shared helper is explicitly server-only', helper.includes("import 'server-only'")],
  ['modern secret key has highest priority', helper.indexOf("['SUPABASE_SECRET_KEY'") < helper.indexOf("['SUPABASE_SERVICE_ROLE_KEY'")],
  ['legacy service key remains the final compatibility fallback', helper.indexOf("['SUPABASE_SERVICE_ROLE_KEY'") < helper.indexOf("['SUPABASE_SERVICE_KEY'")],
  ['privileged resolver never falls back to an anon or publishable key', !/ANON_KEY|PUBLISHABLE_KEY/.test(privilegedResolver)],
  ['shared client disables session persistence and token refresh', helper.includes('persistSession: false') && helper.includes('autoRefreshToken: false')],
  ['all Ralion service modules stopped reading privileged env vars directly', serviceFiles.every((file) => !/process\.env\.SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY|SERVICE_KEY)/.test(read(file)))],
  ['all Ralion service modules removed local getServiceSupabase factories', serviceFiles.every((file) => !/function\s+getServiceSupabase\s*\(/.test(read(file)))],
  ['admin JWT verification uses the publishable verifier client', read('apps/ralion/src/lib/auth/adminAuth.ts').includes('getVerifierSupabase()')],
  ['Zernio privileged access includes the modern secret and excludes anon fallback', read('packages/integrations/src/social/services/ZernioSocialService.ts').includes('process.env.SUPABASE_SECRET_KEY') && !read('packages/integrations/src/social/services/ZernioSocialService.ts').includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')],
  ['Mari business context accepts all server-only privileged key names', ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'].every((name) => read('packages/ai/src/businessContext.service.ts').includes(name))],
  ['standalone backend storage accepts the modern secret key first', read('server/src/app.ts').indexOf('process.env.SUPABASE_SECRET_KEY') < read('server/src/app.ts').indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY')],
];

console.log('Privileged Supabase key unification checks');
for (const [label, passed] of checks) {
  assert.strictEqual(passed, true, label);
  console.log(`PASS: ${label}`);
}
console.log(`All ${checks.length}/${checks.length} checks passed.`);
