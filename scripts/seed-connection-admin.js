require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function testAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Service role key present?', !!serviceKey);
  if (!serviceKey) return;

  const supabase = createClient(url, serviceKey);
  const { data: users, error } = await supabase.auth.admin.listUsers();
  console.log('Auth users count:', users?.users?.length, error ? error.message : '');

  if (users?.users?.length > 0) {
    const u = users.users[0];
    console.log('Primary user ID:', u.id, u.email);

    for (const u of users.users) {
      console.log('Seeding for user:', u.id, u.email);
      const { data: conn, error: connErr } = await supabase.from('social_connections').upsert({
        user_id: u.id,
        provider: 'facebook',
        infrastructure_provider: 'zernio',
        connection_status: 'CONNECTED',
        account_name: 'Ras Ali Labs',
        provider_account_id: '6a82df7277555aae018b92b4',
        zernio_account_id: '6a82df7277555aae018b92b4',
        zernio_profile_id: '6a82deac1a69158ef81cb2cd',
        metadata: {
          platform: 'facebook',
          pageId: '477334159265235',
          pageName: 'Ras Ali Labs',
          pageUsername: 'rasalibass',
          zernioAccountId: '6a82df7277555aae018b92b4',
          zernioProfileId: '6a82deac1a69158ef81cb2cd',
          capabilities: {
            canPublish: true,
            canSchedule: true,
            canUploadImage: true,
            canUploadVideo: true,
            canReadAnalytics: true
          }
        }
      }, { onConflict: 'user_id,provider,provider_account_id' }).select('*');

      console.log('Upserted connection:', conn, connErr ? connErr.message : 'SUCCESS');
    }
  }
}

testAdmin().catch(console.error);
