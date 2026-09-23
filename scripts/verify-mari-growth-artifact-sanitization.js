const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const growth = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/growth/page.tsx'), 'utf8');
const core = fs.readFileSync(path.join(root, 'packages/ai/src/mariUniversalCore.ts'), 'utf8');
const markdown = fs.readFileSync(path.join(root, 'apps/ralion/src/components/MariMarkdownMessage.tsx'), 'utf8');
const route = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts'), 'utf8');

assert(growth.includes("import { MariMarkdownMessage, normalizeMarkdownText } from '@/components/MariMarkdownMessage';"), 'Growth chat must import the client normalizer');
assert(growth.includes("text: normalizeMarkdownText(String(answer))"), 'Mari answer must be normalized before entering chat state');
assert(core.includes(".replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, '')"), 'Universal sanitizer must remove invisible format characters');
assert(core.includes(".replace(/^(\\s*#{1,6}\\s+)svg(?=[A-Za-z0-9])/i, '$1')"), 'Universal sanitizer must strip svg heading prefixes line-by-line');
assert(markdown.includes("text = text.replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, '');"), 'Client normalizer must remove invisible format characters');
assert(route.includes("Never prefix headings with the literal token 'svg'"), 'Facebook Growth prompt must prohibit svg heading artifacts');
assert(route.includes("never emit decorative bullet tokens such as '**•**'"), 'Facebook Growth prompt must prohibit decorative bullet artifacts');

// Regression fixture copied from the live failure reported on 2026-09-16.
const broken = String.raw`### svgMarketing Strategy & Performance Insights: Ras Ali Labs

- **•**

### svg1. What Evidence We Have (The Facts)

\#### A. Verified Business Identity & Channel Status`;

function regressionNormalize(raw) {
  return raw
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\\([*_#\[\]()`~\\-])/g, '$1')
    .split(/\r?\n/)
    .map(line => line
      .replace(/^(\s*#{1,6}\s+)svg(?=[A-Za-z0-9])/i, '$1')
      .replace(/^(\s*(?:[-*•]\s+)?)svg(?=[A-Za-z0-9])/i, '$1')
      .replace(/^\s*[-*]\s+\*\*•\*\*\s*$/, '')
      .replace(/^\s*\*\*•\*\*\s*$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const cleaned = regressionNormalize(broken);
assert(!cleaned.includes('svgMarketing'), 'live svgMarketing artifact must be removed');
assert(!cleaned.includes('svg1.'), 'live svg1 artifact must be removed');
assert(!cleaned.includes('**•**'), 'live decorative bullet artifact must be removed');
assert(!cleaned.includes('\\####'), 'escaped heading artifact must be removed');
assert(cleaned.includes('### Marketing Strategy & Performance Insights: Ras Ali Labs'), 'heading content must be preserved');
assert(cleaned.includes('### 1. What Evidence We Have (The Facts)'), 'numbered heading content must be preserved');
assert(cleaned.includes('#### A. Verified Business Identity & Channel Status'), 'deep heading must survive as valid Markdown');

console.log('Mari Growth artifact sanitization verification passed.');
