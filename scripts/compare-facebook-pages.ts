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

async function comparePages() {
  console.log('================================================================');
  console.log('COMPARISON: Ras Ali Labs vs Pameltex / Blue Nova');
  console.log('================================================================\n');

  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);

  // 1. Fetch /me/accounts with access tokens
  console.log('--- 1. FETCH /me/accounts ---');
  const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,is_published,link,username,access_token&limit=100&access_token=${userToken}`);
  const accJson = await accRes.json();
  console.log('Returned accounts count:', accJson.data?.length);

  const returnedPagesMap = new Map<string, any>();
  if (accJson.data) {
    for (const p of accJson.data) {
      returnedPagesMap.set(p.id, p);
      console.log(`\nPage: ${p.name} (ID: ${p.id})`);
      console.log(`  - Has Page Token: ${!!p.access_token} (Token starts with: ${p.access_token?.substring(0, 15)}...)`);
      console.log(`  - Tasks: ${JSON.stringify(p.tasks)}`);
      console.log(`  - Published: ${p.is_published}`);
      console.log(`  - Category: ${p.category}`);
      console.log(`  - Username: ${p.username || 'none'}`);
    }
  }

  const blueNova = returnedPagesMap.get('146236965231227');
  const pameltex = returnedPagesMap.get('100127903032713');
  const rasAliPageId = '477334159265235';

  console.log('\n================================================================');
  console.log('--- 2. DEEP INSPECTION OF BLUE NOVA WITH PAGE ACCESS TOKEN ---');
  console.log('================================================================');

  if (blueNova?.access_token) {
    // 2.1 Direct Page query with Page Token
    const bnRes = await fetch(`https://graph.facebook.com/v19.0/${blueNova.id}?fields=id,name,username,link,is_published,category,tasks,connected_instagram_account,can_post&access_token=${blueNova.access_token}`);
    console.log('Blue Nova Details (Page Token):', JSON.stringify(await bnRes.json(), null, 2));

    // 2.2 Debug Blue Nova Page Token
    const debugBn = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${blueNova.access_token}&access_token=${appToken}`);
    const debugBnJson = await debugBn.json();
    console.log('Blue Nova Page Token Debug:', JSON.stringify(debugBnJson, null, 2));

    // 2.3 Check connected apps / subscribed apps
    const subRes = await fetch(`https://graph.facebook.com/v19.0/${blueNova.id}/subscribed_apps?access_token=${blueNova.access_token}`);
    console.log('Blue Nova Subscribed Apps:', JSON.stringify(await subRes.json(), null, 2));
  }

  console.log('\n================================================================');
  console.log('--- 3. DEEP INSPECTION OF PAMELTEX WITH PAGE ACCESS TOKEN ---');
  console.log('================================================================');

  if (pameltex?.access_token) {
    const pamRes = await fetch(`https://graph.facebook.com/v19.0/${pameltex.id}?fields=id,name,username,link,is_published,category,tasks,connected_instagram_account,can_post&access_token=${pameltex.access_token}`);
    console.log('Pameltex Details (Page Token):', JSON.stringify(await pamRes.json(), null, 2));

    const debugPam = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${pameltex.access_token}&access_token=${appToken}`);
    console.log('Pameltex Page Token Debug:', JSON.stringify(await debugPam.json(), null, 2));
  }

  console.log('\n================================================================');
  console.log('--- 4. PROBING RAS ALI LABS (477334159265235) ---');
  console.log('================================================================');

  // Can we obtain Page Access Token directly with user token?
  console.log('1. Querying /477334159265235?fields=access_token with User Token:');
  const rasTokenQuery = await fetch(`https://graph.facebook.com/v19.0/${rasAliPageId}?fields=access_token&access_token=${userToken}`);
  console.log('Result:', JSON.stringify(await rasTokenQuery.json(), null, 2));

  // Try querying with app token
  console.log('\n2. Querying /477334159265235 with App Token:');
  const rasAppQuery = await fetch(`https://graph.facebook.com/v19.0/${rasAliPageId}?fields=id,name,is_published&access_token=${appToken}`);
  console.log('Result:', JSON.stringify(await rasAppQuery.json(), null, 2));

  // Try querying /477334159265235 with Blue Nova Page Token (cross-page permission test)
  if (blueNova?.access_token) {
    console.log('\n3. Querying /477334159265235 with Blue Nova Page Token:');
    const rasCrossQuery = await fetch(`https://graph.facebook.com/v19.0/${rasAliPageId}?fields=id,name,is_published&access_token=${blueNova.access_token}`);
    console.log('Result:', JSON.stringify(await rasCrossQuery.json(), null, 2));
  }
}

comparePages().catch(console.error);
