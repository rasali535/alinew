const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== AUDITING EXISTING DATABASE SCHEMA ===\n');

  const tablesToCheck = [
    'workspaces',
    'workspace_members',
    'organizations',
    'organization_members',
    'profiles',
    'user_profiles',
    'social_connections',
    'social_destinations',
    'social_posts',
    'social_account_tokens'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        console.log(`[TABLE] ${table}: NOT FOUND or error -> ${error.message}`);
      } else {
        console.log(`[TABLE] ${table}: EXISTS (${data.length} sample rows)`);
        if (data.length > 0) {
          console.log(`   Columns in ${table}:`, Object.keys(data[0]));
        }
      }
    } catch (e) {
      console.log(`[TABLE] ${table}: Exception ->`, e.message);
    }
  }

  // Also check auth users
  try {
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) {
      console.log('Auth users query error:', uErr.message);
    } else {
      console.log(`\nTotal Auth Users: ${users.length}`);
      users.forEach(u => {
        console.log(` - User ID: ${u.id}, Email: ${u.email}`);
      });
    }
  } catch (e) {
    console.log('List users exception:', e.message);
  }
})();
