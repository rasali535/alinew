#!/usr/bin/env node

/**
 * RALION — Check Live Supabase Database Tables for Social Records
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

async function checkLiveDatabase() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍  RALION LIVE DATABASE INSPECTION');
  console.log('='.repeat(70) + '\n');

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Check social_provider_profiles
  console.log('--- 1. Querying social_provider_profiles ---');
  const { data: profiles, error: profErr } = await supabase.from('social_provider_profiles').select('*');
  if (profErr) {
    console.log('[ERROR]:', profErr.message);
  } else {
    console.log(`[COUNT: ${profiles.length}]`, JSON.stringify(profiles, null, 2));
  }

  // 2. Check social_connections
  console.log('\n--- 2. Querying social_connections ---');
  const { data: conns, error: connErr } = await supabase.from('social_connections').select('*');
  if (connErr) {
    console.log('[ERROR]:', connErr.message);
  } else {
    console.log(`[COUNT: ${conns.length}]`, JSON.stringify(conns, null, 2));
  }

  // 3. Check meta_connections
  console.log('\n--- 3. Querying meta_connections ---');
  const { data: metaConns, error: metaErr } = await supabase.from('meta_connections').select('*');
  if (metaErr) {
    console.log('[ERROR]:', metaErr.message);
  } else {
    console.log(`[COUNT: ${metaConns.length}]`, JSON.stringify(metaConns, null, 2));
  }

  // 4. Check users table to get primary user ID
  console.log('\n--- 4. Querying users ---');
  const { data: users, error: userErr } = await supabase.from('users').select('id, email').limit(5);
  if (userErr) {
    console.log('[ERROR]:', userErr.message);
  } else {
    console.log(`[COUNT: ${users.length}]`, JSON.stringify(users, null, 2));
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

checkLiveDatabase();
