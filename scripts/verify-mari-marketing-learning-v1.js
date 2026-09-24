const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
};

const migration = 'packages/database/migrations/20260916102000_mari_marketing_learning_v1.sql';
const integrity = 'packages/database/migrations/20260916114500_mari_marketing_learning_outcome_integrity.sql';
const service = 'apps/ralion/src/lib/services/mari/mariMarketingLearning.service.ts';
const bridge = 'apps/ralion/src/lib/services/mari/mariMarketingPublicationBridge.service.ts';
const route = 'apps/ralion/src/app/api/mari/learning/route.ts';
const intelligenceRoute = 'apps/ralion/src/app/api/mari/intelligence/route.ts';
const publishRoute = 'apps/ralion/src/app/api/social/publish/route.ts';
const bootstrap = 'packages/ai/src/mariMarketingLearningContext.bootstrap.ts';
const server = 'packages/ai/src/server.ts';

[migration, integrity, service, bridge, route, intelligenceRoute, publishRoute, bootstrap, server].forEach((file) => assert(exists(file), `${file} exists`));

const migrationText = read(migration);
assert(migrationText.includes('mari_marketing_experiments'), 'experiment ledger table declared');
assert(migrationText.includes('mari_marketing_outcomes'), 'outcome ledger table declared');
assert(migrationText.includes('mari_marketing_learnings'), 'learning ledger table declared');
assert(migrationText.includes('FORCE ROW LEVEL SECURITY'), 'learning tables force RLS');
assert(migrationText.includes('service_role'), 'learning writes are server brokered');

const integrityText = read(integrity);
assert(integrityText.includes('metrics_hash'), 'outcome snapshots have deterministic de-duplication key');
assert(integrityText.includes('uq_mari_marketing_experiment_source'), 'publication experiment source identity is unique');

const serviceText = read(service);
assert(serviceText.includes(".from('social_posts')"), 'learner starts from canonical publication history');
assert(serviceText.includes('FacebookPageManagementService.getPagePosts'), 'standalone learner can reconcile with live page evidence');
assert(serviceText.includes('prefetchedPosts === undefined'), 'learner reuses authoritative prefetched BI evidence without refetching');
assert(serviceText.includes('observedPost.id === publication.id'), 'learner rejects canonical publication rows as self-referential outcome evidence');
assert(serviceText.includes('INSUFFICIENT_EXPERIMENT_COUNT'), 'learner refuses sparse evidence');
assert(serviceText.includes("metricQuality === 'RATE' ? 0.88 : 0.58"), 'raw-engagement confidence is capped below supported threshold');
assert(!serviceText.includes('topPosts ='), 'learner does not derive truth from BI top-post selection');

const bridgeText = read(bridge);
assert(bridgeText.includes('Observational record'), 'publish provenance is explicitly observational');
assert(bridgeText.includes('pub_post_'), 'Growth draft provenance can be recovered from stable idempotency key');

const publishText = read(publishRoute);
assert(publishText.includes('MariMarketingPublicationBridgeService.registerSuccessfulPublication'), 'successful social dispatch registers Mari provenance');
assert(publishText.includes('Mari publication provenance warning'), 'learning failure does not replace publishing success');

const routeText = read(route);
assert(routeText.includes("action !== 'REFRESH'"), 'learning refresh API is explicit and authenticated by route context');
assert(routeText.includes('refreshFromPublishedPerformance'), 'learning refresh invokes live evidence reconciliation');

const intelligenceText = read(intelligenceRoute);
assert(intelligenceText.includes('facebookPosts = await FacebookPageManagementService.getPagePosts'), 'BI route fetches shared Facebook evidence once');
assert(intelligenceText.includes('facebookPosts,\n    });'), 'BI receives the shared post evidence');
assert(intelligenceText.includes('intelligence,\n        facebookPosts'), 'learning refresh receives the same prefetched evidence');

const bootstrapText = read(bootstrap);
assert(bootstrapText.includes('TENANT MARKETING LEARNING'), 'Mari reasoning receives tenant learning evidence');
assert(bootstrapText.includes('not universal truths or proof of causation'), 'reasoning context forbids causal overclaiming');

const serverText = read(server);
assert(serverText.includes("./mariMarketingLearningContext.bootstrap"), 'marketing learning bootstrap is activated server-side');

if (process.exitCode) {
  console.error('Mari Marketing Learning V1 verification failed.');
  process.exit(process.exitCode);
}
console.log('Mari Marketing Learning V1 verification passed.');
