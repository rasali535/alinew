#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const files = [
  'packages/database/migrations/20260910_social_tenant_rls_hardening.sql',
  'packages/database/migrations/20260910_meta_provider_tenant_rls_hardening.sql',
  'packages/database/migrations/20260910_social_content_rls_hardening.sql',
];

const source = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const failures = [];

function requirePattern(regex, message) {
  if (!regex.test(source)) failures.push(message);
}

requirePattern(/social_conn_tenant_select/, 'social_connections tenant SELECT policy is required.');
requirePattern(/social_conn_tenant_update/, 'social_connections tenant UPDATE policy is required.');
requirePattern(/social_conn_tenant_delete/, 'social_connections tenant DELETE policy is required.');
requirePattern(/social_dest_tenant_select/, 'social_destinations tenant SELECT policy is required.');
requirePattern(/meta_conn_tenant_select/, 'meta_connections tenant SELECT policy is required.');
requirePattern(/sp_profiles_tenant_select/, 'social_provider_profiles tenant SELECT policy is required.');
requirePattern(/social_posts_tenant_select/, 'social_posts tenant SELECT policy is required.');
requirePattern(/social_inbox_tenant_select/, 'social inbox tenant SELECT policy is required.');
requirePattern(/webhooks_log_service_role_only/, 'webhook audit log must remain service-role only.');
requirePattern(/REVOKE ALL ON public\.social_credentials FROM anon, authenticated/, 'credential vault must revoke direct client access.');
requirePattern(/ALTER VIEW public\.social_connections_safe SET \(security_invoker = true\)/, 'social safe view must invoke caller RLS.');
requirePattern(/ALTER VIEW public\.meta_connections_safe SET \(security_invoker = true\)/, 'Meta safe view must invoke caller RLS.');
requirePattern(/REVOKE ALL ON public\.social_destinations FROM anon/, 'anonymous social destination access must be revoked.');
requirePattern(/REVOKE INSERT, UPDATE, DELETE ON public\.organization_social_entitlements FROM authenticated, anon/, 'tenant users must not self-mutate social entitlements.');
requirePattern(/sc\.workspace_id = social_inbox_messages\.workspace_id/, 'inbox connection IDs must be bound to the same workspace.');

if (failures.length) {
  console.error(`[security:social-rls] FAILED — ${failures.length} invariant(s).`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('[security:social-rls] PASS — social resources require tenant membership, safe views obey RLS, and credential/webhook surfaces are server-only.');
