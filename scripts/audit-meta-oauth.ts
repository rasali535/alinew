/**
 * RALION OS — META FACEBOOK LOGIN PUBLIC-USER AUDIT SCRIPT
 * Ras Ali Labs (Pty) Ltd
 * READ-ONLY AUDIT
 */

import { metaAdapter } from '../apps/ralion/src/lib/services/social.service';
import { MetaProvider } from '../packages/integrations/src/social/adapters/MetaProvider';

function runMetaOAuthAudit() {
  console.log('================================================================');
  console.log('RALION OS — META FACEBOOK LOGIN PUBLIC-USER AUDIT');
  console.log('================================================================\n');

  const appId = process.env.FACEBOOK_APP_ID || '1364275985909476';
  const provider = new MetaProvider();

  const stateToken = 'audit_state_mock_nonce_123';
  const redirectUriDirect = 'https://rasalilabs.com/api/oauth/facebook/callback';
  const redirectUriGrowth = 'https://rasalilabs.com/ralion/growth';

  const adapterAuthUrl = metaAdapter.getAuthUrl(stateToken, 'facebook');
  const providerAuthUrl = provider.getAuthorizationUrl(stateToken, redirectUriDirect);

  console.log('1. META APP ID:');
  console.log(`   Value: ${appId}\n`);

  console.log('2. GRAPH API VERSION:');
  console.log(`   Version: v19.0\n`);

  console.log('3. ADAPTER SCOPES (social.service.ts -> metaAdapter):');
  console.log(`   Facebook: ${metaAdapter.scopes.facebook.join(', ')}`);
  console.log(`   Instagram: ${metaAdapter.scopes.instagram.join(', ')}\n`);

  console.log('4. PROVIDER SCOPES (MetaProvider.ts):');
  console.log(`   Default Scopes: ${provider.defaultScopes.join(', ')}\n`);

  console.log('5. SUPABASE AUTH SERVICE SCOPES (AuthService.ts -> linkSocialAccount):');
  console.log(`   Facebook: public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts`);
  console.log(`   Instagram: public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic\n`);

  console.log('6. GENERATED PRODUCTION OAUTH URLs (READ-ONLY INSPECTION):');
  console.log(`   Direct Router URL:\n   ${providerAuthUrl}\n`);
  console.log(`   Adapter URL:\n   ${adapterAuthUrl}\n`);

  console.log('7. PERMISSION ACCESS LEVEL MATRIX:');
  const scopeAudit = [
    { scope: 'public_profile', defaultAccess: 'Standard Access (All)', publicAccessReq: 'Advanced Access for public users' },
    { scope: 'email', defaultAccess: 'Standard Access (All)', publicAccessReq: 'Advanced Access for public users' },
    { scope: 'pages_show_list', defaultAccess: 'Standard Access (App Roles only)', publicAccessReq: 'App Review + Advanced Access' },
    { scope: 'pages_read_engagement', defaultAccess: 'Standard Access (App Roles only)', publicAccessReq: 'App Review + Advanced Access' },
    { scope: 'pages_manage_posts', defaultAccess: 'Standard Access (App Roles only)', publicAccessReq: 'App Review + Advanced Access' },
    { scope: 'pages_manage_metadata', defaultAccess: 'Standard Access (App Roles only)', publicAccessReq: 'App Review + Advanced Access' },
  ];
  console.table(scopeAudit);

  console.log('\n================================================================');
  console.log('AUDIT COMPLETE');
  console.log('================================================================');
}

runMetaOAuthAudit();
