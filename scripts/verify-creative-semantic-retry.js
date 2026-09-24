const fs = require('fs');
const path = require('path');

const root = process.cwd();
const orchestrator = fs.readFileSync(path.join(root, 'packages/ai/src/creativeOrchestrator.service.ts'), 'utf8');
const route = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/creatives/generate/route.ts'), 'utf8');
const growth = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/growth/page.tsx'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(orchestrator.includes('const maxSemanticAttempts = 1;') || orchestrator.includes('const maxSemanticAttempts = 3;'), 'Creative semantic retry must be bounded to protect unit economics.');
assert(orchestrator.includes("prompt: prompt.trim(),"), 'Semantic retries must preserve the original user brief.');
assert(orchestrator.includes('seed: Math.floor(Math.random() * 1_000_000)'), 'Semantic retries must vary real provider seeds.');
assert(!orchestrator.includes('const enhancedPrompt ='), 'Machine-authored prompt expansion must not return.');
assert(orchestrator.includes("timeoutMs: type === 'VIDEO_REEL' ? 120000 : 30000"), 'Provider timeouts must allow real media generation.');
assert(route.includes('errorStage: result.errorDetails?.stage'), 'Creative API must expose safe failure stage.');
assert(route.includes('visualRelevanceScore: result.errorDetails?.visualRelevanceScore'), 'Creative API must expose semantic score.');
assert(growth.includes("data.errorCode === 'SEMANTIC_RELEVANCE_REJECTED'"), 'Growth must distinguish semantic rejection.');
assert(growth.includes("data.errorCode === 'FAILED_STORAGE'"), 'Growth must distinguish storage failure.');
assert(!growth.includes('verify your storage credentials'), 'Growth must not mislabel semantic failures as storage credential failures.');

console.log('Creative semantic retry and error-stage invariants verified.');
