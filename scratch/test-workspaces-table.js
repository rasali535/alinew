const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

(async () => {
  // Let's test if we can insert or select from workspaces or if it's missing in public schema
  try {
    const { data, error } = await supabase.from('workspaces').select('id, name, owner_id').limit(5);
    console.log('Workspaces query:', { data, error });
  } catch (e) {
    console.log('Workspaces exception:', e.message);
  }

  // Check profiles
  try {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    console.log('Profiles query:', { count: profiles?.length, error: pErr });
  } catch (e) {
    console.log('Profiles exception:', e.message);
  }
})();
