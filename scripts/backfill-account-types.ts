import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function backfill() {
  console.log('Backfilling social_connections account_type values...');

  // Account A: Ras Ali Labs Facebook Page
  const { data: connA } = await supabase.from('social_connections').select('metadata').eq('id', 'f8656d3c-789b-4890-bc80-83920ce91870').single();
  const { error: errA } = await supabase
    .from('social_connections')
    .update({ 
      account_type: 'BUSINESS',
      metadata: { ...(connA?.metadata || {}), provider_account_type: 'FACEBOOK_PAGE', is_page: true } 
    })
    .eq('id', 'f8656d3c-789b-4890-bc80-83920ce91870');

  if (errA) console.error('Error updating Account A:', errA);
  else console.log('Account A updated to BUSINESS / FACEBOOK_PAGE');

  // Account B: Kutlwano B Pule Personal Profile
  const { data: connB } = await supabase.from('social_connections').select('metadata').eq('id', '9196984f-a119-42ec-b23d-588e623a4415').single();
  const { error: errB } = await supabase
    .from('social_connections')
    .update({ 
      account_type: 'PERSONAL',
      metadata: { ...(connB?.metadata || {}), provider_account_type: 'FACEBOOK_PERSONAL_PROFILE', is_page: false } 
    })
    .eq('id', '9196984f-a119-42ec-b23d-588e623a4415');

  if (errB) console.error('Error updating Account B:', errB);
  else console.log('Account B updated to PERSONAL / FACEBOOK_PERSONAL_PROFILE');

  // Check rows
  const { data } = await supabase
    .from('social_connections')
    .select('id, account_name, provider, account_type')
    .in('id', ['f8656d3c-789b-4890-bc80-83920ce91870', '9196984f-a119-42ec-b23d-588e623a4415']);

  console.log('Verified database records:', data);
}

backfill();
