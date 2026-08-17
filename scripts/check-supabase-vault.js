#!/usr/bin/env node

/**
 * RALION — Check Supabase Vault & Secrets for ZERNIO_API_KEY
 * Ras Ali Labs (Pty) Ltd
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ralionLocal.SUPABASE_SERVICE_ROLE_KEY ||
  ralionProd.SUPABASE_SERVICE_ROLE_KEY ||
  rootEnv.SUPABASE_SERVICE_ROLE_KEY ||
  '';

console.log('\n' + '='.repeat(70));
console.log('  🔒  CHECKING SUPABASE VAULT & SERVER-SIDE SECRETS');
console.log('      Supabase URL:', supabaseUrl);
console.log('='.repeat(70) + '\n');

async function checkVault() {
  if (!serviceRoleKey) {
    console.log('  [NOTICE]: SUPABASE_SERVICE_ROLE_KEY is not set in local env.');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Try querying vault.decrypted_secrets view via RPC or direct select
    console.log('  [QUERY] : Inspecting Supabase Vault decrypted_secrets ...');
    const { data: vaultSecrets, error: vaultErr } = await supabase
      .from('decrypted_secrets')
      .select('name, description, updated_at')
      .eq('name', 'ZERNIO_API_KEY')
      .maybeSingle();

    if (vaultSecrets) {
      console.log('  [VAULT] : Found secret ZERNIO_API_KEY in Supabase Vault!');
      return 'VAULT_FOUND';
    }

    if (vaultErr) {
      console.log('  [VAULT QUERY NOTICE]:', vaultErr.message);
    }

    // 2. Try calling an RPC get_secret if configured
    const { data: rpcSecret, error: rpcErr } = await supabase.rpc('get_secret', { secret_name: 'ZERNIO_API_KEY' });
    if (rpcSecret) {
      console.log('  [VAULT RPC]: Retrieved secret via get_secret RPC!');
      return rpcSecret;
    }
  } catch (err) {
    console.log('  [VAULT NOTICE]:', err.message);
  }

  return null;
}

async function probeZernio(apiKey) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request(
      'https://zernio.com/api/v1/profiles',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: 'application/json',
          'User-Agent': 'Ralion-Server-Verifier/1.0.0 (RasAliLabs)',
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const latencyMs = Date.now() - startTime;
          const status = res.statusCode || 0;
          resolve({ status, latencyMs });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'Request timeout' });
    });

    req.end();
  });
}

async function run() {
  const vaultResult = await checkVault();
  console.log('\n  [CHECK FINISHED]');
}

run();
