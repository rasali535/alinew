const fs = require('fs');

const core = fs.readFileSync('packages/ai/src/mariUniversalCore.ts', 'utf8');
const component = fs.readFileSync('apps/ralion/src/components/MariMarkdownMessage.tsx', 'utf8');
const route = fs.readFileSync('apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(core.includes(String.raw`replace(/\\+([*_#`), 'Universal Mari sanitizer must collapse repeated Markdown escape layers.');
assert(component.includes(String.raw`replace(/\\+([*_#`), 'Mari renderer must collapse repeated Markdown escape layers.');
assert(component.includes('decodeMarkdownHtmlEntities'), 'Mari renderer must decode HTML entities before Markdown rendering.');
assert(component.includes(".replace(/&#(\\d+);/g"), 'Mari renderer must decode decimal HTML entities such as &#039;.');
assert(component.includes(".replace(/&#x([0-9a-f]+);/gi"), 'Mari renderer must decode hexadecimal HTML entities.');
assert(component.includes('list-disc list-outside'), 'Mari bullet lists must use native list markers for clean copy/paste.');
assert(!component.includes('<Sparkles className='), 'Mari H3 headings must not inject decorative SVG nodes into copied text.');
assert(!component.includes('text-purple-400 font-bold shrink-0 mt-0.5">•</span>'), 'Mari bullet items must not inject a separate bullet span.');

assert(route.includes('function cleanFallbackText'), 'Grounded Growth fallback must clean stored evidence text.');
assert(route.includes('function stripTerminalPunctuation'), 'Grounded Growth fallback must normalize terminal punctuation.');
assert(route.includes("'### 3. Strategic Direction'"), 'Grounded Growth fallback must provide an explicit strategy section.');
assert(route.includes('does not prove posting frequency caused the result'), 'Low visible response must be framed as a test signal, not a causal conclusion.');
assert(route.includes('topObservedTopic'), 'Grounded Growth fallback must use the strongest observed content topic when available.');
assert(route.includes('proof-led'), 'Grounded Growth fallback must recommend proof-led experimentation.');
assert(!route.includes('Our current focus is simple:'), 'Fallback content must not merely repeat the stored value proposition.');

const helperStart = route.indexOf('function buildGroundedGrowthStrategyFallback');
const helperEnd = route.indexOf('export async function OPTIONS', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Unable to isolate grounded Growth fallback helper.');
const helper = route.slice(helperStart, helperEnd);
assert(!helper.includes('Ralion OS'), 'Fallback helper must remain tenant-generic.');

console.log('PASS: Mari Growth copy hygiene and proof-led fallback invariants verified.');
