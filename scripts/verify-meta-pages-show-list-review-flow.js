const fs = require('fs');

const source = fs.readFileSync('apps/ralion/src/app/(dashboard)/growth/page.tsx', 'utf8');

const required = [
  'Page ID: {page.pageId}',
  'Selected Facebook Page ID:',
  'Page-scoped feed • ID:',
  "setPageWorkspaceTab('POSTS')",
  "a.providerAccountId === pageId",
  "a.metadata?.pageId === pageId",
  'Opening Page Posts for this Page.'
];

for (const needle of required) {
  if (!source.includes(needle)) {
    throw new Error('Missing Meta review flow invariant: ' + needle);
  }
}

if (source.includes("const fbAccount = accounts.find(a => a.provider === 'facebook');")) {
  throw new Error('Meta review flow must not fall back to the first Facebook identity after Page selection.');
}

console.log('Meta pages_show_list review flow invariants verified.');
