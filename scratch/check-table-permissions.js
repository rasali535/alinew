const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Let's test querying various tables with service-role and check the errors
  const tests = [
    'profiles',
    'workspaces',
    'workspace_members',
    'organizations',
    'organization_members',
    'roles',
    'social_connections',
    'social_posts',
    'social_post_comments',
    'social_post_comment_replies',
    'social_inbox_messages',
  ];

  for (const t of tests) {
    const res = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: status=${res.status}, count=${res.count}, error=${res.error?.message || 'none'}`);
  }
})();
