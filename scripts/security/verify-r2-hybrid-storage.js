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
const aiPackage = read('packages/ai/package.json');
const adminHealth = read('apps/ralion/src/app/api/admin/system/health/route.ts');

assert(r2.includes("import 'server-only'"), 'R2 provider must be server-only');
assert(adminHealth.includes("Cloudflare R2 Media Storage") && adminHealth.includes('new R2StorageProvider') && adminHealth.includes('await r2.list(undefined, { limit: 1 })'), 'Cloudflare R2 admin health probe must use the real storage provider');
assert(adminHealth.includes("Buffer.from('ralion-r2-health'") && adminHealth.includes('await r2.upload(canaryPath') && adminHealth.includes('await r2.download(canaryPath)') && adminHealth.includes('await r2.delete(canaryPath)'), 'Cloudflare R2 admin health probe must verify write, read and delete without creative credits');
assert(aiPackage.includes('"aws4fetch": "^1.0.20"'), 'AI package must declare aws4fetch as a direct production dependency');
assert(r2.includes(".r2.cloudflarestorage.com"), 'R2 endpoint must be restricted to Cloudflare R2');
assert(r2.includes("this.region = config.region?.trim() || 'auto'"), 'R2 must use auto region by default');
assert(r2.includes("import { AwsClient } from 'aws4fetch'"), 'R2 must use Cloudflare-recommended aws4fetch signing');
assert(r2.includes("service: 's3'") && r2.includes("region: this.region"), 'R2 aws4fetch client must sign for S3 in auto region');
assert(r2.includes('this.client.fetch'), 'R2 API calls must be signed by aws4fetch');
assert(r2.includes('this.client.sign') && r2.includes("aws: { signQuery: true }"), 'R2 delivery URLs must be presigned by aws4fetch');
assert(r2.includes("url.searchParams.set('X-Amz-Expires'"), 'R2 signed delivery URLs must carry an explicit expiry');
assert(!r2.includes('private signingKey('), 'R2 must not use a hand-written SigV4 signing key implementation');
assert(r2.includes('604800'), 'R2 presigned URLs must respect the seven-day S3 maximum');
assert(r2.includes("segment === '..'"), 'R2 provider must reject path traversal segments');
assert(r2.includes("'x-amz-meta-sha256'"), 'R2 uploads must persist integrity metadata');
assert(r2.includes("headers['content-length'] = String(payload.byteLength)"), 'R2 PUT requests must send an exact Content-Length header');

assert(hybrid.includes('return this.primary.upload'), 'Hybrid storage must write new assets to primary storage only');
assert(hybrid.includes("this.warnReadFallback('download'") && hybrid.includes('return this.fallback.download'), 'Hybrid storage must retain Supabase read fallback after primary read errors');
assert(hybrid.includes("this.warnReadFallback('signed-url lookup'") && hybrid.includes('this.fallback.createSignedUrl'), 'Hybrid storage must retain signed delivery for legacy assets after primary lookup errors');

assert(index.includes("'SUPABASE'"), 'Storage selection must default to Supabase');
assert(index.includes("if (mode === 'R2')"), 'R2 activation must be explicit');
assert(index.includes("process.env.R2_SUPABASE_FALLBACK || 'true'"), 'Supabase fallback must be enabled by default during migration');
assert(index.includes('R2_ENDPOINT'), 'R2 endpoint must be configured from server environment');
assert(index.includes('R2_SECRET_ACCESS_KEY'), 'R2 secret must be configured from server environment');

assert(creative.includes('storage.getProviderName()'), 'Creative metadata must record the actual storage provider');
assert(creative.includes('organizations/${orgId}/workspaces/${workspaceId}/assets/'), 'Creative storage must remain tenant/workspace namespaced');

console.log('R2 hybrid media storage contract: PASS');
