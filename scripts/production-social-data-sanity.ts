/**
 * Ralion OS — Production Social Data Sanity Audit Script
 * 
 * Safely queries production database to inspect:
 * - Real users
 * - Real social connections (Account A, Account B, etc.)
 * - Provider breakdown
 * - social_posts schema & distribution
 * - Orphan posts
 * - Command Center metrics (connected users vs connections)
 * 
 * NOTE: NEVER PRINTS ACCESS TOKENS, SECRETS, OR CREDENTIALS.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSanityCheck() {
  console.log('================================================================');
  console.log('  RALION OS — PRODUCTION SOCIAL DATA SANITY AUDIT');
  console.log('================================================================\n');

  // 1. Users
  console.log('=== USERS ===');
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, created_at');
  
  if (usersErr) {
    console.error('Error fetching users:', usersErr.message);
  } else {
    console.log(`Total real users in DB: ${users?.length || 0}`);
    users?.forEach(u => {
      console.log(`- User ID: ${u.id} | Email: ${u.email}`);
    });
  }

  // 2. Social Connections
  console.log('\n=== CONNECTIONS ===');
  const { data: conns, error: connsErr } = await supabase
    .from('social_connections')
    .select('id, user_id, workspace_id, organization_id, provider, provider_account_id, account_name, username, connection_status, token_status, followers_count, infrastructure_provider, zernio_account_id, zernio_profile_id, created_at, updated_at');

  if (connsErr) {
    console.error('Error fetching social_connections:', connsErr.message);
  } else {
    console.log(`Total social connections in DB: ${conns?.length || 0}`);
    conns?.forEach(c => {
      console.log(`- Connection ID: ${c.id}`);
      console.log(`  User ID: ${c.user_id} | Workspace ID: ${c.workspace_id}`);
      console.log(`  Provider: ${c.provider} | Provider Account ID: ${c.provider_account_id}`);
      console.log(`  Account Name: ${c.account_name} | Username: ${c.username}`);
      console.log(`  Status: ${c.connection_status} | Token Status: ${c.token_status}`);
      console.log(`  Followers: ${c.followers_count} | Infra: ${c.infrastructure_provider}`);
      console.log(`  Zernio Profile ID: ${c.zernio_profile_id} | Zernio Account ID: ${c.zernio_account_id}`);
      console.log(`  Created: ${c.created_at}`);
      console.log('  ------------------------------------------------');
    });
  }

  // 3. Providers breakdown
  console.log('\n=== PROVIDERS ===');
  const providerCounts: Record<string, number> = {};
  conns?.forEach(c => {
    providerCounts[c.provider] = (providerCounts[c.provider] || 0) + 1;
  });
  Object.entries(providerCounts).forEach(([provider, count]) => {
    console.log(`- ${provider}: ${count} connection(s)`);
  });

  // 4. Social Posts schema & audit
  console.log('\n=== SOCIAL POSTS SCHEMA & COUNTS ===');
  const { data: postsSample, error: postsSampleErr } = await supabase
    .from('social_posts')
    .select('*')
    .limit(1);

  if (postsSampleErr) {
    console.error('Error probing social_posts schema:', postsSampleErr.message);
  } else {
    const sample = postsSample?.[0] || {};
    const columns = Object.keys(sample);
    console.log('social_posts table columns:', columns.join(', '));
    const hasConnectionId = columns.includes('social_connection_id');
    console.log(`Has 'social_connection_id' column: ${hasConnectionId ? 'YES' : 'NO'}`);
  }

  const { data: allPosts, error: allPostsErr } = await supabase
    .from('social_posts')
    .select('id, user_id, workspace_id, platforms, status, title, created_at, published_at');

  if (allPostsErr) {
    console.error('Error fetching social_posts:', allPostsErr.message);
  } else {
    console.log(`Total social posts in DB: ${allPosts?.length || 0}`);
    allPosts?.forEach(p => {
      console.log(`- Post ID: ${p.id} | Title: ${p.title} | Status: ${p.status} | Platforms: ${JSON.stringify(p.platforms)} | User: ${p.user_id} | Workspace: ${p.workspace_id}`);
    });
  }

  // Check posts specifically linked to social_connection_id if column exists
  try {
    const { data: linkedPosts } = await supabase
      .from('social_posts')
      .select('id, social_connection_id, title');
    
    console.log('\n=== POSTS BY SOCIAL_CONNECTION_ID ===');
    const countsByConn: Record<string, number> = {};
    let orphanCount = 0;
    linkedPosts?.forEach((p: any) => {
      if (p.social_connection_id) {
        countsByConn[p.social_connection_id] = (countsByConn[p.social_connection_id] || 0) + 1;
      } else {
        orphanCount++;
      }
    });
    Object.entries(countsByConn).forEach(([connId, count]) => {
      console.log(`- Connection ${connId}: ${count} post(s)`);
    });
    console.log(`=== ORPHAN POSTS === (no social_connection_id): ${orphanCount}`);
  } catch (err: any) {
    console.log('Notice: social_connection_id column cannot be queried:', err.message);
  }

  // 5. Command Center Metrics
  console.log('\n=== COMMAND CENTER METRICS ===');
  // Distinct users in authorized tenant who have at least one active connection
  const activeConnections = conns?.filter(c => c.connection_status === 'CONNECTED') || [];
  const distinctConnectedUserIds = new Set(activeConnections.map(c => c.user_id).filter(Boolean));
  
  console.log(`Total Active Social Connections: ${activeConnections.length}`);
  console.log(`Total Distinct Connected Users: ${distinctConnectedUserIds.size}`);
  console.log(`Connected User IDs: ${Array.from(distinctConnectedUserIds).join(', ')}`);

  console.log('\n================================================================');
  console.log('  AUDIT COMPLETE');
  console.log('================================================================\n');
}

runSanityCheck().catch(err => {
  console.error('Sanity check fatal error:', err);
  process.exit(1);
});
