require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function inspectBridgeApiKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Querying GET /accounts...');
  const res1 = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/accounts`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
  });
  console.log('Status /accounts:', res1.status);
  const data1 = await res1.json();
  console.log('Data /accounts:', JSON.stringify(data1, null, 2));

  console.log('\nQuerying GET /accounts/6a82e16d4c62c3327d530062...');
  const res2 = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/accounts/6a82e16d4c62c3327d530062`, {
    headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
  });
  console.log('Status /accounts/:id:', res2.status);
  const data2 = await res2.json();
  console.log('Data /accounts/:id:', JSON.stringify(data2, null, 2));
}

inspectBridgeApiKey().catch(console.error);
