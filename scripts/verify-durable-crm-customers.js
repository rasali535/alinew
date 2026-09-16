const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read('packages/database/migrations/20260916180000_crm_customer_persistence_hardening.sql');
const customerApi = read('apps/ralion/src/app/api/crm/customers/route.ts');
const dealApi = read('apps/ralion/src/app/api/crm/deals/route.ts');
const customerPage = read('apps/ralion/src/app/(dashboard)/customers/page.tsx');
const crmPage = read('apps/ralion/src/app/(dashboard)/crm/page.tsx');
const leadsPage = read('apps/ralion/src/app/(dashboard)/leads/page.tsx');

assert(migration.includes('alter column workspace_id set not null'), 'CRM tables must require workspace_id');
assert(migration.includes('revoke all on table public.customers from anon, authenticated'), 'Customers must not be browser-writeable');
assert(migration.includes('revoke all on table public.deals from anon, authenticated'), 'Deals must not be browser-writeable');
assert(migration.includes('force row level security'), 'CRM tables must FORCE RLS');
assert(customerApi.includes('requireRalionContext'), 'Customer API must authenticate tenant context');
assert(customerApi.includes(".eq('workspace_id', workspaceId)"), 'Customer reads/writes must scope by workspace');
assert(dealApi.includes('requireRalionContext'), 'Deals API must authenticate tenant context');
assert(dealApi.includes(".eq('workspace_id', workspaceId)"), 'Deal reads/writes must scope by workspace');
assert(customerPage.includes("authFetch('/api/crm/customers'"), 'Customers UI must use authenticated API');
assert(!customerPage.includes("from('ralion_customers')"), 'Customers UI must not write Supabase tables directly');
assert(!customerPage.includes('localStorage.setItem'), 'Customers must not use localStorage as persistence');
assert(crmPage.includes("authFetch('/api/crm/deals'"), 'CRM UI must use authenticated API');
assert(!crmPage.includes("from('ralion_deals')"), 'CRM UI must not query nonexistent ralion_deals table');
assert(!crmPage.includes('localStorage.setItem'), 'CRM must not use localStorage as persistence');
assert(crmPage.includes("method: 'PATCH'"), 'CRM must persist stage/edit changes');
assert(leadsPage.includes("authFetch('/api/crm/deals'"), 'Leads funnel must share the authenticated canonical deals API');
assert(leadsPage.includes("type: 'LEAD'"), 'Leads funnel must persist leads into the canonical deal type');
assert(leadsPage.includes("method: 'PATCH'"), 'Lead stage movement must be durable');
assert(!leadsPage.includes('initialLeadsList'), 'Leads must not use an in-memory fake source of truth');
assert(!leadsPage.includes('ld-${Date.now()}'), 'Leads must not fabricate client-only identifiers');
assert(!leadsPage.includes("'NEW_LEAD'"), 'Leads must use canonical LEAD stage instead of the obsolete NEW_LEAD stage');

console.log('Durable CRM/customer verification passed.');
