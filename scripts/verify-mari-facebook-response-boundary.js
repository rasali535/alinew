const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const routePath = path.join(root, 'apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts');
const markdownPath = path.join(root, 'apps/ralion/src/components/MariMarkdownMessage.tsx');

const route = fs.readFileSync(routePath, 'utf8');
const markdown = fs.readFileSync(markdownPath, 'utf8');

assert(route.includes('sanitizeMariModelOutput(result.answer)'), 'Facebook Growth must sanitize at API response boundary');
assert(route.includes("outputSanitizer: 'MARI_UNIVERSAL_V2'"), 'Facebook Growth must expose sanitizer telemetry');
assert(route.includes('buildVersion: MARI_BUILD_VERSION'), 'Facebook Growth must expose Mari build version telemetry');
assert(markdown.includes(".replace(/(^|\\n)(\\s*#{1,6}\\s+)svg(?=[A-Z0-9])/g, '$1$2')"), 'client must strip only svg heading prefixes');
assert(!markdown.includes(".replace(/\\bsvg[A-Z][a-zA-Z0-9 ]*/g, '')"), 'client must not use broad svg text eraser');
assert(markdown.includes("if (/^#{4,6}\\s+/.test(line))"), 'Mari renderer must support heading levels 4-6');

console.log('Mari Facebook response-boundary verification passed.');
