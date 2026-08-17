require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function probeZernio() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const endpoints = [
    'user',
    'me',
    'posts',
    'accounts',
    'profiles',
  ];

  for (const ep of endpoints) {
    console.log(`\n--- Probing /${ep} ---`);
    const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/${ep}`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      }
    });
    console.log(`Status /${ep}:`, res.status, res.statusText);
    const text = await res.text();
    console.log(`Body /${ep}:`, text.length > 500 ? text.substring(0, 500) + '...' : text);
  }
}

probeZernio().catch(console.error);
