const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`[Mari widget contract] Missing invariant: ${label}`);
  }
}

function reject(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`[Mari widget contract] Forbidden invariant: ${label}`);
  }
}

const migration = read('supabase/migrations/20260917150500_mari_embeddable_widget.sql');
const fkMigration = read('supabase/migrations/20260917152500_mari_widget_fk_indexes.sql');
const service = read('apps/ralion/src/lib/services/mari/mariWidget.service.ts');
const management = read('apps/ralion/src/app/api/mari/widgets/route.ts');
const session = read('apps/ralion/src/app/api/mari/widget/session/route.ts');
const chat = read('apps/ralion/src/app/api/mari/widget/chat/route.ts');
const embed = read('apps/ralion/src/app/api/mari/widget/embed/route.ts');
const widgetPage = read('apps/ralion/src/app/mari-widget/page.tsx');
const dashboard = read('apps/ralion/src/app/(dashboard)/developer/widgets/page.tsx');

// Browser credential boundary.
expect(service, 'generatePublicToken', 'widgets use a dedicated public identifier');
expect(service, 'generateSessionToken', 'browser sessions use short-lived random tokens');
expect(service, 'hashValue(sessionToken)', 'raw widget session tokens are never stored');
expect(embed, 'data-widget', 'embed loader accepts only the public widget identifier');
expect(widgetPage, 'Authorization: `Bearer ${config.sessionToken}`', 'iframe authenticates with the temporary widget session');
reject(embed, 'mari_live_', 'embed loader must never contain a customer Mari API secret');
reject(widgetPage, 'mari_live_', 'widget UI must never contain a customer Mari API secret');

// Domain and tenant isolation.
expect(service, 'isOriginAllowed(origin, widget.allowedDomains)', 'session creation enforces the widget domain allowlist');
expect(service, 'organization_id: params.organizationId', 'widget creation binds to the authenticated organisation');
expect(service, 'workspace_id: params.workspaceId', 'widget creation binds to the authenticated workspace');
expect(management, "normalized === 'owner' || normalized === 'admin'", 'only owners/admins manage widgets');
expect(session, 'MARI_WIDGET_DOMAIN_DENIED', 'domain denial is explicit');

// Public data and execution boundary.
expect(chat, 'publicSafeBusinessContext', 'website chat sanitizes Ralion business context');
expect(chat, 'Never reveal, infer, summarize or claim access to CRM records', 'website prompt blocks private business data');
expect(chat, 'callPublicWidgetModel', 'widget uses its dedicated read-only model caller');
reject(chat, 'MariUniversalCore', 'public widget cannot invoke the internal action-capable Mari core');
reject(chat, 'callMariAiApi', 'public widget cannot invoke tenant-knowledge Mari chat hydration');
reject(chat, 'MariKnowledgeRetrievalService', 'public widget does not retrieve private workspace documents');
reject(chat, 'CreativeOrchestrator', 'public widget cannot execute creative generation tools');
reject(chat, 'TenantCreditsService', 'public widget cannot invoke the legacy Mari credit path');

// Durable billing and usage.
expect(chat, 'MariCreditsService.reserveReasoning', 'website reasoning reserves durable Mari credits');
expect(chat, 'MariCreditsService.finalizeReasoning', 'website reasoning finalizes or releases durable Mari credits');
expect(chat, "channel: 'website_widget'", 'credit metadata identifies the website widget channel');
expect(service, "from('mari_widget_usage')", 'widget usage is durably recorded');
expect(service, 'SESSION_REQUESTS_PER_MINUTE', 'per-visitor burst limit is enforced');
expect(service, 'WIDGET_REQUESTS_PER_MINUTE', 'per-widget burst limit is enforced');

// Database defense in depth.
expect(migration, 'alter table public.mari_embed_widgets enable row level security', 'widget table has RLS enabled');
expect(migration, 'alter table public.mari_widget_sessions enable row level security', 'session table has RLS enabled');
expect(migration, 'alter table public.mari_widget_usage enable row level security', 'usage table has RLS enabled');
expect(migration, 'revoke all on table public.mari_embed_widgets from anon, authenticated', 'browser roles cannot query widget configuration directly');
expect(migration, 'revoke all on table public.mari_widget_sessions from anon, authenticated', 'browser roles cannot query session hashes');
expect(migration, 'grant select, insert, update, delete on table public.mari_widget_usage to service_role', 'widget usage remains server-only');
expect(fkMigration, 'mari_widget_sessions_organization_idx', 'session organisation foreign key is indexed');
expect(fkMigration, 'mari_widget_sessions_workspace_idx', 'session workspace foreign key is indexed');
expect(fkMigration, 'mari_widget_usage_workspace_idx', 'usage workspace foreign key is indexed');

// Customer workflow.
expect(dashboard, 'Embed Mari on a website', 'developer UI exposes website widget setup');
expect(dashboard, 'Copy', 'developer UI provides copyable embed code');
expect(dashboard, 'No secret API key is exposed', 'developer UI explains the secret boundary');

console.log('Mari embeddable website widget security contract: PASS');
