import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function inspectAndEnsureAdminFacebook() {
  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const pageId = '477334159265235'; // Ras Ali Labs Facebook Page

  console.log('--- Inspecting social_connections ---');
  const { data: conns, error: connErr } = await supabase
    .from('social_connections')
    .select('*');

  console.log('social_connections:', JSON.stringify(conns, null, 2));

  console.log('\n--- Inspecting social_provider_profiles ---');
  const { data: profs, error: profErr } = await supabase
    .from('social_provider_profiles')
    .select('*');

  console.log('social_provider_profiles:', JSON.stringify(profs, null, 2));
}

inspectAndEnsureAdminFacebook().catch(console.error);
