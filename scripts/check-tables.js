#!/usr/bin/env node

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ralionProd.NEXT_PUBLIC_SUPABASE_URL || rootEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ralionProd.NEXT_PUBLIC_SUPABASE_ANON_KEY || rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function checkTables() {
  const supabase = createClient(supabaseUrl, anonKey);
  const tables = [
    'users', 'workspaces', 'organizations', 'meta_connections', 'social_connections',
    'social_provider_profiles', 'social_credentials', 'social_account_tokens',
    'security_audit_logs', 'social_posts', 'social_inbox_messages'
  ];

  console.log('--- TABLE EXISTENCE CHECK IN SUPABASE ---');
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`[TABLE] ${t.padEnd(26)} : ❌ MISSING (${error.message})`);
    } else {
      console.log(`[TABLE] ${t.padEnd(26)} : ✅ EXISTS`);
    }
  }
}

checkTables();
