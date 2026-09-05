import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: usersData, error: uErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (!usersData?.users || usersData.users.length === 0) {
    console.error('No users found in database');
    return;
  }

  // Let's find rasali / pameltex user
  const user = usersData.users[0];
  console.log(`Found user: ${user.id} (${user.email})`);

  // Sign in or generate token for this user
  // Let's create a custom user session or token using jwt
  // We can also sign in via password or magiclink
  const { data: linkData, error: lErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email!,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  const actionLink = linkData?.properties?.action_link;
  console.log('Action link generated:', actionLink ? 'yes' : 'no');

  // Verify OTP to get session tokens
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let accessToken = '';
  if (tokenHash) {
    const { data: sessionData, error: vErr } = await anonClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    });
    if (sessionData?.session) {
      accessToken = sessionData.session.access_token;
      console.log('Successfully acquired real user JWT token!');
    } else {
      console.warn('verifyOtp notice:', vErr?.message);
    }
  }

  if (!accessToken) {
    console.log('Testing with mock token or direct API test...');
  }

  // Now trigger GET /api/social/inbox on Render with real token
  const renderUrl = 'https://ralion-dynamic-backend.onrender.com/api/social/inbox';
  console.log(`\nTriggering authenticated GET ${renderUrl}...`);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'x-workspace-id': user.id,
    'x-organization-id': user.id,
  };

  const res = await fetch(renderUrl, { headers });
  console.log(`HTTP Status: ${res.status}`);
  console.log(`Content-Type: ${res.headers.get('content-type')}`);
  const body = await res.text();
  console.log(`Response Body:`, body);
}

main().catch(err => {
  console.error('Fatal error:', err);
});
