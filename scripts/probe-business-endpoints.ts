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

async function runBusinessProbe() {
  console.log('================================================================');
  console.log('PROBING BUSINESS PORTFOLIO, PRIMARY BUSINESS PAGE, AND APP OWNER');
  console.log('================================================================\n');

  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);

  // 1. Inspect App's owning Business Portfolio via App Token
  console.log('--- 1. APP 1759273775121373 OWNING BUSINESS ---');
  try {
    const appRes = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=id,name,link,category,business,owner_business&access_token=${appToken}`);
    const appJson = await appRes.json();
    console.log('App Metadata:', JSON.stringify(appJson, null, 2));

    if (appJson.business || appJson.owner_business) {
      const businessId = (appJson.business || appJson.owner_business)?.id;
      console.log(`\nFound Owning Business Portfolio ID: ${businessId}`);

      // Try querying business node with App Token
      console.log(`Querying /${businessId} with App Token...`);
      const bizRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}?fields=id,name,primary_page,owned_pages{id,name},client_pages{id,name}&access_token=${appToken}`);
      console.log('Business Details (App Token):', JSON.stringify(await bizRes.json(), null, 2));

      // Try querying business node with User Token
      console.log(`Querying /${businessId} with User Token...`);
      const bizUserRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}?fields=id,name,primary_page,owned_pages{id,name},client_pages{id,name}&access_token=${userToken}`);
      console.log('Business Details (User Token):', JSON.stringify(await bizUserRes.json(), null, 2));

      // Try querying /{businessId}/owned_pages
      console.log(`Querying /${businessId}/owned_pages with App Token...`);
      const ownedRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/owned_pages?access_token=${appToken}`);
      console.log('Owned Pages (App Token):', JSON.stringify(await ownedRes.json(), null, 2));

      console.log(`Querying /${businessId}/owned_pages with User Token...`);
      const ownedUserRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/owned_pages?access_token=${userToken}`);
      console.log('Owned Pages (User Token):', JSON.stringify(await ownedUserRes.json(), null, 2));

      // Try querying /{businessId}/client_pages
      console.log(`Querying /${businessId}/client_pages with App Token...`);
      const clientRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/client_pages?access_token=${appToken}`);
      console.log('Client Pages (App Token):', JSON.stringify(await clientRes.json(), null, 2));

      console.log(`Querying /${businessId}/client_pages with User Token...`);
      const clientUserRes = await fetch(`https://graph.facebook.com/v19.0/${businessId}/client_pages?access_token=${userToken}`);
      console.log('Client Pages (User Token):', JSON.stringify(await clientUserRes.json(), null, 2));
    }
  } catch (e: any) {
    console.error('App/Business error:', e.message);
  }

  // 2. Query /me/businesses with User Token
  console.log('\n--- 2. /me/businesses WITH USER TOKEN ---');
  try {
    const meBiz = await fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=id,name,primary_page,owned_pages&access_token=${userToken}`);
    console.log('/me/businesses:', JSON.stringify(await meBiz.json(), null, 2));
  } catch (e: any) {
    console.error('/me/businesses error:', e.message);
  }

  // 3. Inspect working page (Blue Nova 146236965231227) vs Ras Ali Labs (477334159265235)
  console.log('\n--- 3. DETAILED COMPARISON OF PAGE NODES & SYSTEM ROLES ---');
  const workingPageId = '146236965231227';
  const rasAliPageId = '477334159265235';

  // Check if we can query /477334159265235 with any app secret proof or specific graph params
  const crypto = await import('crypto');
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
  console.log('Testing User Token with appsecret_proof...');

  const proofRes = await fetch(`https://graph.facebook.com/v19.0/${rasAliPageId}?fields=id,name,business&appsecret_proof=${appSecretProof}&access_token=${userToken}`);
  console.log('Ras Ali with proof result:', JSON.stringify(await proofRes.json(), null, 2));
}

runBusinessProbe().catch(console.error);
