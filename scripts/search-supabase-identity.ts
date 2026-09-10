import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('SUPABASE_URL is not configured.');
}

if (!key) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const SEARCH_TERMS = ['multi-disciplinary', 'creative & technologist'];

function summarizeMatch(row: Record<string, unknown>) {
  const safeKeys = ['id', 'user_id', 'organization_id', 'workspace_id', 'name', 'business_name', 'company_name', 'title'];
  return Object.fromEntries(
    safeKeys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]])
  );
}

async function check() {
  console.log('--- Checking tenant/business identity records ---');

  const tables = [
    'business_knowledge',
    'business_profiles',
    'tenant_profiles',
    'organizations',
    'workspaces',
    'users',
    'profiles',
    'website_ingestions',
    'knowledge_documents',
    'social_connections',
    'social_account_tokens',
    'onboarding_data',
    'chat_sessions',
    'website_crawls',
    'workspace_knowledge',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(50);
      if (error) {
        console.log(`Table ${table}: error: ${error.message}`);
        continue;
      }

      console.log(`Table ${table}: count = ${data?.length || 0}`);
      if (!data?.length) continue;

      const matches = data.filter((row) => {
        const searchable = JSON.stringify(row).toLowerCase();
        return SEARCH_TERMS.some((term) => searchable.includes(term));
      });

      if (matches.length > 0) {
        console.log(`  FOUND ${matches.length} MATCH(ES) IN ${table}:`);
        for (const match of matches) {
          console.log(' ', summarizeMatch(match));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Table ${table}: exception: ${message}`);
    }
  }
}

check().catch((error) => {
  console.error('[search-supabase-identity] Failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
