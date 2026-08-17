require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const { data, error } = await supabase.from('social_connections').select('*');
  console.log('social_connections data:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}

checkDb().catch(console.error);
