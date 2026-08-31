import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function updateMasterBindings() {
  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  // Update social connections
  const { error: scErr } = await supabase
    .from('social_connections')
    .update({
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('account_name', 'Ras Ali Labs');

  if (scErr) console.error('social_connections update error:', scErr.message);
  else console.log('✅ Updated master social_connections to platform admin.');

  // Update social provider profiles
  const { error: spErr } = await supabase
    .from('social_provider_profiles')
    .update({
      user_id: adminUserId,
      organization_id: adminUserId,
      workspace_id: adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_profile_id', '6a82deac1a69158ef81cb2cd');

  if (spErr) console.error('social_provider_profiles update error:', spErr.message);
  else console.log('✅ Updated master social_provider_profiles to platform admin.');
}

updateMasterBindings().catch(console.error);
