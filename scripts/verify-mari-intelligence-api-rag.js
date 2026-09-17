const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function includesAll(text, values, label) {
  for (const value of values) assert(text.includes(value), `${label} must include ${value}`);
}
function excludesAll(text, values, label) {
  for (const value of values) assert(!text.includes(value), `${label} must not include ${value}`);
}

const migration = read('packages/database/migrations/20260917093000_mari_intelligence_api.sql');
const keyService = read('apps/ralion/src/lib/services/mari/mariApiKey.service.ts');
const knowledgeService = read('apps/ralion/src/lib/services/mari/mariKnowledgeRetrieval.service.ts');
const keyRoute = read('apps/ralion/src/app/api/mari/api-keys/route.ts');
const intelligenceRoute = read('apps/ralion/src/app/api/mari/v1/intelligence/route.ts');
const chatRoute = read('apps/ralion/src/app/api/mari/chat/route.ts');

includesAll(migration, [
  'create table if not exists public.mari_api_keys',
  'key_hash text not null unique',
  'organization_id uuid not null',
  'workspace_id uuid not null',
  'create table if not exists public.mari_api_usage',
  'mari_api_usage_key_request_unique',
  'force row level security',
  'revoke all on table public.mari_api_keys from anon, authenticated',
  'revoke all on table public.mari_api_usage from anon, authenticated',
], 'Mari Intelligence migration');

includesAll(keyService, [
  "createHash('sha256')",
  "mari_live_",
  ".eq('key_hash', hashKey(rawKey))",
  "'intelligence:read'",
  "'knowledge:read'",
  "'analysis:run'",
  'MARI_API_RATE_LIMITED',
  'MARI_API_REQUEST_LIMIT_REACHED',
  'MARI_API_CREDIT_LIMIT_REACHED',
  "onConflict: 'api_key_id,request_id'",
], 'Mari API key service');
excludesAll(keyService, [
  'key_plaintext',
  'raw_key',
  'api_key: secret',
], 'Mari API key persistence');

includesAll(knowledgeService, [
  ".from('document_chunks')",
  ".eq('workspace_id', params.workspaceId)",
  ".from('documents')",
  ".eq('workspace_id', params.workspaceId)",
  ".eq('rag_status', 'READY')",
  '[TENANT-ISOLATED DOCUMENT KNOWLEDGE]',
], 'Mari knowledge retrieval');

includesAll(keyRoute, [
  'requireRalionContext',
  "normalized === 'owner' || normalized === 'admin'",
  'MariApiKeyService.createKey',
  'MariApiKeyService.listKeys',
  'MariApiKeyService.revokeKey',
  'Copy this API key now',
], 'Mari API key management route');

includesAll(intelligenceRoute, [
  "MariApiKeyService.authenticate(",
  "'intelligence:read'",
  'authContext.organizationId',
  'authContext.workspaceId',
  'MariKnowledgeRetrievalService.retrieve',
  'MariUniversalCore.processQuery',
  'MariApiKeyService.recordUsage',
  "code === 'MARI_API_RATE_LIMITED'",
  "responseFormat === 'json'",
], 'Mari Intelligence API route');
excludesAll(intelligenceRoute, [
  'requireRalionContext(',
  'x-organization-id',
  'body.organizationId',
  'body.workspaceId',
], 'External Mari Intelligence tenant identity');

includesAll(chatRoute, [
  'requireRalionContext',
  'MariKnowledgeRetrievalService.retrieve',
  'workspaceId,',
  'MariKnowledgeRetrievalService.toPromptContext(knowledge)',
  'knowledgeGrounding:',
  "'TenantDocumentKnowledge'",
], 'Ralion Mari chat RAG');

assert(
  chatRoute.indexOf('const canonicalWorkspaceId = serverCtx.workspace.id') < chatRoute.indexOf('MariKnowledgeRetrievalService.retrieve'),
  'Ralion Mari chat must resolve the canonical workspace before document retrieval'
);

console.log('Mari Intelligence API and tenant RAG verification passed.');
