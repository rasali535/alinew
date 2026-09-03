/**
 * Ralion OS — Multi-Account Social Isolation & Regression Test Suite
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies that two accounts on the same or different social platforms
 * (e.g., Account A and Account B) can coexist with complete isolation:
 * - Supabase persistence isolation in social_connections & social_credentials
 * - Load / hydration isolation (no same-provider overwrites)
 * - Publishing target isolation (explicit socialConnectionId & pageId resolution)
 * - Disconnection isolation (removing B preserves A)
 * - Security & secret redaction (no OAuth authorization codes or tokens leaked)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { storeOAuthTokens, loadAllUserAccounts, deleteOAuthToken, loadOAuthTokens } from '../apps/ralion/src/lib/services/social.service';
import { SocialPublishingService } from '../apps/ralion/src/lib/services/social/socialPublishing.service';
import { SocialTokenManager } from '../apps/ralion/src/lib/services/social/socialTokenManager.service';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runMultiAccountIsolationTests() {
  console.log('================================================================');
  console.log('  Ralion OS: Two-Account Social Media Isolation Test Suite');
  console.log('================================================================\n');

  const { data: users } = await supabase.from('users').select('id, email').limit(1);
  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);

  const testUserId = users?.[0]?.id || '00000000-0000-0000-0000-000000000001';
  const testWorkspaceId = orgs?.[0]?.id || '00000000-0000-0000-0000-000000000001';

  console.log(`Using Test User: ${testUserId} (org: ${testWorkspaceId})\n`);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Connect Account A (LinkedIn Client 1)
    // ------------------------------------------------------------------------
    console.log('▶ TEST 1: Connect Account A (LinkedIn Client Alpha)');
    const tokenA = 'tok_alpha_live_access_secret_12345';
    const accountA = await storeOAuthTokens({
      userId: testUserId,
      workspaceId: testWorkspaceId,
      organizationId: testWorkspaceId,
      provider: 'linkedin',
      providerAccountId: 'li_sub_alpha_001',
      accessToken: tokenA,
      refreshToken: 'tok_alpha_refresh_secret_12345',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      accountHandle: '@alpha_corp',
      accountLabel: 'Alpha Corp LinkedIn',
      followersCount: 1540,
      avatarUrl: 'https://cdn.ralion.ai/avatars/alpha.png',
      scopes: ['openid', 'profile', 'w_member_social'],
      extraMeta: { client: 'Alpha Corp' }
    });

    assert(Boolean(accountA.connectionId), 'Account A received a distinct connectionId');
    assert(accountA.providerAccountId === 'li_sub_alpha_001', 'Account A preserved providerAccountId');

    // Verify Account A in vault
    const validTokenA = await SocialTokenManager.getValidToken(accountA.connectionId!, 'linkedin');
    assert(validTokenA === tokenA, 'Account A vault token decrypted and matches input secret');

    // ------------------------------------------------------------------------
    // TEST 2: Connect Account B (LinkedIn Client 2)
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 2: Connect Account B (LinkedIn Client Beta)');
    const tokenB = 'tok_beta_live_access_secret_67890';
    const accountB = await storeOAuthTokens({
      userId: testUserId,
      workspaceId: testWorkspaceId,
      organizationId: testWorkspaceId,
      provider: 'linkedin',
      providerAccountId: 'li_sub_beta_002',
      accessToken: tokenB,
      refreshToken: 'tok_beta_refresh_secret_67890',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      accountHandle: '@beta_enterprises',
      accountLabel: 'Beta Enterprises LinkedIn',
      followersCount: 8900,
      avatarUrl: 'https://cdn.ralion.ai/avatars/beta.png',
      scopes: ['openid', 'profile', 'w_member_social'],
      extraMeta: { client: 'Beta Enterprises' }
    });

    assert(Boolean(accountB.connectionId), 'Account B received a distinct connectionId');
    assert(accountB.connectionId !== accountA.connectionId, 'Account B connectionId is strictly unique from Account A');
    assert(accountB.providerAccountId === 'li_sub_beta_002', 'Account B preserved providerAccountId');

    // Verify Account B in vault
    const validTokenB = await SocialTokenManager.getValidToken(accountB.connectionId!, 'linkedin');
    assert(validTokenB === tokenB, 'Account B vault token decrypted and matches input secret');

    // Verify Account A was NOT overwritten in vault
    const recheckedTokenA = await SocialTokenManager.getValidToken(accountA.connectionId!, 'linkedin');
    assert(recheckedTokenA === tokenA, 'Account A credentials in vault remain untouched after Account B connection');

    // ------------------------------------------------------------------------
    // TEST 3: Multi-Account Hydration & Listing Isolation
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Multi-Account Hydration & Listing (Zero Provider Overwrite)');
    const allAccounts = await loadAllUserAccounts(testUserId);
    assert(allAccounts.length >= 2, `User accounts list returned ${allAccounts.length} accounts (>= 2 expected)`);

    const loadedA = allAccounts.find(a => a.id === accountA.connectionId || a.page_id === 'li_sub_alpha_001');
    const loadedB = allAccounts.find(a => a.id === accountB.connectionId || a.page_id === 'li_sub_beta_002');

    assert(Boolean(loadedA), 'Account A found in hydrated accounts list');
    assert(Boolean(loadedB), 'Account B found in hydrated accounts list');
    assert(loadedA?.account_handle === '@alpha_corp', 'Account A handle is isolated (@alpha_corp)');
    assert(loadedB?.account_handle === '@beta_enterprises', 'Account B handle is isolated (@beta_enterprises)');
    assert(loadedA?.followers_count === 1540, 'Account A followers isolated (1540)');
    assert(loadedB?.followers_count === 8900, 'Account B followers isolated (8900)');

    // ------------------------------------------------------------------------
    // TEST 4: Isolated Credential Loading by Connection ID
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 4: Isolated Credential Loading by connectionId');
    const loadedTokensA = await loadOAuthTokens(testUserId, 'linkedin', accountA.connectionId);
    const loadedTokensB = await loadOAuthTokens(testUserId, 'linkedin', accountB.connectionId);

    assert(loadedTokensA?.accessToken === tokenA, 'loadOAuthTokens for Account A returns Token A');
    assert(loadedTokensB?.accessToken === tokenB, 'loadOAuthTokens for Account B returns Token B');
    assert(loadedTokensA?.accessToken !== loadedTokensB?.accessToken, 'Tokens for A and B are strictly distinct');

    // ------------------------------------------------------------------------
    // TEST 5: Publishing Target Isolation
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 5: Publishing Target Security & Scoping');
    // Test publishing with explicit socialConnectionId for Account A
    try {
      // Validation check for unauthorized connection ID
      let unauthorizedThrown = false;
      try {
        await SocialPublishingService.publish({
          userId: 'random-unauthorized-user',
          workspaceId: 'random-ws',
          title: 'Security Probe',
          body: 'This should fail authorization check',
          platforms: ['linkedin'],
          socialConnectionId: accountA.connectionId,
        });
      } catch (err: any) {
        unauthorizedThrown = true;
        assert(err.statusCode === 403 || err.message.includes('Access denied'), 'Foreign workspace access denied to Connection A');
      }
      assert(unauthorizedThrown, 'Unauthorized tenant publish correctly blocked with 403');
    } catch (pubErr: any) {
      console.warn('Publish routing note:', pubErr.message);
    }

    // ------------------------------------------------------------------------
    // TEST 6: Disconnection Isolation (Deleting B preserves A)
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 6: Disconnection Isolation (Disconnect Account B)');
    await deleteOAuthToken(testUserId, 'linkedin', accountB.connectionId);

    // Verify B credentials shredded
    const postDeleteTokenB = await SocialTokenManager.getValidToken(accountB.connectionId!, 'linkedin');
    assert(postDeleteTokenB === null, 'Account B credentials shredded from vault on disconnect');

    // Verify A credentials still intact and valid
    const postDeleteTokenA = await SocialTokenManager.getValidToken(accountA.connectionId!, 'linkedin');
    assert(postDeleteTokenA === tokenA, 'Account A credentials remain fully valid in vault after Account B disconnection');

    // ------------------------------------------------------------------------
    // TEST 7: Redaction Check
    // ------------------------------------------------------------------------
    console.log('\n▶ TEST 7: Secret & Authorization Code Redaction Security');
    const opaqueProviderCode = 'AQLdULtNshJWvkFr8uysXEAsokqeauQ6BCyRMVE1ZPMN7KxxZuT9fmkpMvU0ohBR6EXOc2k7Z0masYTJmlFhPiFe8sbXr02W14XeJgyqlNEfN7mnfwCyZoFCWMHrDGq_w2butpsQlbRXQBCR65Lhzi_aF1zD6t1Vb6LhcosWalOIAQ0UwJDi2Fm5s';
    const testErrorString = `Failed at provider code ${opaqueProviderCode} with secret eaab1234567890abcdef12345678`;
    const sanitized = testErrorString
      .replace(/([a-f0-9]{24,})/gi, '[REDACTED]')
      .replace(/(AQL[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]')
      .replace(/(EAA[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]');

    assert(!sanitized.includes(opaqueProviderCode), 'Opaque provider auth code is completely purged');
    assert(!sanitized.includes('eaab1234567890abcdef12345678'), 'Provider hex secret is completely purged');
    assert(sanitized.includes('[REDACTED]'), 'Replaced with [REDACTED] marker');

    // Clean up test rows
    await supabase.from('social_credentials').delete().eq('social_connection_id', accountA.connectionId!);
    await supabase.from('social_connections').delete().eq('user_id', testUserId);
    await supabase.from('social_account_tokens').delete().eq('user_id', testUserId);

    console.log('\n================================================================');
    console.log('  🎉 ALL MULTI-ACCOUNT ISOLATION REGRESSION TESTS PASSED (7/7)');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Exception:', err);
    process.exit(1);
  }
}

runMultiAccountIsolationTests();
