const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectUsers() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  console.log('\n--- ALL SUPABASE USERS ---');
  usersData?.users?.forEach((u) => {
    console.log({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
      app_metadata: u.app_metadata,
    });
  });

  console.log('\n--- PROFILES TABLE ---');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  console.log('Profiles error:', profErr?.message);
  console.log('Profiles data:', profiles);

  console.log('\n--- ORGANIZATIONS TABLE ---');
  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*');
  console.log('Organizations error:', orgErr?.message);
  console.log('Organizations data:', orgs);

  console.log('\n--- ORGANIZATION MEMBERS TABLE ---');
  const { data: orgMembers, error: orgMemErr } = await supabase.from('organization_members').select('*');
  console.log('Org members error:', orgMemErr?.message);
  console.log('Org members data:', orgMembers);
}

inspectUsers().catch(console.error);
