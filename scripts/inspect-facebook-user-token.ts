import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

import { decryptToken } from '../packages/integrations/src/core/crypto';

async function main() {
  console.log('--- FETCHING STORED FACEBOOK TOKENS & CONNECTIONS ---');

  const { data: allConns, error: connErr } = await supabase
    .from('social_connections')
    .select('*');
  
  if (connErr) console.error('connErr:', connErr);

  const { data: allTokens, error: tokenErr } = await supabase
    .from('social_account_tokens')
    .select('*');
  
  if (tokenErr) console.error('tokenErr:', tokenErr);

  console.log(`Found ${allConns?.length || 0} total social_connections, ${allTokens?.length || 0} total social_account_tokens`);

  if (allTokens) {
    for (const t of allTokens) {
      console.log('social_account_token:', JSON.stringify(t, null, 2));
    }
  }

  const tokenList: Array<{ source: string; token: string; userId?: string; workspaceId?: string; tenantId?: string; record: any }> = [];

  if (allConns) {
    for (const c of allConns) {
      console.log(`\nChecking connection ${c.id}: provider=${c.provider}, status=${c.connection_status}, user=${c.user_id}, ws=${c.workspace_id}`);
      
      const candidates = [
        c.access_token_encrypted,
        c.access_token,
        c.auth_payload?.access_token,
        c.metadata?.access_token,
        c.metadata?.encrypted_access_token,
        c.metadata?.user_access_token,
        c.metadata?.page_access_token,
      ];

      for (const cand of candidates) {
        if (!cand || typeof cand !== 'string') continue;
        let dec = cand;
        if (cand.startsWith('enc_')) {
          dec = decryptToken(cand);
        }
        if (dec && dec.startsWith('EA')) {
          tokenList.push({
            source: `social_connections (${c.id}) [status=${c.connection_status}, provider=${c.provider}]`,
            token: dec,
            userId: c.user_id,
            workspaceId: c.workspace_id,
            tenantId: c.tenant_id,
            record: c
          });
        }
      }
    }
  }

  if (allTokens) {
    for (const t of allTokens) {
      const candidates = [
        t.encrypted_access_token,
        t.access_token_encrypted,
        t.access_token,
      ];
      for (const cand of candidates) {
        if (!cand || typeof cand !== 'string') continue;
        let dec = cand;
        if (cand.startsWith('enc_')) {
          dec = decryptToken(cand);
        }
        if (dec && dec.startsWith('EA')) {
          tokenList.push({
            source: `social_account_tokens (${t.id}) [provider=${t.provider}, label=${t.account_label}]`,
            token: dec,
            userId: t.user_id,
            record: t
          });
        }
      }
    }
  }

  console.log(`Total live EA... tokens found: ${tokenList.length}`);

  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '1759273775121373';
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';

  console.log(`Using App ID: ${appId}`);

  // Unique tokens
  const seen = new Set<string>();
  const uniqueTokens = tokenList.filter(t => {
    if (seen.has(t.token)) return false;
    seen.add(t.token);
    return true;
  });

  console.log(`Unique tokens to inspect: ${uniqueTokens.length}`);

  for (let i = 0; i < uniqueTokens.length; i++) {
    const item = uniqueTokens[i];
    console.log(`\n==================================================`);
    console.log(`INSPECTING TOKEN #${i + 1} from ${item.source}`);
    console.log(`Associated User ID: ${item.userId}`);
    console.log(`Associated Workspace ID: ${item.workspaceId}`);
    console.log(`Associated Tenant ID: ${item.tenantId}`);
    console.log(`Token prefix: ${item.token.substring(0, 12)}... (length: ${item.token.length})`);

    // 1. Debug Token
    console.log('\n--- 1. /debug_token ---');
    try {
      let debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${item.token}&access_token=${item.token}`;
      if (appId && appSecret) {
        debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${item.token}&access_token=${appId}|${appSecret}`;
      }
      const debugRes = await fetch(debugUrl);
      const debugJson = await debugRes.json();
      console.log('debug_token response:', JSON.stringify(debugJson, null, 2));

      if (debugJson.data) {
        const d = debugJson.data;
        console.log(`Token app_id: ${d.app_id}`);
        console.log(`Token application: ${d.application}`);
        console.log(`Token is_valid: ${d.is_valid}`);
        console.log(`Token user_id: ${d.user_id}`);
        console.log(`Token expires_at: ${d.expires_at} (${d.expires_at === 0 ? 'Never / Long-lived' : new Date(d.expires_at * 1000).toISOString()})`);
        console.log(`Token scopes/permissions: ${JSON.stringify(d.scopes)}`);
      }
    } catch (err) {
      console.error('debug_token error:', err);
    }

    // 2. /me
    console.log('\n--- 2. /me ---');
    try {
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${item.token}`);
      const meJson = await meRes.json();
      console.log('/me response:', JSON.stringify(meJson, null, 2));
    } catch (err) {
      console.error('/me error:', err);
    }

    // 3. /me/permissions
    console.log('\n--- 3. /me/permissions ---');
    let hasPagesShowList = false;
    let hasPagesManagePosts = false;
    try {
      const permRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${item.token}`);
      const permJson = await permRes.json();
      console.log('/me/permissions response:', JSON.stringify(permJson, null, 2));

      if (permJson.data && Array.isArray(permJson.data)) {
        const granted = permJson.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
        hasPagesShowList = granted.includes('pages_show_list');
        hasPagesManagePosts = granted.includes('pages_manage_posts');
        console.log(`Granted permissions: ${granted.join(', ')}`);
        console.log(`whether pages_show_list is granted: ${hasPagesShowList}`);
        console.log(`whether pages_manage_posts is granted: ${hasPagesManagePosts}`);
      } else if (permJson.error) {
        console.error('Permissions Error:', permJson.error);
      }
    } catch (err) {
      console.error('/me/permissions error:', err);
    }

    // 4. /me/accounts?fields=id,name,tasks
    console.log('\n--- 4. /me/accounts?fields=id,name,tasks ---');
    try {
      const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,tasks&access_token=${item.token}`);
      const accJson = await accRes.json();
      console.log('/me/accounts response:', JSON.stringify(accJson, null, 2));

      if (accJson.data) {
        console.log(`Number of Pages returned: ${accJson.data.length}`);
        if (accJson.data.length === 0) {
          if (!hasPagesShowList) {
            console.log('CLASSIFICATION: REAUTH_REQUIRED (pages_show_list is missing)');
          } else {
            console.log('CLASSIFICATION: NO_MANAGEABLE_PAGES_VISIBLE (pages_show_list is granted but Facebook user has no manageable Pages visible to this app)');
          }
        } else {
          console.log('Manageable Pages list:', accJson.data.map((p: any) => `${p.name} (id: ${p.id}, tasks: [${p.tasks?.join(', ')}])`));
        }
      } else if (accJson.error) {
        console.log('EXACT GRAPH ERROR on /me/accounts:', JSON.stringify(accJson.error, null, 2));
      }
    } catch (err) {
      console.error('/me/accounts error:', err);
    }
  }

  // Also check if there are users with social_connections where provider='facebook' and connection_status='CONNECTED' or others
  console.log('\n==================================================');
  console.log('ALL DB FACEBOOK RECORDS SUMMARY:');
  if (allConns) {
    for (const c of allConns) {
      console.log(`ID: ${c.id}, Tenant: ${c.tenant_id}, Workspace: ${c.workspace_id}, User: ${c.user_id}, Status: ${c.connection_status}, Page ID: ${c.selected_page_id}, Page Name: ${c.selected_page_name}`);
    }
  }
}

main().catch(console.error);
