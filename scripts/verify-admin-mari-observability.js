const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function expect(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`[Admin Mari observability] Missing invariant: ${label}`);
}

function reject(source, needle, label) {
  if (source.includes(needle)) throw new Error(`[Admin Mari observability] Forbidden invariant: ${label}`);
}

const overview = read('apps/ralion/src/app/api/admin/mari/overview/route.ts');
const inspector = read('apps/ralion/src/app/api/admin/organizations/[id]/route.ts');
const adminPage = read('apps/ralion/src/app/admin/page.tsx');

// Platform-admin boundary and durable telemetry sources.
expect(overview, 'verifyPlatformAdminRequest', 'Mari overview requires platform-admin authentication');
expect(overview, "from('mari_embed_widgets')", 'overview reads configured website widgets');
expect(overview, "from('mari_widget_sessions')", 'overview reads observed website sessions');
expect(overview, "from('mari_widget_usage')", 'overview reads durable widget usage');
expect(overview, "from('tenant_credit_wallets')", 'overview includes durable tenant wallet balances');
expect(overview, "from('mari_api_keys')", 'overview includes API key inventory');
expect(overview, "from('mari_api_usage')", 'overview includes API usage telemetry');

// A configured widget is not presented as live without observed activity.
expect(overview, "let health = 'CONFIGURED'", 'new widgets start as configured rather than live');
expect(overview, "health = 'LIVE'", 'successful recent traffic promotes website health to live');
expect(overview, "health = 'CONNECTED'", 'observed website session is distinguishable from successful chat traffic');
expect(overview, "health = 'ERROR'", 'repeated failures surface an error state');
expect(overview, "code: 'NO_CONNECTION'", 'configured widgets with no observed website connection alert Admin');
expect(overview, "code: 'CREDITS_EXHAUSTED'", 'credit exhaustion is surfaced to Admin');
expect(overview, "code: 'RATE_LIMITED'", 'rate limiting is surfaced to Admin');

// Tenant inspection remains organisation-scoped.
expect(inspector, "from('mari_embed_widgets')", 'tenant inspection includes website widgets');
expect(inspector, "from('mari_widget_usage')", 'tenant inspection includes website usage');
expect(inspector, "from('mari_api_keys')", 'tenant inspection includes customer API keys');
expect(inspector, ".eq('organization_id', organizationId)", 'Mari inspection queries are tenant-bound');
expect(inspector, 'mariWebsite:', 'tenant inspection returns website Mari summary');
expect(inspector, 'mariApi:', 'tenant inspection returns Mari API summary');

// Command Centre UX and billing attribution.
expect(adminPage, "'mari'", 'Command Centre has a Mari & API tab');
expect(adminPage, 'Mari & API', 'Command Centre labels the Mari/API observability surface');
expect(adminPage, 'Live Website Mari', 'Command Centre exposes live website count');
expect(adminPage, 'Mari connection alerts', 'Command Centre exposes connection and billing alerts');
expect(adminPage, 'Website Mari (30d)', 'Billing view separates website Mari credit use');
expect(adminPage, 'Mari API (30d)', 'Billing view separates API credit use');
expect(adminPage, 'Mari Website', 'tenant inspection displays website Mari telemetry');

// Admin may show only safe API-key prefixes, never raw secrets.
expect(adminPage, 'key.keyPrefix', 'Admin displays only safe API-key prefixes');
reject(adminPage, 'mari_live_', 'Admin UI must never contain a raw customer API secret');
reject(overview, 'key_hash', 'Admin overview must never select stored API key hashes');
reject(overview, 'token_hash', 'Admin overview must never select widget session token hashes');

console.log('Admin Mari observability contract: PASS');
