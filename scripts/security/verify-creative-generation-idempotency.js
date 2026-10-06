const assert = require('node:assert/strict');
const fs = require('node:fs');

const growth = fs.readFileSync('apps/ralion/src/app/(dashboard)/growth/page.tsx', 'utf8');
const route = fs.readFileSync('apps/ralion/src/app/api/creatives/generate/route.ts', 'utf8');

assert.match(growth, /creativeGenerationLockRef = React\.useRef\(false\)/);
assert.match(growth, /if \(creativeGenerationLockRef\.current\)/);
assert.match(growth, /creativeGenerationLockRef\.current = true/);
assert.match(growth, /clientRequestId,/);
assert.match(growth, /creativeGenerationOperationRef\.current === clientRequestId/);

const lockCheck = growth.indexOf('if (creativeGenerationLockRef.current)');
const stateSet = growth.indexOf('setIsGeneratingPoster(true)', lockCheck);
assert(lockCheck > 0 && stateSet > lockCheck, 'synchronous lock must be checked before React loading state');

assert.match(route, /stableCreativeRequestId/);
assert.match(route, /clientRequestId/);
assert.match(route, /__ralionCreativeRequestPromises/);
assert.match(route, /creativeRequestPromises\.get\(requestId\)/);
assert.match(route, /creativeRequestPromises\.set\(requestId, cachedRequest\)/);
assert.match(route, /const result = await cachedRequest\.promise/);
assert.match(route, /createHash\('sha256'\)/);

console.log('PASS: creative generation uses a synchronous UI lock and stable backend request coalescing.');
