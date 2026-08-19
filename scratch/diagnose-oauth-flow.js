const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
dotenv.config({ path: 'apps/ralion/.env' });
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY;
const ZERNIO_BASE_URL = process.env.ZERNIO_BASE_URL || 'https://api.zernio.com/v1';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseOAuth() {
  console.log('====================================================');
  console.log('RALION OS — FACEBOOK OAUTH & ZERNIO TRACE DIAGNOSIS');
  console.log('====================================================\n');

  // 1. Check Env variables for OAuth / Meta / Zernio
  console.log('[ENV CHECK]');
  console.log('  ZERNIO_BASE_URL:', ZERNIO_BASE_URL);
  console.log('  ZERNIO_API_KEY configured:', !!ZERNIO_API_KEY, ZERNIO_API_KEY ? `(length: ${ZERNIO_API_KEY.length})` : '');
  console.log('  FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'NOT_SET');
  console.log('  META_APP_ID:', process.env.META_APP_ID || 'NOT_SET');
  console.log('  NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET');

  // 2. Fetch User A and User B
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find(u => u.email === 'chiwabby@gmail.com');
  const userB = usersData?.users?.find(u => u.email === 'info@pameltex.com');

  console.log('\n[USERS]');
  console.log(`  User A: ${userA?.email} (${userA?.id})`);
  console.log(`  User B: ${userB?.email} (${userB?.id})`);

  // 3. Inspect social_provider_profiles table
  console.log('\n[DATABASE: social_provider_profiles]');
  const { data: dbProfiles, error: dbProfilesErr } = await supabaseAdmin
    .from('social_provider_profiles')
    .select('*');
  console.log('  dbProfiles error:', dbProfilesErr?.message || 'none');
  console.log('  dbProfiles rows:', dbProfiles || []);

  // 4. Query Zernio listProfiles API directly
  console.log('\n[ZERNIO API: listProfiles]');
  try {
    const res = await fetch(`${ZERNIO_BASE_URL}/profiles`, {
      headers: {
        'Authorization': `Bearer ${ZERNIO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const zProfiles = await res.json();
    console.log('  HTTP Status:', res.status);
    console.log('  Zernio Profiles count:', Array.isArray(zProfiles) ? zProfiles.length : (zProfiles.profiles?.length || 0));
    console.log('  Zernio Profiles data:', JSON.stringify(zProfiles, null, 2));

    // 5. Test getConnectUrl for Facebook for Profile 1
    const profileList = Array.isArray(zProfiles) ? zProfiles : (zProfiles.profiles || []);
    if (profileList.length > 0) {
      const p1 = profileList[0];
      console.log(`\n[ZERNIO API: getConnectUrl for Profile: ${p1.id} (${p1.name})]`);
      const connectRes = await fetch(`${ZERNIO_BASE_URL}/connect/facebook?profileId=${p1.id}&redirectUri=${encodeURIComponent('https://app.ralion.co/ralion/growth')}`, {
        headers: {
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('  Connect API Status:', connectRes.status);
      const connectData = await connectRes.json();
      console.log('  Connect API Response:', JSON.stringify(connectData, null, 2));

      if (connectData.authUrl || connectData.url) {
        const authUrl = connectData.authUrl || connectData.url;
        console.log('\n[OAUTH URL ANALYSIS]');
        const parsedUrl = new URL(authUrl);
        console.log('  Host:', parsedUrl.host);
        console.log('  Path:', parsedUrl.pathname);
        console.log('  client_id (Meta App ID):', parsedUrl.searchParams.get('client_id') || parsedUrl.searchParams.get('app_id'));
        console.log('  redirect_uri:', parsedUrl.searchParams.get('redirect_uri'));
        console.log('  scope:', parsedUrl.searchParams.get('scope'));
        console.log('  state (masked):', parsedUrl.searchParams.get('state')?.slice(0, 20) + '...');
      }
    }
  } catch (zErr) {
    console.error('  Zernio API query error:', zErr);
  }

  // 6. Check what happens when User A vs User B initiates connect from Ralion API
  console.log('\n[TESTING RALION /api/oauth/facebook/connect ROUTE]');
  const { data: linkA } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: userA.email });
  const { data: linkB } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: userB.email });
  
  const clientA = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionA } = await clientA.auth.verifyOtp({ email: userA.email, token: linkA.properties.email_otp, type: 'magiclink' });
  const tokenA = sessionA?.session?.access_token;

  const clientB = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionB } = await clientB.auth.verifyOtp({ email: userB.email, token: linkB.properties.email_otp, type: 'magiclink' });
  const tokenB = sessionB?.session?.access_token;

  // Let's test the route via internal invocation
  const { SocialProviderRouter } = require('./apps/ralion/src/lib/services/social/socialProviderRouter.service');
  const routingA = await SocialProviderRouter.resolveRouting({ platform: 'facebook', userId: userA.id, workspaceId: userA.id });
  const routingB = await SocialProviderRouter.resolveRouting({ platform: 'facebook', userId: userB.id, workspaceId: userB.id });

  console.log('\n[ROUTING DECISION]');
  console.log('  User A Routing:', routingA);
  console.log('  User B Routing:', routingB);
}

diagnoseOAuth().catch(console.error);
