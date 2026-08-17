require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function seedVerifiedConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const connectionRecord = {
    provider: 'facebook',
    provider_account_id: '6a82df7277555aae018b92b4',
    connection_status: 'CONNECTED',
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
  };

  const { data, error } = await supabase
    .from('social_connections')
    .insert([connectionRecord])
    .select('*');

  console.log('Insert result:', JSON.stringify(data, null, 2));
  if (error) console.error('Insert error:', error);
}

seedVerifiedConnection().catch(console.error);
