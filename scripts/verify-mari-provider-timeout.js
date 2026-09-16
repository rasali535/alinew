const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'packages/ai/src/mariUniversalCore.ts'), 'utf8');
const growth = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/growth/page.tsx'), 'utf8');

assert(core.includes('MARI_CLASSIFIER_PROVIDER_BUDGET_MS'), 'classifier provider budget must exist');
assert(core.includes('MARI_RESPONSE_PROVIDER_BUDGET_MS'), 'response provider budget must exist');
assert(core.includes('MARI_RESPONSE_PRIMARY_ATTEMPT_BUDGET_MS'), 'primary response attempt budget must exist');
assert(core.includes("'gemini-3.5-flash-lite'"), 'Mari must have a real low-latency Gemini failover model');
assert(core.includes('attemptBudgetMs'), 'response attempts must preserve time for failover');
assert(core.includes("thinkingLevel: /flash-lite/i.test(modelName) ? 'minimal' : 'low'"), 'Flash-Lite response failover must use minimal thinking');
assert(core.includes("thinkingConfig: { thinkingLevel: 'minimal' }"), 'classifier must use minimal thinking');
assert(core.includes('signal: AbortSignal.timeout(remainingProviderMs)') && core.includes('signal: AbortSignal.timeout(attemptBudgetMs)'), 'Gemini classifier and response fetches must be abortable');
assert((core.match(/PROVIDER_TIMEOUT/g) || []).length >= 4, 'provider timeouts must be recorded explicitly');
assert(core.includes("fallbackReason = geminiResult?.error || 'GEMINI_UNAVAILABLE'"), 'Gemini failure must flow to local fallback');
assert(core.includes('if (!answerText) {'), 'local grounded fallback must remain enabled');
assert(growth.includes("if (res.ok)"), 'Growth chat must handle successful response');
assert(growth.includes("res.status === 502"), 'Growth chat must surface upstream timeout failures');
assert(growth.includes("Mari’s live reasoning provider took too long to respond"), 'Growth chat must show a useful 502 message');

console.log('Mari provider-timeout verification passed.');
