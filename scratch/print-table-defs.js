const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

(async () => {
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  const schema = await res.json();

  const tables = ['profiles', 'workspaces', 'workspace_members', 'organizations', 'organization_members', 'social_connections'];
  for (const t of tables) {
    console.log(`=== DEFINITION FOR TABLE: ${t} ===`);
    const def = schema.definitions[t];
    if (def) {
      console.log('Properties:', Object.keys(def.properties || {}));
      console.log('Required:', def.required);
    } else {
      console.log('Not found in definitions');
    }
  }
})();
