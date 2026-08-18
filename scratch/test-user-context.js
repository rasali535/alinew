const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

(async () => {
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Check if we can insert or select with anon or authenticated
  const { data: users } = await serviceClient.auth.admin.listUsers();
  console.log('Found users:', users.users.map(u => ({ id: u.id, email: u.email })));

  // Test generating a token or checking user workspace
  for (const user of users.users.slice(0, 2)) {
    console.log(`\nTesting for user: ${user.email} (${user.id})`);
    
    // Check profiles
    const { data: prof, error: pErr } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    console.log('Profile:', prof, 'Error:', pErr?.message);

    // Check social connections for this user specifically
    const { data: conns, error: cErr } = await serviceClient
      .from('social_connections')
      .select('id, user_id, provider, account_name, workspace_id')
      .eq('user_id', user.id);
    console.log('User social_connections count:', conns?.length, 'Error:', cErr?.message);
  }
})();
