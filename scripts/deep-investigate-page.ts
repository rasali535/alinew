import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { decryptToken } from '../packages/integrations/src/core/crypto';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '1759273775121373';
const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
const appToken = `${appId}|${appSecret}`;

async function deepInvestigate() {
  console.log('================================================================');
  console.log('DEEP INVESTIGATION: WHY RAS ALI LABS (477334159265235) IS OMITTED FROM /me/accounts');
  console.log('================================================================\n');

  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);

  // 1. Check all versions of Graph API for /me/accounts
  console.log('--- 1. TESTING DIFFERENT GRAPH API VERSIONS FOR /me/accounts ---');
  const versions = ['v18.0', 'v19.0', 'v20.0', 'v21.0', 'v22.0'];
  for (const v of versions) {
    try {
      const res = await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=id,name,category,tasks,is_published,link,username,access_token&limit=100&access_token=${userToken}`);
      const json = await res.json();
      const ids = (json.data || []).map((p: any) => `${p.id} (${p.name})`);
      console.log(`Version ${v} returned ${json.data?.length || 0} pages:`, ids);
    } catch (e: any) {
      console.log(`Version ${v} error:`, e.message);
    }
  }

  // 2. Inspect Batch Request to Meta Graph API
  console.log('\n--- 2. BATCH REQUEST FOR RAS ALI LABS VS BLUE NOVA VS THE HUNGWES ---');
  const batchBody = [
    { method: 'GET', relative_url: '477334159265235?fields=id,name,is_published,category,tasks,roles,access_token' },
    { method: 'GET', relative_url: '146236965231227?fields=id,name,is_published,category,tasks,roles,access_token' },
    { method: 'GET', relative_url: '2108630529358940?fields=id,name,is_published,category,tasks,roles,access_token' },
    { method: 'GET', relative_url: '477334159265235/roles' },
    { method: 'GET', relative_url: '146236965231227/roles' },
    { method: 'GET', relative_url: 'me/accounts?fields=id,name,tasks,global_brand_page_name,is_business_page_active' },
    { method: 'GET', relative_url: 'debug_token?input_token=' + userToken }
  ];

  try {
    const batchRes = await fetch(`https://graph.facebook.com/v19.0/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: userToken,
        batch: batchBody
      })
    });
    const batchJson = await batchRes.json();
    console.log('Batch results:');
    batchJson.forEach((item: any, idx: number) => {
      console.log(`\nBatch Item #${idx + 1} (${batchBody[idx].relative_url}):`);
      console.log(`  Code: ${item.code}`);
      console.log(`  Body: ${item.body}`);
    });
  } catch (e: any) {
    console.log('Batch request error:', e.message);
  }

  // 3. Inspect App Debug Token metadata
  console.log('\n--- 3. DETAILED APP & TOKEN INSPECTION ---');
  try {
    const appDebug = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${appToken}`);
    const appDebugJson = await appDebug.json();
    console.log('Full debug_token data:', JSON.stringify(appDebugJson.data, null, 2));
  } catch (e: any) {
    console.log('App debug error:', e.message);
  }
}

deepInvestigate().catch(console.error);
