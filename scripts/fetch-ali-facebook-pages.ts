import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: row } = await supabase.from('social_account_tokens').select('*').eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466').single();
  if (!row) {
    console.error('Row not found');
    return;
  }
  const token = decryptToken(row.encrypted_access_token);
  
  console.log('Querying Meta Graph API for Ali Chiwartze Hungwe...');
  const res = await fetch('https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,is_published,followers_count,fan_count,link,about,verification_status&access_token=' + encodeURIComponent(token));
  const json = await res.json();
  console.log('Total Pages Found:', json.data ? json.data.length : 0);
  console.log(JSON.stringify(json, null, 2));

  // Also query granular scopes to see target_ids
  const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${token}`);
  const debugJson = await debugRes.json();
  console.log('\n--- Granular Scopes & Target Page IDs ---');
  console.log(JSON.stringify(debugJson.data?.granular_scopes, null, 2));
}

run().catch(console.error);
