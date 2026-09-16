const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const routePath = 'apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts';
const servicePath = 'apps/ralion/src/lib/services/social/mariFacebookGrowth.service.ts';

for (const file of [routePath, servicePath]) {
  assert(fs.existsSync(path.join(root, file)), `${file} must exist`);
}

const route = read(routePath);
const service = read(servicePath);

assert(route.includes('MariUniversalCore.processQuery'), 'Facebook Growth ASK_MARI must use Universal Mari reasoning');
assert(route.includes('MariBusinessIntelligenceService.getBusinessIntelligence'), 'Facebook Growth chat must load tenant Business Intelligence');
assert(route.includes('MariBusinessIntelligenceService.toPromptContext'), 'Business Intelligence must be included in the reasoning context');
assert(route.includes('competitive-intelligence evidence'), 'Facebook Growth context must explicitly preserve competitive-intelligence grounding');
assert(route.includes('tenant marketing-learning evidence'), 'Facebook Growth context must explicitly preserve marketing-learning grounding');
assert(route.includes('Never invent an engagement share'), 'Facebook Growth context must forbid fabricated metrics');
assert(route.includes("postingFrequencyPerWeek: Number((((analytics.totalPosts30d || 0) / (30 / 7))).toFixed(2))"), 'posting frequency must be derived from measured post count');
assert(!route.includes('postingFrequencyPerWeek: 2'), 'posting frequency must not be hard-coded');

const forbiddenClaims = [
  '62% of your total engagement',
  'benchmark standard is 3.5%',
  'Maintaining 3 to 4 posts weekly',
  'peaks at 15:30 CAT',
  '+18% Organic Reach',
  'cuts manual processing time by up to 60%',
  'optimal time for your audience is',
];
for (const claim of forbiddenClaims) {
  assert(!service.includes(claim), `legacy fabricated claim must be removed: ${claim}`);
}

assert(service.includes('internal heuristic, not an external industry benchmark'), 'growth score must disclose its heuristic nature');
assert(service.includes('Timing Evidence Not Yet Calibrated'), 'timing insight must admit missing timing evidence');
assert(service.includes('test window'), '7-day plan timings must be labeled as test windows');
assert(service.includes('Experimental plan only'), '7-day plan must not claim predicted impact');
assert(service.includes('I do not have evidence here for a specific share of total engagement'), 'legacy fallback must refuse unsupported engagement-share claims');
assert(service.includes('controlled test'), 'legacy fallback must recommend evidence-generating tests');

console.log('Mari Facebook growth grounding verification passed.');
