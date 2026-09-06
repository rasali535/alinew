import { MetaProvider } from '../packages/integrations/src/social/adapters/MetaProvider';
import { generateOAuthState } from '../packages/integrations/src/core/crypto';
import { AUTHORITATIVE_META_APP_ID } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';

const PAMELTEX_USER_ID = '331c1ca7-bc09-450f-90e8-07cb74459997'; // Pameltex Tenant User UUID
const PAMELTEX_WS_ID = 'b73a216c-e069-42b7-84a1-002f2324f9f7';   // Pameltex Workspace UUID
const REDIRECT_URI = 'https://rasalilabs.com/ralion/api/oauth/facebook/callback';

console.log('=================================================================');
console.log('PAMELTEX META OAUTH 403 AUDIT & PRE-REDIRECT TRACE');
console.log('=================================================================\n');

// 1. Generate signed state
const metaProvider = new MetaProvider();
const signedStateStage1 = generateOAuthState({
  userId: PAMELTEX_USER_ID,
  workspaceId: PAMELTEX_WS_ID,
  organizationId: PAMELTEX_WS_ID,
  provider: 'facebook',
  intent: 'login'
});
const signedStateStage2 = generateOAuthState({
  userId: PAMELTEX_USER_ID,
  workspaceId: PAMELTEX_WS_ID,
  organizationId: PAMELTEX_WS_ID,
  provider: 'facebook',
  intent: 'page_connection'
});

// 2. Generate stage 1 (public_profile,email) and stage 2 (public_profile,email,pages_show_list)
const stage1Url = metaProvider.getAuthorizationUrl(signedStateStage1, REDIRECT_URI, { intent: 'login' });
// For stage 2 controlled test: public_profile,email,pages_show_list
const stage2ControlledUrl = `https://www.facebook.com/v19.0/dialog/oauth?${new URLSearchParams({
  client_id: AUTHORITATIVE_META_APP_ID,
  redirect_uri: REDIRECT_URI,
  state: signedStateStage2,
  scope: 'public_profile,email,pages_show_list',
  response_type: 'code',
  auth_type: 'rerequest'
}).toString()}`;

console.log('--- TEST 1: public_profile,email ---');
console.log('Full URL:', stage1Url);
console.log('Signed State:', signedStateStage1);

console.log('\n--- TEST 2: public_profile,email,pages_show_list ---');
console.log('Full URL:', stage2ControlledUrl);
console.log('Signed State:', signedStateStage2);

// Check for unapproved scopes in production provider default/page configurations
const defaultScopes = metaProvider.defaultScopes;
const pageScopes = metaProvider.pageScopes;

console.log('\n--- SCOPE AUDIT ---');
console.log('Default Scopes (Stage 1 / Login):', defaultScopes);
console.log('Page Scopes (Stage 2 / Page Connect):', pageScopes);

const forbiddenScopes = [
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_manage_metadata',
  'business_management'
];

const hasForbiddenStage1 = defaultScopes.some(s => forbiddenScopes.includes(s));
const hasForbiddenStage2 = pageScopes.some(s => forbiddenScopes.includes(s));

console.log('Stage 1 Contains Unapproved Scopes:', hasForbiddenStage1);
console.log('Stage 2 Contains Unapproved Scopes:', hasForbiddenStage2);
