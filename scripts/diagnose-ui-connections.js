#!/usr/bin/env node

/**
 * RALION — Diagnose UI Social Connection Resolution
 * Ras Ali Labs (Pty) Ltd
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function diagnoseUiConnections() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍  RALION UI SOCIAL CONNECTION STATE DEEP DIAGNOSTIC');
  console.log('='.repeat(70) + '\n');

  const supabase = createClient(supabaseUrl, anonKey);

  // 1. Check current users in Supabase Auth (if any accessible)
  console.log('1. Checking Supabase Auth session / users:');
  const { data: authUser, error: authErr } = await supabase.auth.getUser();
  console.log('   Current Client Auth User:', authUser?.user?.id || 'None (anon client)');

  // 2. Query social_provider_profiles table
  console.log('\n2. Querying social_provider_profiles:');
  const { data: profiles, error: profErr } = await supabase.from('social_provider_profiles').select('*');
  if (profErr) {
    console.log('   [ERROR]:', profErr.message, profErr.code);
  } else {
    console.log(`   Found ${profiles.length} profiles:`, JSON.stringify(profiles, null, 2));
  }

  // 3. Query social_connections table
  console.log('\n3. Querying social_connections:');
  const { data: conns, error: connErr } = await supabase.from('social_connections').select('*');
  if (connErr) {
    console.log('   [ERROR]:', connErr.message, connErr.code);
  } else {
    console.log(`   Found ${conns.length} connections:`, JSON.stringify(conns, null, 2));
  }

  // 4. Query social_account_tokens table
  console.log('\n4. Querying social_account_tokens:');
  const { data: tokens, error: tokErr } = await supabase.from('social_account_tokens').select('provider, account_label, account_handle, status, user_id');
  if (tokErr) {
    console.log('   [ERROR]:', tokErr.message, tokErr.code);
  } else {
    console.log(`   Found ${tokens.length} legacy tokens:`, JSON.stringify(tokens, null, 2));
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

diagnoseUiConnections();
