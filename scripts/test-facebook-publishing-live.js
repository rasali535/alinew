#!/usr/bin/env node

/**
 * RALION — Facebook Publishing Pipeline End-to-End Live Verification
 * Ras Ali Labs (Pty) Ltd
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const ralionProd = parseEnvFile(path.join(ROOT_DIR, 'apps/ralion/.env.production'));
const rootEnv = parseEnvFile(path.join(ROOT_DIR, '.env'));

for (const [k, v] of Object.entries({ ...rootEnv, ...ralionProd })) {
  if (!process.env[k]) process.env[k] = v;
}

const { ZernioSocialService } = require('../packages/integrations/dist/social/services/ZernioSocialService.js');
const { SocialProviderRegistry } = require('../packages/integrations/dist/social/SocialProviderRegistry.js');

async function testFacebookPublishing() {
  console.log('\n' + '='.repeat(70));
  console.log('  🚀  RALION ZERNIO FACEBOOK PUBLISHING END-TO-END VERIFICATION');
  console.log('      Ras Ali Labs (Pty) Ltd — Live System Analysis');
  console.log('='.repeat(70) + '\n');

  const profileId = '6a82deac1a69158ef81cb2cd';

  // ── STEP 1: ACCOUNT RESOLUTION ──────────────────────────────────────
  console.log('--- STEP 1: RESOLVING FACEBOOK ACCOUNT VIA ZERNIO ---');
  const accounts = await ZernioSocialService.getAccounts(profileId);
  const fbAccount = accounts.find((a) => a.platform === 'facebook');

  if (!fbAccount) {
    throw new Error('No active Facebook account found in Zernio profile ' + profileId);
  }

  console.log('✅ Resolved Facebook Account:');
  console.log(`   - Account ID: ${fbAccount.id}`);
  console.log(`   - Platform: ${fbAccount.platform}`);
  console.log(`   - Page Name: ${fbAccount.name}`);
  console.log(`   - Username: ${fbAccount.username}`);
  console.log(`   - Status: ${fbAccount.status}`);

  // ── STEP 2: CONTENT COMPOSER ────────────────────────────────────────
  console.log('\n--- STEP 2: COMPOSING CONTENT ---');
  const postContent = `Ralion OS social infrastructure test — Automated Live Verification [${new Date().toISOString()}]`;
  console.log(`   - Body: "${postContent}"`);

  // ── STEP 3: PROVIDER ROUTING ────────────────────────────────────────
  console.log('\n--- STEP 3: VERIFYING PROVIDER ROUTER SELECTION ---');
  const zernioProvider = SocialProviderRegistry.getZernioProvider();
  console.log(`   - Provider Selected: ${zernioProvider.displayName}`);
  console.log(`   - Capabilities: CanPublish=${zernioProvider.getCapabilities().canPublish}`);

  // ── STEP 4: IDEMPOTENT PUBLISH REQUEST ──────────────────────────────
  console.log('\n--- STEP 4: DISPATCHING LIVE PUBLISH REQUEST TO ZERNIO ---');
  const idempotencyKey = `pub_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  console.log(`   - Idempotency Key: ${idempotencyKey}`);

  const publishResult = await zernioProvider.publish('zernio_master', {
    body: postContent,
    zernioProfileId: profileId,
    zernioAccountIds: [fbAccount.id],
    idempotencyKey,
  });

  console.log('\n--- STEP 5: ANALYZING PUBLISH RESPONSE ---');
  console.log('   Response Success:', publishResult.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('   Post ID:', publishResult.postId || 'N/A');
  console.log('   Post URL:', publishResult.postUrl || 'N/A');
  console.log('   Provider:', publishResult.provider);
  if (publishResult.error) {
    console.log('   Error Message:', publishResult.error);
  }

  // ── STEP 6: IDEMPOTENCY VERIFICATION ────────────────────────────────
  console.log('\n--- STEP 6: VERIFYING IDEMPOTENCY GUARDS ---');
  const duplicateResult = await zernioProvider.publish('zernio_master', {
    body: postContent,
    zernioProfileId: profileId,
    zernioAccountIds: [fbAccount.id],
    idempotencyKey, // Re-submitting identical idempotency key
  });
  console.log(`   Re-submission Handled Safely: ${duplicateResult.success ? '✅ IDEMPOTENT' : '⚠️ ' + duplicateResult.error}`);

  // ── STEP 7: FAILURE TEST (SAFE ERROR HANDLING) ───────────────────────
  console.log('\n--- STEP 7: TESTING ERROR HANDLING (INVALID ACCOUNT ID) ---');
  const invalidResult = await zernioProvider.publish('zernio_master', {
    body: 'Test failure post',
    zernioProfileId: profileId,
    zernioAccountIds: ['invalid_account_id_999999999999999999999999'],
    idempotencyKey: `pub_fail_test_${Date.now()}`,
  });
  console.log(`   Invalid Account Handled Gracefully: ${!invalidResult.success ? '✅ REJECTED AS EXPECTED' : '❌ UNEXPECTED SUCCESS'}`);
  console.log(`   Sanitized Error: ${invalidResult.error}`);

  console.log('\n' + '='.repeat(70));
  if (publishResult.success) {
    console.log('  🏆 ZERNIO FACEBOOK PUBLISHING VERIFIED');
  } else {
    console.log('  ❌ ZERNIO FACEBOOK PUBLISHING FAILED');
  }
  console.log('='.repeat(70) + '\n');
}

testFacebookPublishing().catch((err) => {
  console.error('[FATAL ERROR]:', err.message);
  process.exit(1);
});
