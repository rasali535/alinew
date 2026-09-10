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

async function inspectProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, business_name, company_name, title');

  if (error) {
    throw new Error(`Unable to inspect profiles: ${error.message}`);
  }

  console.log('--- SUPABASE PROFILE SUMMARY ---');
  for (const profile of profiles || []) {
    console.log({
      id: profile.id,
      businessName: profile.business_name || null,
      companyName: profile.company_name || null,
      title: profile.title || null,
    });
  }
}

inspectProfiles().catch((error) => {
  console.error('[inspect-profiles-table] Failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
