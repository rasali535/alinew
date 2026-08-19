const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
  console.log('\n=== STEP 1: AUTH USERS ===');
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) console.error('Users error:', userErr);
  usersData?.users?.forEach((u) => {
    console.log(`User: ${u.email} | ID: ${u.id}`);
  });

  console.log('\n=== STEP 2: WORKSPACES ===');
  const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('*');
  if (wsErr) console.warn('workspaces table error/notice:', wsErr.message);
  console.log('Workspaces found:', workspaces);

  console.log('\n=== STEP 3: WORKSPACE MEMBERS ===');
  const { data: members, error: memErr } = await supabase.from('workspace_members').select('*');
  if (memErr) console.warn('workspace_members table error/notice:', memErr.message);
  console.log('Members found:', members);

  console.log('\n=== STEP 4: SOCIAL CONNECTIONS ===');
  const { data: conns, error: connErr } = await supabase.from('social_connections').select('*');
  if (connErr) console.error('social_connections table error:', connErr.message);
  console.log('Social connections found:', JSON.stringify(conns, null, 2));

  console.log('\n=== STEP 5: SOCIAL DESTINATIONS ===');
  const { data: dests, error: destErr } = await supabase.from('social_destinations').select('*');
  if (destErr) console.warn('social_destinations table error/notice:', destErr.message);
  console.log('Social destinations found:', JSON.stringify(dests, null, 2));
}

diagnose().catch(console.error);
