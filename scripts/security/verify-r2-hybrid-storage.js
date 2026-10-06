const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const r2 = read('packages/ai/src/storage/r2Storage.provider.ts');
const hybrid = read('packages/ai/src/storage/hybridStorage.provider.ts');
const index = read('packages/ai/src/storage/index.ts');
const creative = read('packages/ai/src/creativeAsset.service.ts');

assert(r2.includes("import 'server-only'"), 'R2 provider must be server-only');
assert(r2.includes(".r2.cloudflarestorage.com"), 'R2 endpoint must be restricted to Cloudflare R2');
assert(r2.includes("this.region = config.region?.trim() || 'auto'"), 'R2 must use auto region by default');
assert(r2.includes("AWS4-HMAC-SHA256"), 'R2 requests must use AWS Signature V4');
assert(r2.includes("'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD'"), 'R2 signed delivery URLs must use unsigned payload');
assert(r2.includes('604800'), 'R2 presigned URLs must respect the seven-day S3 maximum');
assert(r2.includes("segment === '..'"), 'R2 provider must reject path traversal segments');
assert(r2.includes("'x-amz-meta-sha256'"), 'R2 uploads must persist integrity metadata');

assert(hybrid.includes('return this.primary.upload'), 'Hybrid storage must write new assets to primary storage only');
assert(hybrid.includes('return this.fallback.download'), 'Hybrid storage must retain Supabase read fallback');
assert(hybrid.includes('this.fallback.createSignedUrl'), 'Hybrid storage must retain signed delivery for legacy assets');

assert(index.includes("'SUPABASE'"), 'Storage selection must default to Supabase');
assert(index.includes("if (mode === 'R2')"), 'R2 activation must be explicit');
assert(index.includes("process.env.R2_SUPABASE_FALLBACK || 'true'"), 'Supabase fallback must be enabled by default during migration');
assert(index.includes('R2_ENDPOINT'), 'R2 endpoint must be configured from server environment');
assert(index.includes('R2_SECRET_ACCESS_KEY'), 'R2 secret must be configured from server environment');

assert(creative.includes('storage.getProviderName()'), 'Creative metadata must record the actual storage provider');
assert(creative.includes('organizations/${orgId}/workspaces/${workspaceId}/assets/'), 'Creative storage must remain tenant/workspace namespaced');

console.log('R2 hybrid media storage contract: PASS');
