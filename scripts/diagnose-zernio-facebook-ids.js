require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { ZernioSocialService } = require('../packages/integrations/src/social/services/ZernioSocialService');

async function checkIds() {
  console.log('=== CHECKING SOCIAL CONNECTIONS IN SUPABASE ===');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const { data: conns, error } = await supabase
    .from('social_connections')
    .select('*');

  if (error) {
    console.error('Supabase query error:', error);
  } else {
    console.log('Found social_connections:', JSON.stringify(conns, null, 2));
  }

  console.log('\n=== QUERYING ZERNIO DIRECTLY ===');
  try {
    const profiles = await ZernioSocialService.listProfiles();
    console.log('Zernio profiles:', JSON.stringify(profiles, null, 2));

    for (const p of profiles) {
      console.log(`\nQuerying accounts for profile ${p.id} (${p.name})...`);
      const accounts = await ZernioSocialService.getAccounts(p.id);
      console.log('Accounts:', JSON.stringify(accounts, null, 2));
    }
  } catch (err) {
    console.error('Zernio query error:', err.message);
  }
}

checkIds().catch(console.error);
