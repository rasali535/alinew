const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`[Mari API key contract] Missing invariant: ${label}`);
  }
}

const service = read('apps/ralion/src/lib/services/developerApiKeys.service.ts');
const management = read('apps/ralion/src/app/api/developer/api-keys/route.ts');
const revoke = read('apps/ralion/src/app/api/developer/api-keys/[id]/route.ts');
const rotate = read('apps/ralion/src/app/api/developer/api-keys/[id]/rotate/route.ts');
const publicChat = read('apps/ralion/src/app/api/v1/mari/chat/route.ts');
const hardeningMigration = read('supabase/migrations/20260917130500_harden_customer_mari_api_keys.sql');
const bindingMigration = read('supabase/migrations/20260917132500_bind_mari_api_keys_and_rate_limits.sql');

// Secret handling and lifecycle.
expect(service, "createHash('sha256')", 'API keys are SHA-256 hashed before persistence');
expect(service, 'randomBytes(32)', 'API keys use cryptographically secure random material');
expect(service, "CUSTOMER_API_KEY_PREFIX = 'ralion_live_'", 'customer key namespace is explicit');
expect(service, '.eq(\'key_hash\', keyHash)', 'authentication resolves only through the stored hash');
expect(service, ".is('revoked_at', null)", 'revoked keys are rejected');
expect(service, 'data.expires_at && Date.parse(data.expires_at) <= Date.now()', 'expired keys are rejected');
expect(service, 'scopes.includes(requiredScope)', 'required scope is enforced');

// Tenant/workspace binding.
expect(service, '.eq(\'organization_id\', organizationId)', 'key listing is organization-bound');
expect(service, '.eq(\'workspace_id\', workspaceId)', 'key listing is workspace-bound');
expect(management, 'context.workspace.id', 'created keys bind to the authenticated workspace');
expect(revoke, 'workspaceId: context.workspace.id', 'revocation is workspace-bound');
expect(rotate, 'workspaceId: context.workspace.id', 'rotation is workspace-bound');

// Management authorization.
expect(management, "role === 'owner' || role === 'admin'", 'only owners/admins manage keys');
expect(management, 'Maximum 10 active keys per workspace', 'active-key cap is enforced');

// Public API authentication, read-only scope, limits and billing.
expect(publicChat, 'DeveloperApiKeysService.authenticate(rawApiKey, MARI_CHAT_SCOPE)', 'public API authenticates customer keys with mari:chat');
expect(publicChat, 'DeveloperApiKeysService.consumeRateLimit', 'public API enforces durable rate limits');
expect(publicChat, "selectedModel.endpoint !== 'chat'", 'mari:chat blocks media generation');
expect(publicChat, 'BusinessContextService.assembleContext', 'public Mari uses server-resolved business context');
expect(publicChat, 'MariCreditsService.reserveReasoning', 'public requests reserve Mari credits');
expect(publicChat, 'MariCreditsService.finalizeReasoning', 'public requests finalize or release Mari credits');
expect(publicChat, "request.headers.get('idempotency-key')", 'public API supports idempotent caller request IDs');
expect(publicChat, 'workspace.organization_id !== apiKey.organizationId', 'public API revalidates key tenant binding');

// Database defense in depth.
expect(hardeningMigration, 'key_hash_unique', 'key hashes are unique');
expect(hardeningMigration, 'revoke all on table public.developer_api_keys from anon, authenticated', 'end users cannot query raw key records directly');
expect(bindingMigration, 'alter column workspace_id set not null', 'workspace binding is mandatory');
expect(bindingMigration, 'developer_api_key_rate_limits', 'durable rate-limit storage exists');
expect(bindingMigration, 'ralion_consume_api_key_rate_limit', 'atomic rate-limit function exists');
expect(bindingMigration, 'security invoker', 'rate-limit function does not escalate privileges');

console.log('Mari customer API key + public chat security contract: PASS');
