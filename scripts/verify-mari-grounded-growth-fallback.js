const fs = require('fs');

const core = fs.readFileSync('packages/ai/src/mariUniversalCore.ts', 'utf8');
const route = fs.readFileSync('apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(core.includes('MARI_RESPONSE_PROVIDER_BUDGET_MS || 18000'), 'Mari response provider budget must leave room for primary and failover attempts.');
assert(core.includes('MARI_RESPONSE_PRIMARY_ATTEMPT_BUDGET_MS || 9000'), 'Mari primary response attempt must be capped so failover retains time.');
assert(core.includes("'gemini-3.5-flash-lite'"), 'Mari response path must include a real low-latency failover model.');
assert(core.includes("generationConfig.thinkingConfig = { thinkingLevel: /flash-lite/i.test(modelName) ? 'minimal' : 'low' }"), 'Gemini response calls must use low/minimal thinking for bounded latency.');
assert(core.includes("/^gemini-3(?:\\.|-)/i.test(modelName)"), 'Thinking-level config must be scoped to Gemini 3.x models.');

assert(route.includes('MariCompetitiveIntelligenceService'), 'Growth route must load Competitive Intelligence evidence.');
assert(route.includes('MariMarketingLearningService'), 'Growth route must load Marketing Learning evidence.');
assert(route.includes('MariCompetitiveIntelligenceService.getSnapshot(tenantEvidenceParams)'), 'Growth route must read the tenant competitive snapshot.');
assert(route.includes('MariMarketingLearningService.listLearnings(tenantEvidenceParams, 10)'), 'Growth route must read tenant marketing learnings.');
assert(route.includes('buildGroundedGrowthStrategyFallback'), 'Growth route must define an evidence-backed fallback strategy.');
assert(route.includes('reasoning engine is temporarily unavailable'), 'Growth route must detect the generic provider-unavailable answer.');
assert(route.includes("result.detectedIntent === 'FACEBOOK_INSIGHTS'"), 'Growth route must recover failed Facebook Insights requests.');
assert(route.includes("responseSource: shouldUseGroundedRouteFallback ? 'local_grounded_route'"), 'Growth telemetry must identify route-level grounded fallback.');
assert(route.includes('modelFailureCodes: result.modelFailureCodes || {}'), 'Growth telemetry must expose model failure codes.');
assert(route.includes('groundedGrowthFallbackUsed: shouldUseGroundedRouteFallback'), 'Growth telemetry must expose grounded fallback use.');
assert(route.includes('competitiveIntelligenceLoaded: Boolean(competitiveIntelligence)'), 'Growth telemetry must expose competitive evidence loading.');
assert(route.includes('marketingLearningCount: marketingLearnings.length'), 'Growth telemetry must expose learning evidence count.');

const helperStart = route.indexOf('function buildGroundedGrowthStrategyFallback');
const helperEnd = route.indexOf('export async function OPTIONS', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Unable to isolate grounded Growth fallback helper.');
const helper = route.slice(helperStart, helperEnd);
assert(helper.includes('verifiedOffer'), 'Fallback strategy must derive positioning from the tenant verified offer.');
assert(!helper.includes('Ralion OS'), 'Fallback helper must not hard-code Ras Ali Labs products for other tenants.');
assert(!helper.includes('creative production and intelligent software'), 'Fallback helper must not hard-code Ras Ali Labs positioning for other tenants.');
assert(helper.includes('No evidence-backed historical marketing learnings exist yet'), 'Fallback must disclose missing historical learning evidence.');
assert(helper.includes('No verified competitor observations'), 'Fallback must disclose missing competitor evidence when absent.');

console.log('PASS: Mari Growth evidence-backed fallback invariants verified.');
