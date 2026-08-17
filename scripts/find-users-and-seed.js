require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function findUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const { data: users } = await supabase.from('users').select('id, email').limit(5);
  console.log('Users:', users);

  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(5);
  console.log('Orgs:', orgs);

  if (users && users.length > 0) {
    const userId = users[0].id;
    const orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

    const { data: inserted, error: insErr } = await supabase.from('social_connections').insert([{
      user_id: userId,
      organization_id: orgId,
      provider: 'facebook',
      infrastructure_provider: 'zernio',
      connection_status: 'CONNECTED',
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
    }]).select('*');

    console.log('Inserted social connection:', inserted);
    if (insErr) console.error('Insert error:', insErr);
  }
}

findUsers().catch(console.error);
