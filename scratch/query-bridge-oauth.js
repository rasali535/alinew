const dotenv = require('dotenv');
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function queryEdgeBridge() {
  console.log('====================================================');
  console.log('RALION OS — EDGE BRIDGE / ZERNIO DIRECT TRACE');
  console.log('====================================================\n');

  console.log('SUPABASE_URL:', SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY present:', !!SUPABASE_ANON_KEY);

  // 1. List Profiles from Zernio Bridge
  console.log('\n--- 1. CALLING /functions/v1/zernio-bridge/profiles ---');
  const resProfiles = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/profiles`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status:', resProfiles.status);
  const profilesData = await resProfiles.json();
  console.log('Profiles Response:', JSON.stringify(profilesData, null, 2));

  const profiles = Array.isArray(profilesData) ? profilesData : (profilesData.profiles || profilesData.data || []);
  
  for (const p of profiles) {
    const profileId = p.id || p._id;
    console.log(`\n--- 2. INSPECTING PROFILE: ${profileId} (${p.name || 'unnamed'}) ---`);
    
    // Accounts
    const resAccounts = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/accounts?profileId=${profileId}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('  Accounts status:', resAccounts.status);
    const accountsData = await resAccounts.json();
    console.log('  Accounts:', JSON.stringify(accountsData, null, 2));

    // Connect URL for Facebook
    console.log(`\n--- 3. REQUESTING CONNECT URL FOR FACEBOOK (Profile: ${profileId}) ---`);
    const resConnect = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/connect/facebook?profileId=${profileId}&redirectUri=${encodeURIComponent('https://rasalilabs.com/ralion/growth?connected=facebook&provider=zernio')}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('  Connect API Status:', resConnect.status);
    const connectData = await resConnect.json();
    console.log('  Connect API Response:', JSON.stringify(connectData, null, 2));

    const authUrl = connectData.authUrl || connectData.url;
    if (authUrl) {
      console.log('\n=== OAUTH URL BREAKDOWN ===');
      const u = new URL(authUrl);
      console.log('Host:', u.host);
      console.log('Path:', u.pathname);
      console.log('client_id / app_id (Meta App ID):', u.searchParams.get('client_id') || u.searchParams.get('app_id'));
      console.log('redirect_uri:', u.searchParams.get('redirect_uri'));
      console.log('scope:', u.searchParams.get('scope'));
      console.log('response_type:', u.searchParams.get('response_type'));
      console.log('state:', u.searchParams.get('state'));
    }
  }
}

queryEdgeBridge().catch(console.error);
