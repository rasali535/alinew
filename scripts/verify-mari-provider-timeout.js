const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'packages/ai/src/mariUniversalCore.ts'), 'utf8');
const growth = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/growth/page.tsx'), 'utf8');

assert(core.includes('MARI_CLASSIFIER_PROVIDER_BUDGET_MS'), 'classifier provider budget must exist');
assert(core.includes('MARI_RESPONSE_PROVIDER_BUDGET_MS'), 'response provider budget must exist');
assert(core.includes('signal: AbortSignal.timeout(remainingProviderMs)'), 'Gemini fetches must be abortable');
assert((core.match(/PROVIDER_TIMEOUT/g) || []).length >= 4, 'provider timeouts must be recorded explicitly');
assert(core.includes("fallbackReason = geminiResult?.error || 'GEMINI_UNAVAILABLE'"), 'Gemini failure must flow to local fallback');
assert(core.includes('if (!answerText) {'), 'local grounded fallback must remain enabled');
assert(growth.includes("if (res.ok)"), 'Growth chat must handle successful response');
assert(growth.includes("res.status === 502"), 'Growth chat must surface upstream timeout failures');
assert(growth.includes("Mari’s live reasoning provider took too long to respond"), 'Growth chat must show a useful 502 message');

console.log('Mari provider-timeout verification passed.');
