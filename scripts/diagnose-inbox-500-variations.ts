import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: usersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 10 });
  const user = usersData?.users?.[0];
  if (!user) throw new Error('No users found in database');

  console.log(`Testing with user: ${user.id} (${user.email})`);

  // Acquire real JWT
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email!,
  });
  const tokenHash = linkData?.properties?.hashed_token;

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: sessionData } = await anonClient.auth.verifyOtp({
    token_hash: tokenHash!,
    type: 'email',
  });
  const accessToken = sessionData?.session?.access_token;
  console.log('Got real accessToken:', Boolean(accessToken));

  const endpoints = [
    // 1. Direct Render
    { method: 'GET', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox?provider=facebook', name: 'Render GET with provider' },
    { method: 'GET', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox', name: 'Render GET without provider' },
    { method: 'POST', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox', name: 'Render POST empty body', body: {} },
    { method: 'POST', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox', name: 'Render POST test reply', body: { conversationId: 't_12345', messageText: 'Hello from test', recipientId: 'rec_123', provider: 'facebook' } },

    // 2. Hostinger Proxy (/api/social/inbox)
    { method: 'GET', url: 'https://rasalilabs.com/api/social/inbox?provider=facebook', name: 'Hostinger /api GET with provider' },
    { method: 'GET', url: 'https://rasalilabs.com/api/social/inbox', name: 'Hostinger /api GET without provider' },
    { method: 'POST', url: 'https://rasalilabs.com/api/social/inbox', name: 'Hostinger /api POST test reply', body: { conversationId: 't_12345', messageText: 'Hello from test', recipientId: 'rec_123', provider: 'facebook' } },

    // 3. Hostinger Proxy (/ralion/api/social/inbox)
    { method: 'GET', url: 'https://rasalilabs.com/ralion/api/social/inbox?provider=facebook', name: 'Hostinger /ralion/api GET with provider' },
    { method: 'GET', url: 'https://rasalilabs.com/ralion/api/social/inbox', name: 'Hostinger /ralion/api GET without provider' },
    { method: 'POST', url: 'https://rasalilabs.com/ralion/api/social/inbox', name: 'Hostinger /ralion/api POST test reply', body: { conversationId: 't_12345', messageText: 'Hello from test', recipientId: 'rec_123', provider: 'facebook' } },
  ];

  for (const ep of endpoints) {
    console.log(`\n============================================================`);
    console.log(`[TEST] ${ep.name}: ${ep.method} ${ep.url}`);

    // A. With valid JWT
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-user-id': user.id,
        'x-workspace-id': user.id,
        'x-organization-id': user.id,
        'Content-Type': 'application/json',
      };
      const res = await fetch(ep.url, {
        method: ep.method,
        headers,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      console.log(`  [With Auth] Status: ${res.status} | Content-Type: ${ct}`);
      console.log(`  [With Auth] Body: ${body.substring(0, 200)}`);
    } catch (e: any) {
      console.error(`  [With Auth] ERROR:`, e.message);
    }

    // B. Without Auth
    try {
      const resNoAuth = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      const ct = resNoAuth.headers.get('content-type') || '';
      const body = await resNoAuth.text();
      console.log(`  [No Auth] Status: ${resNoAuth.status} | Content-Type: ${ct}`);
      console.log(`  [No Auth] Body: ${body.substring(0, 200)}`);
    } catch (e: any) {
      console.error(`  [No Auth] ERROR:`, e.message);
    }
  }
}

main().catch(err => console.error('Main error:', err));
