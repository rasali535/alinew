import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function syncAdminFacebookConnection() {
  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'; // UUID for ali@rasalilabs.com

  console.log('--- Updating social_connections for Admin Facebook ---');
  const { data: updatedConns, error: connErr } = await supabase
    .from('social_connections')
    .update({
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      connection_status: 'CONNECTED',
      token_status: 'TOKEN_VALID',
      account_name: 'Ras Ali Labs',
      account_type: 'BUSINESS',
      followers_count: 108,
      metadata: {
        pageId: '477334159265235',
        pageName: 'Ras Ali Labs',
        pageUsername: 'rasalibass',
        platform: 'facebook',
        capabilities: {
          canPublish: true,
          canSchedule: true,
          canUploadImage: true,
          canUploadVideo: true,
          canReadAnalytics: true,
        },
        zernioAccountId: '6a82df7277555aae018b92b4',
        zernioProfileId: '6a82deac1a69158ef81cb2cd',
        connectedBy: 'ali@rasalilabs.com'
      }
    })
    .eq('provider', 'facebook')
    .select('*');

  if (connErr) {
    console.error('Error updating social_connections:', connErr);
  } else {
    console.log('Successfully synchronized Facebook connection to Admin:', JSON.stringify(updatedConns, null, 2));
  }

  console.log('\n--- Updating social_provider_profiles for Admin Zernio ---');
  const { data: updatedProfs, error: profErr } = await supabase
    .from('social_provider_profiles')
    .update({
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      status: 'ACTIVE',
      profile_name: 'Ras Ali Labs (Master)',
    })
    .eq('provider', 'zernio')
    .select('*');

  if (profErr) {
    console.error('Error updating social_provider_profiles:', profErr);
  } else {
    console.log('Successfully synchronized Zernio provider profile to Admin:', JSON.stringify(updatedProfs, null, 2));
  }
}

syncAdminFacebookConnection().catch(console.error);
