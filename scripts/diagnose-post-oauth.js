#!/usr/bin/env node

/**
 * RALION — Post-OAuth Flow & Account Diagnostic Prober
 * Ras Ali Labs (Pty) Ltd
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ralionProd.NEXT_PUBLIC_SUPABASE_URL ||
  rootEnv.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yidsfihagwttlmhfynmf.supabase.co';

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ralionProd.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

async function callEdgeBridge(pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/functions/v1/zernio-bridge${pathname}`);
    const req = https.request(
      url,
      {
        method,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runPostOAuthDiagnostics() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍  RALION POST-OAUTH ZERNIO ACCOUNT & WEBHOOK DIAGNOSTICS');
  console.log('      Ras Ali Labs (Pty) Ltd — Live System Analysis');
  console.log('='.repeat(70) + '\n');

  const profileId = '6a82deac1a69158ef81cb2cd';

  // 1. Query Profile Accounts
  console.log(`--- STEP 1: QUERYING ZERNIO ACCOUNTS FOR PROFILE (${profileId}) ---`);
  try {
    const accountsRes = await callEdgeBridge(`/accounts?profileId=${profileId}`);
    console.log(`[HTTP ${accountsRes.status}] Accounts for Profile:`, JSON.stringify(accountsRes.data, null, 2));

    // Also query all accounts without profile filter
    console.log('\n--- STEP 2: QUERYING ALL ZERNIO ACCOUNTS ---');
    const allAccountsRes = await callEdgeBridge('/accounts');
    console.log(`[HTTP ${allAccountsRes.status}] All Accounts:`, JSON.stringify(allAccountsRes.data, null, 2));

    // 3. Query Profile Details to see accountUsernames / accounts
    console.log(`\n--- STEP 3: QUERYING PROFILE DETAILS (${profileId}) ---`);
    const profileDetails = await callEdgeBridge(`/profiles/${profileId}`);
    console.log(`[HTTP ${profileDetails.status}] Profile Details:`, JSON.stringify(profileDetails.data, null, 2));

  } catch (err) {
    console.error('[DIAGNOSTIC ERROR]:', err.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

runPostOAuthDiagnostics();
