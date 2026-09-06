import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

async function runMetaGraphAudit() {
  console.log('=== FACEBOOK GRAPH API LIVE PAGE READ-ONLY AUDIT ===\n');

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Find social connection for Ras Ali Labs / Facebook
  const { data: connections, error: cErr } = await supabase
    .from('social_connections')
    .select('*')
    .eq('provider', 'facebook');

  if (cErr || !connections?.length) {
    console.error('No facebook connections found:', cErr);
    return;
  }

  console.log(`Found ${connections.length} facebook connection(s).`);
  for (const conn of connections) {
    console.log(`\nConnection ID: ${conn.id} | User: ${conn.user_id} | Account: ${conn.account_name} | Provider Account ID: ${conn.provider_account_id}`);
    
    const encToken = conn.metadata?.encrypted_access_token;
    if (!encToken) {
      console.log('  No encrypted_access_token found in metadata');
      continue;
    }

    const token = decryptToken(encToken);
    console.log(`  Decrypted token length: ${token.length}`);

    // 1. /me/permissions
    console.log('\n--- 1. Testing GET /me/permissions ---');
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(token)}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log('Granted/Declined Permissions:', JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.error('Error fetching permissions:', e.message);
    }

    // 2. /me/accounts (to get Page-specific access token)
    console.log('\n--- 2. Testing GET /me/accounts ---');
    let pageToken = token;
    let pageId = conn.provider_account_id || '477334159265235';
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks,picture&access_token=${encodeURIComponent(token)}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log('Accounts data:', JSON.stringify(data, null, 2));
      if (data?.data && Array.isArray(data.data)) {
        const matchingPage = data.data.find((p: any) => p.id === pageId) || data.data[0];
        if (matchingPage?.access_token) {
          pageToken = matchingPage.access_token;
          pageId = matchingPage.id;
          console.log(`Found Page Token for Page "${matchingPage.name}" (ID: ${pageId})!`);
        }
      }
    } catch (e: any) {
      console.error('Error fetching accounts:', e.message);
    }

    // 3. /{pageId}?fields=...
    console.log(`\n--- 3. Testing GET /${pageId}?fields=id,name,username,category,about,description,website,fan_count,followers_count,link,location ---`);
    try {
      const fields = 'id,name,username,category,about,description,website,fan_count,followers_count,link,location';
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=${fields}&access_token=${encodeURIComponent(pageToken)}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log('Page metadata response:', JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.error('Error fetching page metadata:', e.message);
    }

    // 4. /{pageId}/feed
    console.log(`\n--- 4. Testing GET /${pageId}/feed ---`);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed?fields=id,message,created_time,story,permalink_url,shares,reactions.summary(true),comments.summary(true)&access_token=${encodeURIComponent(pageToken)}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log('Page feed response:', JSON.stringify(data, null, 2));
    } catch (e: any) {
      console.error('Error fetching page feed:', e.message);
    }

    // 5. /{pageId}/posts
    console.log(`\n--- 5. Testing GET /${pageId}/posts ---`);
    let postIds: string[] = [];
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,shares,reactions.summary(true),comments.summary(true)&access_token=${encodeURIComponent(pageToken)}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log('Page posts count:', data?.data?.length || 0);
      console.log('Page posts response:', JSON.stringify(data, null, 2));
      if (data?.data && Array.isArray(data.data)) {
        postIds = data.data.map((p: any) => p.id);
      }
    } catch (e: any) {
      console.error('Error fetching page posts:', e.message);
    }

    // 6. /{pageId}/insights
    console.log(`\n--- 6. Testing GET /${pageId}/insights ---`);
    const metricsToTest = [
      'page_impressions,page_impressions_unique,page_engaged_users,page_post_engagements',
      'page_impressions_organic,page_impressions_paid',
      'page_fans,page_fan_adds,page_fan_removes',
      'page_views_total'
    ];

    for (const metricSet of metricsToTest) {
      try {
        console.log(`Testing metrics: ${metricSet}`);
        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metricSet}&period=day&access_token=${encodeURIComponent(pageToken)}`);
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Insights response:', JSON.stringify(data, null, 2));
      } catch (e: any) {
        console.error('Error fetching page insights:', e.message);
      }
    }

    // 7. Post-level insights for available posts
    if (postIds.length > 0) {
      console.log(`\n--- 7. Testing Post-Level Insights for post ${postIds[0]} ---`);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${postIds[0]}/insights?metric=post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total&access_token=${encodeURIComponent(pageToken)}`);
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Post insights response:', JSON.stringify(data, null, 2));
      } catch (e: any) {
        console.error('Error fetching post insights:', e.message);
      }
    }
  }
}

runMetaGraphAudit().catch(console.error);
