import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { createClient } from '@supabase/supabase-js';

async function checkDbRows() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: conns } = await supabase.from('social_connections').select('*').eq('provider', 'facebook');
  console.log('social_connections:', JSON.stringify(conns, null, 2));

  const { data: metaConns } = await supabase.from('meta_connections').select('*');
  console.log('meta_connections:', JSON.stringify(metaConns, null, 2));

  const { data: sat } = await supabase.from('social_account_tokens').select('*').eq('provider', 'facebook');
  console.log('social_account_tokens:', JSON.stringify(sat, null, 2));
}

checkDbRows().catch(console.error);
