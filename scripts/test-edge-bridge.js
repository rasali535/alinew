#!/usr/bin/env node

/**
 * RALION — Supabase Edge Function Zernio Bridge Live Probe
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
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTIwMjgsImV4cCI6MjA3MDIyODAyOH0.0Sj6v9E5bKkY8XpX4R4pQ9yY8XpX4R4pQ9yY8XpX4R4';

console.log('\n' + '='.repeat(70));
console.log('  🌐  SUPABASE EDGE FUNCTION ZERNIO BRIDGE LIVE PROBE');
console.log('      Target:', `${supabaseUrl}/functions/v1/zernio-bridge/health`);
console.log('='.repeat(70) + '\n');

const url = new URL(`${supabaseUrl}/functions/v1/zernio-bridge/health`);

const req = https.request(
  url,
  {
    method: 'GET',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Accept': 'application/json',
      'User-Agent': 'Ralion-Health-Checker/1.0.0',
    },
    timeout: 15000,
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`  [HTTP STATUS] : ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log('  [RESPONSE]    :', JSON.stringify(parsed, null, 2));
      } catch {
        console.log('  [RAW BODY]    :', data);
      }
      console.log('\n' + '='.repeat(70) + '\n');
    });
  }
);

req.on('error', (err) => {
  console.error('  [ERROR]:', err.message);
  console.log('\n' + '='.repeat(70) + '\n');
});

req.on('timeout', () => {
  req.destroy();
  console.error('  [ERROR]: Request timed out');
  console.log('\n' + '='.repeat(70) + '\n');
});

req.end();
