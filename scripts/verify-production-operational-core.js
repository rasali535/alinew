const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function includesAll(text, values, label) { for (const value of values) assert(text.includes(value), `${label} must include ${value}`); }
function excludesAll(text, values, label) { for (const value of values) assert(!text.includes(value), `${label} must not include ${value}`); }

const migration = read('packages/database/migrations/20260916193000_operational_core_persistence.sql');
const taskApi = read('apps/ralion/src/app/api/tasks/route.ts');
const calendarApi = read('apps/ralion/src/app/api/calendar/events/route.ts');
const docsApi = read('apps/ralion/src/app/api/documents/route.ts');
const docsSearchApi = read('apps/ralion/src/app/api/documents/search/route.ts');
const reportsApi = read('apps/ralion/src/app/api/reports/overview/route.ts');
const workflowsApi = read('apps/ralion/src/app/api/workflows/route.ts');
const workflowExecute = read('apps/ralion/src/app/api/workflows/execute/route.ts');
const workflowEngine = read('apps/ralion/src/lib/operations/workflowEngine.ts');
const dashboard = read('apps/ralion/src/app/(dashboard)/dashboard/page.tsx');
const tasks = read('apps/ralion/src/app/(dashboard)/tasks/page.tsx');
const calendar = read('apps/ralion/src/app/(dashboard)/calendar/page.tsx');
const documents = read('apps/ralion/src/app/(dashboard)/documents/page.tsx');
const reports = read('apps/ralion/src/app/(dashboard)/reports/page.tsx');
const workflows = read('apps/ralion/src/app/(dashboard)/workflows/page.tsx');
const adminMetrics = read('apps/ralion/src/app/api/admin/metrics/route.ts');
const adminCustomers = read('apps/ralion/src/app/api/admin/customers/route.ts');
const adminOrg = read('apps/ralion/src/app/api/admin/organizations/[id]/route.ts');
const adminStatus = read('apps/ralion/src/app/api/admin/customers/[id]/status/route.ts');
const adminAudit = read('apps/ralion/src/app/api/admin/audit-logs/route.ts');
const adminHealth = read('apps/ralion/src/app/api/admin/system/health/route.ts');
const adminPage = read('apps/ralion/src/app/admin/page.tsx');

includesAll(migration, [
  'alter column workspace_id set not null',
  'create table if not exists public.calendar_events',
  'create table if not exists public.documents',
  'create table if not exists public.document_chunks',
  "values ('ralion-documents', 'ralion-documents', false)",
  'create table if not exists public.workflows',
  'create table if not exists public.workflow_runs',
  'create table if not exists public.tenant_admin_state',
  'force row level security',
  'revoke all on table public.tasks from anon, authenticated',
], 'operational migration');

for (const [name, api] of Object.entries({ taskApi, calendarApi, docsApi, docsSearchApi, reportsApi, workflowsApi, workflowExecute })) {
  assert(api.includes('requireRalionContext'), `${name} must derive tenant context server-side`);
}
assert(taskApi.includes(".from('tasks')"), 'Tasks API must use canonical tasks table');
assert(calendarApi.includes(".from('calendar_events')"), 'Calendar API must use canonical calendar table');
assert(docsApi.includes(".from('documents')") && docsApi.includes("storage.from(BUCKET)"), 'Documents API must persist metadata and private storage');
assert(docsApi.includes("rag_status: ragStatus") && docsApi.includes('indexTextDocument'), 'Documents must expose honest indexing status');
assert(docsSearchApi.includes(".from('document_chunks')") && docsSearchApi.includes('.textSearch('), 'Document search must use durable tenant chunks');
assert(reportsApi.includes(".from('customers')") && reportsApi.includes(".from('deals')") && reportsApi.includes(".from('tasks')"), 'Reports must aggregate canonical records');
assert(workflowsApi.includes(".from('workflows')"), 'Workflow CRUD must use durable workflows');
assert(workflowExecute.includes('executeWorkflowsForEvent'), 'Manual workflow execution must invoke server engine');
includesAll(workflowEngine, ["'CREATE_TASK'", "'CREATE_CALENDAR_EVENT'", "'AUDIT_LOG'", "'workflow_runs'"], 'workflow engine');
excludesAll(workflowEngine, ['SEND_EMAIL', 'SEND_WHATSAPP', 'PUBLISH_SOCIAL'], 'workflow engine unsupported action allowlist');

for (const [name, page] of Object.entries({ dashboard, tasks, calendar, documents, reports, workflows })) {
  excludesAll(page, ['sampleEvents', 'sampleDocs', 'sampleRules', 'initialTasks', 'customerGrowthData'], `${name} UI`);
}
excludesAll(dashboard, ['localStorage.setItem', "ralion_tasks", "ralion_contacts", 'setTimeout(() =>'], 'Dashboard');
excludesAll(tasks, ['localStorage', 'Date.now().toString()', '`t-${Date.now()}`'], 'Tasks page');
assert(dashboard.includes("authFetch('/api/reports/overview')"), 'Dashboard must load canonical command-centre metrics');
assert(tasks.includes("authFetch('/api/tasks')"), 'Tasks page must use durable API');
assert(calendar.includes("authFetch('/api/calendar/events"), 'Calendar page must use durable API');
assert(documents.includes("authFetch('/api/documents')"), 'Documents page must use durable API');
assert(reports.includes("authFetch('/api/reports/overview')"), 'Reports page must use canonical report API');
assert(workflows.includes("authFetch('/api/workflows')"), 'Workflows page must use durable API');

const forbiddenAdminServices = ['PlatformAdminService', 'BillingDatabaseService', 'TenantCreditsService', 'CreativeAssetService'];
for (const [name, api] of Object.entries({ adminMetrics, adminCustomers, adminOrg, adminStatus, adminAudit })) {
  excludesAll(api, forbiddenAdminServices, `${name} durable admin API`);
}
assert(adminMetrics.includes(".from('organizations')") && adminMetrics.includes(".from('tenant_credit_wallets')") && adminMetrics.includes(".from('tenant_admin_state')"), 'Admin metrics must use durable organization, credit and status stores');
assert(adminCustomers.includes(".from('organizations')") && adminCustomers.includes(".from('subscriptions')"), 'Admin customer directory must be canonical');
assert(adminStatus.includes(".from('tenant_admin_state')") && adminStatus.includes(".from('audit_logs')"), 'Tenant status changes must persist and audit');
assert(adminAudit.includes(".from('audit_logs')"), 'Admin audit endpoint must query durable audit logs');
excludesAll(adminHealth, ["status: metaConfigured ? 'UP' : 'UP'", "status: zernioKey ? 'UP' : 'UP'", "latencyMs: 12", "latencyMs: 24", "latencyMs: 45"], 'Admin health route');
assert(adminHealth.includes("verification: 'PROBED'") && adminHealth.includes("verification: 'CONFIG_ONLY'"), 'Health route must distinguish probes from config checks');
excludesAll(adminPage, ['System Core Status: UP', 'Zero platform outages recorded', 'Tenant isolation strictly verified'], 'Admin Command Centre UI');
assert(adminPage.includes("authFetch('/api/admin/metrics')"), 'Admin UI must use authenticated canonical admin APIs');

console.log('Production operational core verification passed.');
