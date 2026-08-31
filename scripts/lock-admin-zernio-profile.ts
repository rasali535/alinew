import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function lockAdminZernioProfile() {
  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'; // ali@rasalilabs.com
  const masterProfileId = '6a82deac1a69158ef81cb2cd';
  const masterAccountId = '6a82df7277555aae018b92b4';

  console.log(`Locking Zernio Profile ${masterProfileId} as permanent PLATFORM_ADMIN...`);

  // 1. Update or upsert in social_provider_profiles
  const { data: profData, error: profErr } = await supabase
    .from('social_provider_profiles')
    .upsert({
      id: '81c6ee67-dda0-43d6-82aa-b4805e986b32',
      provider: 'zernio',
      provider_profile_id: masterProfileId,
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      profile_name: 'Ras Ali Labs (Master Platform Admin)',
      status: 'ACTIVE',
      metadata: {
        isPlatformAdmin: true,
        role: 'PLATFORM_ADMIN',
        adminEmail: 'ali@rasalilabs.com',
        organizationId: 'ras-ali-labs',
        locked: true,
        protected: true,
        description: 'Permanent Platform Admin master Zernio profile for Ras Ali Labs'
      }
    }, { onConflict: 'id' })
    .select('*');

  if (profErr) {
    console.error('Error updating social_provider_profiles:', profErr);
  } else {
    console.log('✅ social_provider_profiles successfully locked to Admin:', JSON.stringify(profData, null, 2));
  }

  // 2. Update in social_connections
  const { data: connData, error: connErr } = await supabase
    .from('social_connections')
    .update({
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      zernio_profile_id: masterProfileId,
      zernio_account_id: masterAccountId,
      connection_status: 'CONNECTED',
      token_status: 'TOKEN_VALID',
      metadata: {
        pageId: '477334159265235',
        pageName: 'Ras Ali Labs',
        pageUsername: 'rasalibass',
        platform: 'facebook',
        connectedBy: 'ali@rasalilabs.com',
        zernioAccountId: masterAccountId,
        zernioProfileId: masterProfileId,
        isPlatformAdmin: true,
        capabilities: {
          canPublish: true,
          canSchedule: true,
          canUploadImage: true,
          canUploadVideo: true,
          canReadAnalytics: true
        }
      }
    })
    .eq('provider', 'facebook')
    .select('*');

  if (connErr) {
    console.error('Error updating social_connections:', connErr);
  } else {
    console.log('✅ social_connections successfully linked with locked Zernio profile:', JSON.stringify(connData, null, 2));
  }
}

lockAdminZernioProfile().catch(console.error);
