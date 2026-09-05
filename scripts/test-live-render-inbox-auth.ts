import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  console.log('[Auth Test] Connecting to Supabase...');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon key present:', Boolean(anonKey));
  console.log('Service key present:', Boolean(serviceKey));

  // Let's test fetching a user or creating an auth token
  const client = createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Query users or generate a session token for testing
  const { data: usersData, error: uErr } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  
  let testUserToken = '';
  let testUserId = '';
  let testUserEmail = '';

  if (usersData?.users && usersData.users.length > 0) {
    const user = usersData.users[0];
    testUserId = user.id;
    testUserEmail = user.email || '';
    console.log(`Found real user: ${testUserId} (${testUserEmail})`);

    // Generate link / token
    const { data: linkData, error: lErr } = await client.auth.admin.generateLink({
      type: 'magiclink',
      email: testUserEmail,
    });
    
    // Or sign in with password if known, or inspect properties
  }

  // Let's trigger GET /api/social/inbox on local and on Render
  const renderUrl = 'https://ralion-dynamic-backend.onrender.com/api/social/inbox';
  console.log(`\nTriggering live GET ${renderUrl}...`);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'x-user-id': testUserId || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    'x-workspace-id': 'ras-ali-labs',
    'x-organization-id': 'ras-ali-labs',
  };

  const res = await fetch(renderUrl, { headers });
  console.log(`Status: ${res.status}`);
  console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
  const body = await res.text();
  console.log(`Body:`, body);
}

main().catch(err => {
  console.error('Fatal error:', err);
});
