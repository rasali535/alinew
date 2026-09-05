import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const rasaliUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const { data: userData } = await adminClient.auth.admin.getUserById(rasaliUserId);
  const user = userData?.user;
  if (!user) throw new Error('User 22e61ff6-16fe-44c7-9d67-38e2a2e91ccf not found');

  console.log(`Testing with Ras Ali Labs user: ${user.id} (${user.email})`);

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
  console.log('Got real accessToken for Ras Ali Labs:', Boolean(accessToken));

  const endpoints = [
    { method: 'GET', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox?provider=facebook', name: 'GET /api/social/inbox?provider=facebook' },
    { method: 'GET', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox', name: 'GET /api/social/inbox' },
    { method: 'POST', url: 'https://ralion-dynamic-backend.onrender.com/api/social/inbox', name: 'POST /api/social/inbox', body: {
      connectionId: 'f8656d3c-789b-4890-bc80-83920ce91870',
      provider: 'facebook',
      conversationId: 't_6a82df7277555aae018b92b4',
      recipientId: '477334159265235',
      messageText: 'Hello from Ras Ali Labs live verification',
    }},
  ];

  for (const ep of endpoints) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`[TEST] ${ep.name}`);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-user-id': user.id,
      'x-workspace-id': user.id,
      'x-organization-id': 'ras-ali-labs',
      'Content-Type': 'application/json',
    };
    const res = await fetch(ep.url, {
      method: ep.method,
      headers,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    console.log(`Status: ${res.status} | Content-Type: ${res.headers.get('content-type')}`);
    const body = await res.text();
    console.log(`Body:`, body);
  }
}

main().catch(err => console.error('Error:', err));
