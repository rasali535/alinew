const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const panelPath = 'apps/ralion/src/components/growth/CompetitiveIntelligencePanel.tsx';
const growthPath = 'apps/ralion/src/app/(dashboard)/growth/page.tsx';
const apiPath = 'apps/ralion/src/app/api/mari/competitive-intelligence/route.ts';
const servicePath = 'apps/ralion/src/lib/services/mari/mariCompetitiveIntelligence.service.ts';

for (const file of [panelPath, growthPath, apiPath, servicePath]) {
  assert(fs.existsSync(path.join(root, file)), `${file} must exist`);
}

const panel = read(panelPath);
const growth = read(growthPath);
const api = read(apiPath);
const service = read(servicePath);

assert(panel.includes("authFetch('/api/mari/competitive-intelligence')"), 'panel must load the real Competitive Intelligence V1 snapshot');
assert(panel.includes("action: 'ADD_COMPETITOR'"), 'panel must support competitor onboarding');
assert(panel.includes("action: 'SCAN_COMPETITOR'"), 'panel must support public-source competitor scanning');
assert(panel.includes("action: 'GENERATE_BRIEFING'"), 'panel must support evidence-backed briefing generation');
assert(panel.includes("method: 'DELETE'"), 'panel must support removing competitors');
assert(panel.includes('Add your first competitor'), 'empty watchlist must show explicit competitor onboarding');
assert(panel.includes('PUBLIC EVIDENCE ONLY'), 'panel must label the evidence boundary');
assert(panel.includes('will not bypass authentication or access controls'), 'panel must state access-control safeguard');
assert(panel.includes('will not copy competitor creative'), 'panel must state originality safeguard');
assert(!panel.includes('industry average'), 'panel must not present hard-coded industry-average claims');

assert(growth.includes("import CompetitiveIntelligencePanel from '@/components/growth/CompetitiveIntelligencePanel';"), 'Growth page must import CompetitiveIntelligencePanel');
assert(growth.includes("pageWorkspaceTab === 'MARKET_INTEL' && <CompetitiveIntelligencePanel />"), 'Market Intelligence tab must render CompetitiveIntelligencePanel directly');
assert(!growth.includes("false && pageWorkspaceTab === 'MARKET_INTEL'"), 'legacy Market Intelligence JSX must not remain hidden behind false');
assert(!growth.includes('BLUE OCEAN STRATEGY'), 'legacy positioning placeholder must be removed');
assert(!growth.includes('averageFollowerGrowthMonthly ?? 4.5'), 'legacy hard-coded benchmark fallback must be removed');

assert(api.includes('MariCompetitiveIntelligenceService.getSnapshot'), 'API must serve the evidence-backed snapshot');
assert(api.includes("action === 'ADD_COMPETITOR'"), 'API must expose ADD_COMPETITOR');
assert(api.includes("action === 'SCAN_COMPETITOR'"), 'API must expose SCAN_COMPETITOR');
assert(api.includes("action === 'GENERATE_BRIEFING'"), 'API must expose GENERATE_BRIEFING');
assert(service.includes('publicSourcesOnly: true'), 'Competitive Intelligence must preserve public-source-only rules');
assert(service.includes('copyCompetitorCreative: false'), 'Competitive Intelligence must preserve no-copying rules');
assert(service.includes('automaticPublishing: false'), 'Competitive Intelligence must preserve approval-before-publishing rules');

console.log('Competitive intelligence dashboard verification passed.');
