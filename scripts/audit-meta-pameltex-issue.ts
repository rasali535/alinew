import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const appId = '1759273775121373';
const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '44402f5d49f3be40102e2f11039499fe';
const appToken = `${appId}|${appSecret}`;

async function main() {
  console.log('================================================================================');
  console.log('META PRODUCTION APP DEEP AUDIT');
  console.log('================================================================================\n');

  // 1. Roles on App 1759273775121373
  console.log('--- 1. APP ROLES (/roles) ---');
  const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/roles?access_token=${appToken}`);
  const roles = await rolesRes.json();
  console.log(JSON.stringify(roles, null, 2));

  // 2. App Permissions (/permissions)
  console.log('\n--- 2. APP PERMISSIONS (/permissions) ---');
  const permsRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/permissions?access_token=${appToken}`);
  const perms = await permsRes.json();
  console.log(JSON.stringify(perms, null, 2));

  // 3. User Token debug_token
  console.log('\n--- 3. USER TOKEN DEBUG_TOKEN ---');
  const { data: row } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('id', '71cec509-862e-4f8a-b98f-2ccf4f587466')
    .single();

  const userToken = decryptToken(row.encrypted_access_token);
  const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${appToken}`);
  const debugData = await debugRes.json();
  console.log(JSON.stringify(debugData, null, 2));

  // 4. Test User /me/permissions
  console.log('\n--- 4. USER /me/permissions ---');
  const userPermsRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${userToken}`);
  const userPerms = await userPermsRes.json();
  console.log(JSON.stringify(userPerms, null, 2));

  // 5. Test App Access Token debug_token
  console.log('\n--- 5. APP ACCESS TOKEN DEBUG ---');
  const appDebugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${appToken}&access_token=${appToken}`);
  const appDebug = await appDebugRes.json();
  console.log(JSON.stringify(appDebug, null, 2));
}

main().catch(console.error);
