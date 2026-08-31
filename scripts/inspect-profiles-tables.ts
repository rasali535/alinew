import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function inspectSchema() {
  console.log('--- PROFILES TABLE ---');
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log(JSON.stringify(profs, null, 2));

  console.log('--- SOCIAL_CONNECTIONS TABLE ---');
  const { data: socConns } = await supabase.from('social_connections').select('*');
  console.log(JSON.stringify(socConns, null, 2));

  console.log('--- SOCIAL_PROVIDER_PROFILES TABLE ---');
  const { data: socProfs } = await supabase.from('social_provider_profiles').select('*');
  console.log(JSON.stringify(socProfs, null, 2));
}

inspectSchema().catch(console.error);
