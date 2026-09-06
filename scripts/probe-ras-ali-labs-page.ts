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

async function probe() {
  console.log('================================================================');
  console.log('PROBING RAS ALI LABS PAGE (ID: 477334159265235)');
  console.log('================================================================\n');

  // Fetch admin token
  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);
  console.log('User Token starts with:', userToken.substring(0, 15) + '...');
  console.log('App Token starts with:', appToken.substring(0, 15) + '...\n');

  // 1. Debug token inspection
  console.log('--- 1. DEBUG TOKEN GRANULAR SCOPES ---');
  const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${appToken}`);
  const debugJson = await debugRes.json();
  const granular = debugJson.data?.granular_scopes || [];
  console.log('Granular scopes:', JSON.stringify(granular, null, 2));

  const pageTargetIds: string[] = granular.find((g: any) => g.scope === 'pages_show_list')?.target_ids || [];
  console.log('Does 477334159265235 appear in pages_show_list target_ids?', pageTargetIds.includes('477334159265235'));

  // 2. Query /me/accounts pagination and detailed fields
  console.log('\n--- 2. DETAILED /me/accounts QUERY ---');
  const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,is_published,link,username,verification_status,access_token&limit=100&access_token=${userToken}`);
  const accountsJson = await accountsRes.json();
  console.log(`/me/accounts returned ${accountsJson.data?.length || 0} pages:`);
  if (accountsJson.data) {
    for (const p of accountsJson.data) {
      console.log(`- Page [${p.id}]: "${p.name}" (username: ${p.username || 'none'}, published: ${p.is_published}, tasks: [${p.tasks?.join(', ')}])`);
    }
  }

  // 3. Inspect every target_id from granular_scopes directly
  console.log('\n--- 3. DIRECT QUERY OF ALL TARGET IDs IN GRANULAR SCOPES ---');
  for (const tid of pageTargetIds) {
    console.log(`\nTesting Target ID: ${tid}`);
    // Try with user token
    const uRes = await fetch(`https://graph.facebook.com/v19.0/${tid}?fields=id,name,username,tasks,roles,is_published,link,category&access_token=${userToken}`);
    const uJson = await uRes.json();
    console.log(`  User Token:`, JSON.stringify(uJson));

    // Try with app token
    const aRes = await fetch(`https://graph.facebook.com/v19.0/${tid}?fields=id,name,username,is_published,link,category&access_token=${appToken}`);
    const aJson = await aRes.json();
    console.log(`  App Token:`, JSON.stringify(aJson));
  }

  // 4. Specifically probe 477334159265235 with various fields/endpoints
  console.log('\n--- 4. DEEP PROBE OF 477334159265235 ---');
  const endpoints = [
    `https://graph.facebook.com/v19.0/477334159265235?access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235?fields=id,name&access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235/roles?access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235/assigned_users?access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235/page_backed_instagram_accounts?access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235/locations?access_token=${userToken}`,
    `https://graph.facebook.com/v19.0/477334159265235?fields=business,owner&access_token=${userToken}`,
  ];

  for (const ep of endpoints) {
    console.log(`Querying: ${ep.replace(userToken, 'USER_TOKEN').replace(appToken, 'APP_TOKEN')}`);
    try {
      const res = await fetch(ep);
      const json = await res.json();
      console.log('Response:', JSON.stringify(json, null, 2));
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }

  // 5. Test searching / scraping / inspecting public info
  console.log('\n--- 5. CHECK PUBLIC INFO FOR RAS ALI LABS ---');
  try {
    const pubRes = await fetch(`https://graph.facebook.com/v19.0/rasalibass?fields=id,name&access_token=${appToken}`);
    const pubJson = await pubRes.json();
    console.log('rasalibass query:', JSON.stringify(pubJson, null, 2));
  } catch (e: any) {
    console.log('rasalibass error:', e.message);
  }
}

probe().catch(console.error);
