import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = 'https://yidsfihagwttlmhfynmf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(url, key);

async function check() {
  console.log('--- Checking tables for Multi-Disciplinary or Ras Ali ---');
  
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
    'workspace_knowledge'
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(50);
      if (error) {
        console.log(`Table ${t}: error: ${error.message}`);
      } else {
        console.log(`Table ${t}: count = ${data?.length || 0}`);
        if (data && data.length > 0) {
          const matched = data.filter(row => {
            const str = JSON.stringify(row).toLowerCase();
            return str.includes('multi-disciplinary') || str.includes('creative & technologist');
          });
          if (matched.length > 0) {
            console.log(`  FOUND MATCH IN ${t}:`, JSON.stringify(matched, null, 2));
          }
        }
      }
    } catch (e: any) {
      console.log(`Table ${t}: exception: ${e.message}`);
    }
  }
}
check();
