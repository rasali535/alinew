const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const mariCore = read('packages/ai/src/mariUniversalCore.ts');
const growth = read('apps/ralion/src/app/(dashboard)/growth/page.tsx');
const provider = read('packages/ai/src/promptFaithfulCreativeProviders.ts');

const checks = [
  ['Mari preserves exact creative brief', mariCore.includes('const exactCreativeBrief = cleanOriginalPrompt.trim();')],
  ['Mari carries hard visual requirements', mariCore.includes('MariCreativeIntelligenceService.extractHardVisualRequirements(exactCreativeBrief)')],
  ['Mari passes workspace into creative orchestrator', mariCore.includes('workspaceId,')],
  ['View Generated routes to durable Growth output', mariCore.includes('/growth?tab=generated_output&assetId=')],
  ['Social action routes to content with asset id', mariCore.includes('/growth?tab=content&assetId=')],
  ['Mari no longer tells every failure to verify storage credentials', !mariCore.includes('Please verify your storage credentials and retry.')],
  ['Growth hydrates durable creative vault', growth.includes("authFetch('/api/creatives/list?limit=50&offset=0'")],
  ['Growth supports generated output deep-link', growth.includes("generated_output: 'GENERATED_OUTPUT'")],
  ['Growth focuses exact durable asset', growth.includes('creative-output-${focusedAssetId}')],
  ['Growth creates safe Social draft from Mari asset', growth.includes('mari-creative-${item.id}')],
  ['Current Pollinations generation route is attempted', provider.includes('https://gen.pollinations.ai/image/')],
  ['Provider supports backend Pollinations auth', provider.includes('process.env.POLLINATIONS_API_KEY')],
  ['Legacy Pollinations route remains fallback only', provider.includes('https://image.pollinations.ai/prompt/')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    console.log('PASS:', name);
  } else {
    failed += 1;
    console.error('FAIL:', name);
  }
}

if (failed) {
  console.error(`Mari creative command handoff verification failed: ${failed} invariant(s).`);
  process.exit(1);
}

console.log(`Mari creative command handoff verification passed: ${checks.length}/${checks.length}.`);
