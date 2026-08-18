const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: conns } = await supabase.from('social_connections').select('*');
  console.log('=== SOCIAL CONNECTIONS IN SUPABASE ===');
  console.log(JSON.stringify(conns, null, 2));

  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('\n=== PROFILES IN SUPABASE ===');
  console.log(JSON.stringify(profs, null, 2));
})();
