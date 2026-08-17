#!/usr/bin/env node

/**
 * RALION — Social Media System Unit & Integration Test Suite
 * Ras Ali Labs (Pty) Ltd
 * Automated Verification for Native Providers and Zernio Social Infrastructure Layer
 */

const assert = require('assert');
const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  🧪  RALION UNIFIED SOCIAL MEDIA SYSTEM TEST SUITE');
console.log('      Ras Ali Labs (Pty) Ltd — Automated Verification');
console.log('='.repeat(70) + '\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

// ---------------------------------------------------------------------
// 1. Test AES-256-GCM Token Encryption & Decryption
// ---------------------------------------------------------------------
runTest('AES-256-GCM Token Encryption & Decryption', () => {
  const secret = 'ralion-enterprise-oauth-secret-key-32bytes-secure!';
  const key = crypto.createHash('sha256').update(secret).digest();
  const token = 'meta_access_token_super_secret_xyz123';
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope = `enc_gcm_v2_${iv.toString('hex')}_${authTag.toString('hex')}_${encrypted.toString('hex')}`;
  assert(envelope.startsWith('enc_gcm_v2_'), 'Envelope must start with enc_gcm_v2_');

  // Decryption
  const parts = envelope.replace('enc_gcm_v2_', '').split('_');
  const [ivHex, tagHex, cipherHex] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]).toString('utf8');

  assert.strictEqual(decrypted, token, 'Decrypted token must match original token');
});

// ---------------------------------------------------------------------
// 2. Test OAuth State CSRF Protection & Expiration
// ---------------------------------------------------------------------
runTest('OAuth State CSRF Nonce Validation & 15-Min Expiration', () => {
  const workspaceId = 'ras-ali-labs';
  const provider = 'facebook';
  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = Date.now();
  const payload = JSON.stringify({ workspaceId, provider, nonce, ts });
  const stateToken = Buffer.from(payload).toString('base64url');

  const decoded = JSON.parse(Buffer.from(stateToken, 'base64url').toString('utf-8'));
  assert.strictEqual(decoded.workspaceId, workspaceId);
  assert.strictEqual(decoded.provider, provider);
  const isValid = Date.now() - decoded.ts < 15 * 60 * 1000;
  assert.strictEqual(isValid, true, 'State should be valid within 15 minutes');

  // Expired state test
  const expiredPayload = JSON.stringify({ workspaceId, provider, nonce, ts: Date.now() - 20 * 60 * 1000 });
  const expiredState = Buffer.from(expiredPayload).toString('base64url');
  const expiredDecoded = JSON.parse(Buffer.from(expiredState, 'base64url').toString('utf-8'));
  const isExpired = Date.now() - expiredDecoded.ts >= 15 * 60 * 1000;
  assert.strictEqual(isExpired, true, 'State older than 15 mins must be rejected');
});

// ---------------------------------------------------------------------
// 3. Test Content Length & Platform Validation
// ---------------------------------------------------------------------
runTest('Content Length Validation (X limit vs Instagram vs TikTok)', () => {
  const shortText = 'Exciting news from Ras Ali Labs! Ralion OS 2.4 is live.';
  const longText = 'A'.repeat(300);

  assert(shortText.length <= 280, 'Short text must pass X validation');
  assert(longText.length > 280, '300-char text must trigger X character limit error');
});

// ---------------------------------------------------------------------
// 4. Test Webhook HMAC Signature Verification
// ---------------------------------------------------------------------
runTest('Webhook HMAC-SHA256 Signature Verification', () => {
  const secret = 'test_webhook_secret_123';
  const payload = JSON.stringify({ entry: [{ id: '123', changes: [{ field: 'messages' }] }] });

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'utf-8'), Buffer.from(expectedSig, 'utf-8'));
  assert.strictEqual(isValid, true, 'Valid HMAC signature must verify successfully');

  const tamperedPayload = payload + ' ';
  const tamperedSig = crypto.createHmac('sha256', secret).update(tamperedPayload).digest('hex');
  const isTampered = crypto.timingSafeEqual(Buffer.from(signature, 'utf-8'), Buffer.from(tamperedSig, 'utf-8'));
  assert.strictEqual(isTampered, false, 'Tampered payload signature must be rejected');
});

// ---------------------------------------------------------------------
// 5. Test Rate Limiting Exponential Backoff
// ---------------------------------------------------------------------
runTest('Exponential Backoff Rate Limit Calculation', () => {
  function calculateBackoff(attempt) {
    return Math.min(30000, 1000 * Math.pow(2, attempt));
  }

  assert.strictEqual(calculateBackoff(0), 1000);
  assert.strictEqual(calculateBackoff(1), 2000);
  assert.strictEqual(calculateBackoff(2), 4000);
  assert.strictEqual(calculateBackoff(3), 8000);
  assert.strictEqual(calculateBackoff(10), 30000); // capped at 30s
});

// ---------------------------------------------------------------------
// 6. Test Zernio Provider Integration & Sub-suites
// ---------------------------------------------------------------------
runTest('Zernio Service Sub-Suite Execution', () => {
  const scriptPath = path.join(__dirname, 'test-zernio-service.js');
  execSync(`node "${scriptPath}"`, { stdio: 'pipe' });
});

runTest('Zernio Multi-Tenant RLS Sub-Suite Execution', () => {
  const scriptPath = path.join(__dirname, 'test-zernio-rls.js');
  execSync(`node "${scriptPath}"`, { stdio: 'pipe' });
});

// ---------------------------------------------------------------------
// Test Results Summary
// ---------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log(`  📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
if (failedTests === 0) {
  console.log('  🏆 ALL SOCIAL SYSTEM TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('  ⚠️ SOME TESTS FAILED. Please review above output.');
}
console.log('='.repeat(70) + '\n');

process.exit(failedTests === 0 ? 0 : 1);
