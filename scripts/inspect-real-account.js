require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function inspectAccount() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/accounts`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    }
  });

  const data = await res.json();
  console.log('Account Details:', JSON.stringify(data, null, 2));
}

inspectAccount().catch(console.error);
