require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function inspectAllAccounts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Fetching profiles...');
  const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/profiles`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });
  const profiles = await res.json();
  console.log('Profiles:', JSON.stringify(profiles, null, 2));

  const profileList = profiles.profiles || profiles;
  for (const p of profileList) {
    const profId = p._id || p.id;
    console.log(`\nFetching accounts for profile ${profId} (${p.name})...`);
    const accRes = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/accounts?profileId=${profId}`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const accData = await accRes.json();
    console.log('Accounts data:', JSON.stringify(accData, null, 2));
  }
}

inspectAllAccounts().catch(console.error);
