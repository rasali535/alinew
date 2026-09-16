const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const corePath = path.join(root, 'packages/ai/src/mariUniversalCore.ts');
assert(fs.existsSync(corePath), 'Mari Universal Core must exist');

const core = fs.readFileSync(corePath, 'utf8');

assert(core.includes('export function sanitizeMariModelOutput(raw: string): string'), 'Universal Mari must expose one authoritative output sanitizer');
assert(core.includes('const cleanText = sanitizeMariModelOutput(candidateText);'), 'Gemini candidate output must pass through the authoritative sanitizer');
assert(core.includes(".replace(/(^|\\n)(\\s*#{1,6}\\s+)svg(?=[A-Z0-9])/g, '$1$2')"), 'heading-level svg artifact prefixes must be removed');
assert(core.includes(".replace(/(^|\\n)\\s*[-*]\\s+\\*\\*•\\*\\*\\s*/g, '$1- ')"), 'malformed bold bullet artifacts must be normalized');
assert(core.includes(".replace(/\\b(The|A|An)\\*\\*\\s+([^*\\n]{1,80}?)\\s+\\*\\*(?=[A-Za-z])/g"), 'common malformed inline bold boundaries must be repaired');
assert(core.includes(".replace(/\\n{3,}/g, '\\n\\n')"), 'excess vertical whitespace must be normalized');

const neuralCoreIndex = core.indexOf('async function callGeminiNeuralCore(');
const sanitizerIndex = core.indexOf('export function sanitizeMariModelOutput(');
assert(sanitizerIndex >= 0 && sanitizerIndex < neuralCoreIndex, 'sanitizer must be defined before neural-core response generation');

console.log('Mari universal output sanitization verification passed.');
