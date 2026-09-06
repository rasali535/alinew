import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const targetIds = [
  "2108630529358940",
  "1049865031552981",
  "889576367815545",
  "870117949745759",
  "567036327071607",
  "477334159265235",
  "456354840896186",
  "146236965231227",
  "138711619641043",
  "112051940596266",
  "110176117197495",
  "108781034077067",
  "100127903032713"
];

const foundInAccounts = [
  "1049865031552981",
  "146236965231227",
  "100127903032713",
  "112051940596266",
  "108781034077067",
  "2108630529358940",
  "870117949745759"
];

const missingIds = targetIds.filter(id => !foundInAccounts.includes(id));

async function inspectMissing() {
  const { data: row } = await supabase.from('social_account_tokens').select('*').eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466').single();
  const token = decryptToken(row.encrypted_access_token);

  console.log(`Inspecting ${missingIds.length} missing target IDs...`, missingIds);

  for (const id of missingIds) {
    console.log(`\n--------------------------------------------`);
    console.log(`Inspecting ID: ${id}`);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${id}?fields=id,name,category,tasks,is_published,link,roles,access_token&access_token=${encodeURIComponent(token)}`);
      const json = await res.json();
      console.log('Result:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.error('Error fetching ID:', id, e);
    }
  }

  // Also inspect Businesses/Business Manager accounts
  console.log(`\n============================================`);
  console.log(`Inspecting /me/businesses ...`);
  try {
    const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?access_token=${encodeURIComponent(token)}`);
    const bizJson = await bizRes.json();
    console.log('Businesses:', JSON.stringify(bizJson, null, 2));
  } catch (e) {
    console.error('Error fetching businesses:', e);
  }
}

inspectMissing().catch(console.error);
