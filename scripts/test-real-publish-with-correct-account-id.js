require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testLiveFacebookPublish() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const realAccountId = '6a82df7277555aae018b92b4';
  const pageId = '477334159265235';

  console.log('Testing live post with real Zernio account ID:', realAccountId);

  const payload = {
    content: '🚀 Empowering enterprise innovation across Southern Africa with Ralion OS and Ras Ali Labs! 🌍✨ #RasAliLabs #RalionOS #EnterpriseAI #BotswanaTech',
    platforms: [
      {
        platform: 'facebook',
        accountId: realAccountId,
        platformSpecificData: {
          pageId: pageId,
        },
      },
    ],
    publishNow: true,
  };

  const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log('Response Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Publish Response Data:', JSON.stringify(data, null, 2));
}

testLiveFacebookPublish().catch(console.error);
