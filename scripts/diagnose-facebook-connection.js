#!/usr/bin/env node

/**
 * RALION — Comprehensive Facebook Connection Diagnostic Prober
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
const ralionLocal = parseEnvFile(path.join(ROOT_DIR, 'apps/ralion/.env.local'));
const ralionProd = parseEnvFile(path.join(ROOT_DIR, 'apps/ralion/.env.production'));
const rootEnv = parseEnvFile(path.join(ROOT_DIR, '.env'));

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ralionLocal.NEXT_PUBLIC_SUPABASE_URL ||
  ralionProd.NEXT_PUBLIC_SUPABASE_URL ||
  rootEnv.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yidsfihagwttlmhfynmf.supabase.co';

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ralionLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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

async function runDiagnostics() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍  RALION END-TO-END FACEBOOK CONNECTION DIAGNOSTICS');
  console.log('      Ras Ali Labs (Pty) Ltd — Live System Analysis');
  console.log('='.repeat(70) + '\n');

  // Step 1: Query Zernio Profiles
  console.log('--- STEP 1: QUERYING ZERNIO PROFILES VIA EDGE BRIDGE ---');
  try {
    const profilesRes = await callEdgeBridge('/profiles');
    console.log(`[HTTP ${profilesRes.status}] Profiles Response:`, JSON.stringify(profilesRes.data, null, 2));

    let profileId = null;
    if (Array.isArray(profilesRes.data) && profilesRes.data.length > 0) {
      profileId = profilesRes.data[0].id || profilesRes.data[0]._id;
    } else if (profilesRes.data?.profiles && profilesRes.data.profiles.length > 0) {
      profileId = profilesRes.data.profiles[0].id;
    }

    if (!profileId) {
      console.log('\n[NOTICE]: No profiles found in Zernio. Attempting to create test profile...');
      const createProfileRes = await callEdgeBridge('/profiles', 'POST', {
        name: 'Ras Ali Labs Diagnostic Profile',
        description: 'Automated test profile for Facebook connection diagnostics',
      });
      console.log(`[HTTP ${createProfileRes.status}] Create Profile Response:`, JSON.stringify(createProfileRes.data, null, 2));
      profileId = createProfileRes.data?.id || createProfileRes.data?.profile?.id || 'diag_prof_1';
    }

    console.log(`\nActive Zernio Profile ID: ${profileId}`);

    // Step 2: Test Connect Facebook Endpoint
    console.log('\n--- STEP 2: TESTING ZERNIO CONNECT ENDPOINTS FOR FACEBOOK ---');
    const platformsToTest = ['facebook', 'facebook_page', 'facebook-page', 'meta', 'instagram'];
    
    for (const plat of platformsToTest) {
      const redirectUri = 'https://rasalilabs.com/ralion/growth?connected=' + plat + '&provider=zernio';
      const connectPath = `/connect/${plat}?profileId=${encodeURIComponent(profileId)}&redirectUri=${encodeURIComponent(redirectUri)}`;
      console.log(`\n[PROBE]: GET ${connectPath}`);
      const connectRes = await callEdgeBridge(connectPath);
      console.log(`[HTTP ${connectRes.status}] Response:`, JSON.stringify(connectRes.data || connectRes.raw, null, 2));
    }

  } catch (err) {
    console.error('[DIAGNOSTIC ERROR]:', err.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

runDiagnostics();
