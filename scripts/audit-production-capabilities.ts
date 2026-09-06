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

async function runProductionCapabilityAudit() {
  console.log('================================================================================');
  console.log(`RALION GROWTH (APP ID: ${appId}) — PRODUCTION CAPABILITY & PERMISSION AUDIT`);
  console.log('================================================================================\n');

  // Fetch admin token
  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);

  // 1. APP-LEVEL PERMISSIONS & REVIEW STATUS via App Token
  console.log('--- 1. APP-LEVEL PERMISSIONS STATUS ---');
  try {
    const appPermsRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/permissions?access_token=${appToken}`);
    const appPermsJson = await appPermsRes.json();
    console.log('App Permissions (/permissions):', JSON.stringify(appPermsJson, null, 2));
  } catch (e: any) {
    console.log('App Permissions Error:', e.message);
  }

  // 2. /debug_token with App Token
  console.log('\n--- 2. /debug_token INSPECTION ---');
  let debugData: any = null;
  try {
    const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${appToken}`);
    const debugJson = await debugRes.json();
    debugData = debugJson.data;
    console.log('debug_token response:', JSON.stringify(debugJson, null, 2));
  } catch (e: any) {
    console.log('debug_token error:', e.message);
  }

  // 3. /me/permissions with User Token
  console.log('\n--- 3. /me/permissions INSPECTION ---');
  let grantedPermissions: string[] = [];
  try {
    const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${userToken}`);
    const permJson = await permRes.json();
    console.log('/me/permissions response:', JSON.stringify(permJson, null, 2));
    if (permJson.data && Array.isArray(permJson.data)) {
      grantedPermissions = permJson.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
    }
  } catch (e: any) {
    console.log('/me/permissions error:', e.message);
  }

  // 4. Test individual permissions checklist:
  const targetPermissions = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'business_management',
    'email',
    'public_profile'
  ];

  console.log('\n--- 4. PERMISSIONS STATUS SUMMARY ---');
  for (const p of targetPermissions) {
    const isGranted = grantedPermissions.includes(p);
    console.log(`- Permission [${p}]: ${isGranted ? 'GRANTED (Active in Token)' : 'NOT GRANTED (Standard/Pending Review)'}`);
  }

  // 5. /me/accounts
  console.log('\n--- 5. /me/accounts LIVE TEST ---');
  try {
    const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,is_published,link,username,access_token&limit=100&access_token=${userToken}`);
    const accJson = await accRes.json();
    console.log(`/me/accounts returned ${accJson.data?.length || 0} pages:`);
    if (accJson.data) {
      for (const p of accJson.data) {
        console.log(`  * ${p.name} (id: ${p.id}, tasks: [${p.tasks?.join(', ')}])`);
      }
    }
  } catch (e: any) {
    console.log('/me/accounts error:', e.message);
  }

  // 6. /me/businesses
  console.log('\n--- 6. /me/businesses LIVE TEST ---');
  try {
    const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?fields=id,name,primary_page,owned_pages,client_pages&access_token=${userToken}`);
    const bizJson = await bizRes.json();
    console.log('/me/businesses response:', JSON.stringify(bizJson, null, 2));
  } catch (e: any) {
    console.log('/me/businesses error:', e.message);
  }

  // 7. Ras Ali Labs Page 477334159265235 Direct Probe
  console.log('\n--- 7. RAS ALI LABS PAGE (477334159265235) LIVE TEST ---');
  try {
    const pageRes = await fetch(`https://graph.facebook.com/v19.0/477334159265235?fields=id,name,is_published,category,tasks,access_token&access_token=${userToken}`);
    const pageJson = await pageRes.json();
    console.log('Ras Ali Labs direct node query:', JSON.stringify(pageJson, null, 2));
  } catch (e: any) {
    console.log('Ras Ali Labs error:', e.message);
  }

  // 8. Test other endpoints like /{page-id}/feed (publishing capability check)
  console.log('\n--- 8. PUBLISHING PERMISSION (pages_manage_posts) CHECK ---');
  console.log(`pages_manage_posts is granted: ${grantedPermissions.includes('pages_manage_posts')}`);
  console.log(`pages_read_engagement is granted: ${grantedPermissions.includes('pages_read_engagement')}`);
  console.log(`business_management is granted: ${grantedPermissions.includes('business_management')}`);
}

runProductionCapabilityAudit().catch(console.error);
