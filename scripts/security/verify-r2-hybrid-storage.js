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
const secureMedia = read('apps/ralion/src/components/SecureMedia.tsx');
const creativeGenerateRoute = read('apps/ralion/src/app/api/creatives/generate/route.ts');
const creativeListRoute = read('apps/ralion/src/app/api/creatives/list/route.ts');
const creativeDeliveryRoute = read('apps/ralion/src/app/api/creatives/[assetId]/delivery/route.ts');
const socialPublishing = read('apps/ralion/src/lib/services/social/socialPublishing.service.ts');
const socialPostsRoute = read('apps/ralion/src/app/api/social/posts/route.ts');

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

assert(secureMedia.includes("match(/\\/assets\\/(asset-[A-Za-z0-9_-]+)(?:\\/|$)/)"), 'SecureMedia must canonicalize R2 object paths back to asset IDs');
assert(creativeDeliveryRoute.includes('canonicalizeAssetLookupKey') && creativeDeliveryRoute.includes("pathMatch?.[1]"), 'Delivery route must accept legacy encoded R2 URLs and resolve the canonical asset ID');
assert(creativeGenerateRoute.includes("mediaUrl: deliveryEndpoint") && creativeGenerateRoute.includes("rawPublicUrl: undefined"), 'Generate API must return authenticated delivery URLs instead of private R2 object URLs');
assert(creativeListRoute.includes("assets: clientAssets") && creativeListRoute.includes("publicUrl: deliveryEndpoint"), 'Creative list API must normalize library assets to authenticated delivery URLs');

assert(socialPublishing.includes("import { CreativeAssetService } from '@ralion/ai/server'"), 'Social publishing must resolve Ralion creative media through the durable asset service');
assert(socialPublishing.includes('resolveTenantCreativeMedia') && socialPublishing.includes('CreativeAssetService.createSignedDeliveryUrl'), 'Social publishing must exchange tenant creative references for signed provider-fetchable URLs');
assert(socialPublishing.includes('organizationId: params.organizationId') && socialPublishing.includes('workspaceId: params.workspaceId'), 'Social creative resolution must be scoped to the authenticated organization and workspace');
assert(socialPublishing.includes("value.startsWith('/api/creatives/')") && socialPublishing.includes(".r2.cloudflarestorage.com"), 'Social publishing must recognize secure Ralion delivery URLs and legacy raw R2 locators');
assert(socialPublishing.indexOf('resolveTenantCreativeMedia({') < socialPublishing.indexOf('validateMediaInputs(tenantResolvedMediaUrls'), 'Tenant creative media must be resolved before public HTTPS validation');
assert(socialPostsRoute.includes('validateMediaReferences') && socialPostsRoute.includes("trimmed.startsWith('/api/creatives/')"), 'Social posts API must accept authenticated Ralion creative references for server-side resolution');
assert(!socialPostsRoute.includes('const mediaUrls = validatePublicHttpsUrls(mediaSource);'), 'Social posts API must not reject secure Ralion delivery paths before the publishing service can resolve them');

const failedInternalDelivery = '/api/creatives/asset-1791316002231-v0t1m/delivery';
const failedInternalMatch = failedInternalDelivery.match(/\/api\/creatives\/(asset-[A-Za-z0-9_-]+)\/delivery(?:\?|$)/);
assert(failedInternalMatch?.[1] === 'asset-1791316002231-v0t1m', 'Exact Growth-to-Social internal delivery URL shape must resolve to the canonical asset ID');

const failedR2Url = 'https://example.r2.cloudflarestorage.com/ralion-media-prod/organizations/org/workspaces/ws/assets/asset-1791316002231-v0t1m/asset-1791316002231-v0t1m.jpg';
const failedR2Match = failedR2Url.match(/\/assets\/(asset-[A-Za-z0-9_-]+)(?:\/|$)/);
assert(failedR2Match?.[1] === 'asset-1791316002231-v0t1m', 'Exact production R2 URL shape must normalize to the canonical creative asset ID');

console.log('R2 hybrid media storage contract: PASS');
