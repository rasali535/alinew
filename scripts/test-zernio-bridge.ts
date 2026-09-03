import * as dotenv from 'dotenv';
dotenv.config();

async function testZernio() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Testing Edge Function zernio-bridge with:');
  console.log('URL:', supabaseUrl);
  console.log('Has Key:', Boolean(supabaseKey));

  const profileId = '6a82deac1a69158ef81cb2cd';
  const endpoint = `posts?profileId=${profileId}&includeExternal=true`;
  const url = `${supabaseUrl}/functions/v1/zernio-bridge/${endpoint}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey!}`,
      },
    });

    console.log('HTTP Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testZernio();
