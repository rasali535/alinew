const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const authProvider = read('apps/ralion/src/components/RalionAuthProvider.tsx');
const rootLayout = read('apps/ralion/src/app/layout.tsx');
const orgContext = read('packages/auth/src/OrganizationContext.tsx');
const growth = read('apps/ralion/src/app/(dashboard)/growth/page.tsx');
const socialPosts = read('apps/ralion/src/app/api/social/posts/by-connection/route.ts');
const r2 = read('packages/ai/src/storage/r2Storage.provider.ts');

assert(
  authProvider.includes("import { createClient } from '@/lib/supabase/client'"),
  'Auth provider must import the canonical browser Supabase client'
);
assert(
  authProvider.indexOf('createClient();') > -1 &&
  authProvider.indexOf('createClient();') < authProvider.indexOf('return <OrganizationProvider>'),
  'Canonical Supabase client must initialize before OrganizationProvider renders'
);
assert(
  rootLayout.includes('<RalionAuthProvider>') && !rootLayout.includes('<OrganizationProvider>'),
  'Root layout must use the bootstrapped Ralion auth provider'
);
assert(
  orgContext.includes('/ralion/login?redirect='),
  'Terminal web-session redirect must stay inside the Ralion login path'
);
assert(
  growth.includes("creativeLogo || '/ralion/ralion-logo.png'"),
  'Growth creative logo fallback must include the deployed /ralion base path'
);
assert(
  socialPosts.includes("source: 'RALION_FALLBACK'") &&
  socialPosts.includes('facebook_upstream_temporarily_unavailable'),
  'Facebook post retrieval must degrade to durable Ralion history'
);
assert(
  socialPosts.includes("'SOCIAL_UPSTREAM_UNAVAILABLE'") &&
  socialPosts.includes('{ status: transient ? 503 : 500 }'),
  'Transient social network failures must be classified as 503, not raw 500'
);
assert(
  r2.includes('accessKeyId.length !== 32') &&
  r2.includes('32-character S3 Access Key ID'),
  'R2 provider must reject a non-S3 API token before attempting paid asset storage'
);

console.log('Session, R2, social and asset-path stabilization contract: PASS');
