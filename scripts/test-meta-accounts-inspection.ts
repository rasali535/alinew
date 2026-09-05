import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

async function testMetaAccounts() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: c } = await supabase.from('social_connections').select('*').eq('id', '9196984f-a119-42ec-b23d-588e623a4415').single();

  const encToken = c?.metadata?.encrypted_access_token;
  if (!encToken) {
    console.log('No encrypted token');
    return;
  }

  const token = decryptToken(encToken);
  console.log('Decrypted token successfully! Length:', token.length);

  // 1. Inspect Permissions (/me/permissions)
  console.log('\n--- 1. Testing GET /me/permissions ---');
  const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(token)}`);
  console.log('Permissions HTTP Status:', permRes.status);
  const permData = await permRes.json();
  console.log('Granted Permissions:', JSON.stringify(permData, null, 2));

  // 2. Inspect Accounts (/me/accounts)
  console.log('\n--- 2. Testing GET /me/accounts ---');
  const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks,picture&access_token=${encodeURIComponent(token)}`);
  console.log('Accounts HTTP Status:', accRes.status);
  const accData = await accRes.json();
  console.log('Managed Pages (/me/accounts):', JSON.stringify(accData, null, 2));

  // 3. Inspect User Profile (/me)
  console.log('\n--- 3. Testing GET /me ---');
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${encodeURIComponent(token)}`);
  console.log('User /me Status:', meRes.status);
  const meData = await meRes.json();
  console.log('User /me Data:', JSON.stringify(meData, null, 2));
}

testMetaAccounts().catch(console.error);
