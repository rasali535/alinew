#!/usr/bin/env node

/**
 * RALION — Test Connect with Valid Zernio _id
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

async function callEdgeBridge(pathname) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/functions/v1/zernio-bridge${pathname}`);
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
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
    req.end();
  });
}

async function run() {
  const profileId = '6a82deac1a69158ef81cb2cd'; // Actual Zernio profile ObjectId
  console.log(`\nTesting Zernio Connect for Profile ObjectId: ${profileId}`);

  const platforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'whatsapp', 'youtube'];

  for (const plat of platforms) {
    const redirectUri = 'https://rasalilabs.com/ralion/growth?connected=' + plat + '&provider=zernio';
    const connectPath = `/connect/${plat}?profileId=${profileId}&redirectUri=${encodeURIComponent(redirectUri)}`;
    console.log(`\n--- PROBING: GET ${connectPath} ---`);
    const res = await callEdgeBridge(connectPath);
    console.log(`[HTTP ${res.status}] Response:`, JSON.stringify(res.data || res.raw, null, 2));
  }
}

run();
