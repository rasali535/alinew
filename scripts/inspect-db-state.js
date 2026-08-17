#!/usr/bin/env node

/**
 * RALION — Inspect Supabase Database State for Social Provider Profiles
 * Ras Ali Labs (Pty) Ltd
 */

const { createClient } = require('@supabase/supabase-js');
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

async function checkDb() {
  console.log('\n--- INSPECTING SUPABASE DATABASE STATE ---');
  const supabase = createClient(supabaseUrl, anonKey);

  const { data: profiles, error: pErr } = await supabase
    .from('social_provider_profiles')
    .select('*');

  console.log('social_provider_profiles:', pErr ? `Error: ${pErr.message}` : profiles);

  const { data: connections, error: cErr } = await supabase
    .from('social_connections')
    .select('*');

  console.log('social_connections:', cErr ? `Error: ${cErr.message}` : connections);
}

checkDb();
