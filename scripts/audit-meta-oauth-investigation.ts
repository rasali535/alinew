import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const appId = process.env.FACEBOOK_APP_ID || '1558897076250918';
const appSecret = process.env.FACEBOOK_APP_SECRET || 'd4312bd07999fae43305dd0278fba62a';
const appAccessToken = `${appId}|${appSecret}`;

function decryptToken(encryptedEnvelope: string): string {
  if (!encryptedEnvelope) return '';
  if (encryptedEnvelope.startsWith('enc_gcm_v2_')) {
    const parts = encryptedEnvelope.replace('enc_gcm_v2_', '').split('_');
    const [ivHex, tagHex, cipherHex] = parts;
    const secretKey = process.env.OAUTH_ENCRYPTION_KEY || 'ralion-os-aes256-key-change-in-production-32b';
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
  return '';
}

async function runComprehensiveDiagnostic() {
  console.log('========================================================================');
  console.log('🔍 META GRAPH API & OAUTH COMPREHENSIVE INVESTIGATION FOR RALION');
  console.log('========================================================================\n');

  // 1. Current production Meta App ID & details
  console.log('--- 1. CURRENT PRODUCTION META APP ID & STATUS ---');
  console.log('App ID:', appId);
  const appRes = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=id,name,link,app_type,category,roles,restrictions,app_domains,privacy_policy_url,terms_of_service_url&access_token=${appAccessToken}`);
  const appData = await appRes.json();
  console.log('App Details:', JSON.stringify(appData, null, 2));

  // 2. Facebook Login Configuration & Permissions
  console.log('\n--- 2. APPROVED / AVAILABLE PERMISSIONS ON META APP ---');
  const permRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/permissions?access_token=${appAccessToken}`);
  const permData = await permRes.json();
  console.log('Approved Permissions:', JSON.stringify(permData, null, 2));

  // 3. Valid OAuth redirect URIs vs Ralion callback URL
  console.log('\n--- 3. REDIRECT URI & DOMAIN COMPARISON ---');
  const callbackUrl = 'https://rasalilabs.com/ralion/api/oauth/facebook/callback';
  console.log('Ralion Generated Callback URL:', callbackUrl);
  console.log('App Domains on Meta App:', appData.app_domains);
  const parsedCb = new URL(callbackUrl);
  console.log('  Scheme:', parsedCb.protocol.replace(':', ''));
  console.log('  Host:', parsedCb.hostname);
  console.log('  Path:', parsedCb.pathname);
  console.log('  Trailing Slash:', parsedCb.pathname.endsWith('/') && parsedCb.pathname !== '/');

  // 4. Requested Scopes Breakdown & Permission Validity Analysis
  console.log('\n--- 4. PERMISSIONS VALIDITY ANALYSIS ---');
  const targetScopes = [
    'email',
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
    'pages_messaging'
  ];

  const approvedList = (permData.data || []).map((p: any) => p.permission);
  console.log('Target Scopes Breakdown:');
  for (const s of targetScopes) {
    const isLive = approvedList.includes(s);
    console.log(`  - [${s}]: ${isLive ? '✅ APPROVED / LIVE' : '❌ UNAPPROVED / REQUIRES APP REVIEW (Standard Access only)'}`);
  }

  // 5. Authenticated User Token Inspection & /me/accounts
  console.log('\n--- 5. AUTHENTICATED USER TOKEN & /me/accounts INSPECTION ---');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: conns } = await supabase.from('social_connections').select('*').eq('provider', 'facebook');

  for (const conn of conns || []) {
    console.log(`\nInspecting connection ID: ${conn.id} (Account: ${conn.account_name}, Type: ${conn.account_type})`);
    const encToken = conn.metadata?.encrypted_access_token;
    if (!encToken) {
      console.log('  No encrypted token in connection metadata.');
      continue;
    }
    const token = decryptToken(encToken);
    if (!token) {
      console.log('  Failed to decrypt token.');
      continue;
    }

    // Debug token
    const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${appAccessToken}`);
    const debugData = await debugRes.json();
    console.log('  Debug Token:', JSON.stringify(debugData?.data, null, 2));

    // /me/permissions
    const uPermRes = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`);
    const uPermData = await uPermRes.json();
    console.log('  User Granted Permissions:', JSON.stringify(uPermData?.data, null, 2));

    // /me/accounts
    const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${token}`);
    const accData = await accRes.json();
    console.log('  /me/accounts result:', JSON.stringify(accData, null, 2));
  }

  // 6. OAuth URL comparison
  console.log('\n--- 6. EXACT OAUTH URL GENERATED BY RALION ---');
  const testState = 'sample_state_token_123';
  const fullOAuthUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' + new URLSearchParams({
    client_id: appId,
    redirect_uri: callbackUrl,
    state: testState,
    scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata',
    response_type: 'code',
    auth_type: 'rerequest'
  }).toString();
  console.log('Full OAuth URL (6 scopes):', fullOAuthUrl);

  const minimalPageOAuthUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' + new URLSearchParams({
    client_id: appId,
    redirect_uri: callbackUrl,
    state: testState,
    scope: 'public_profile,email,pages_show_list',
    response_type: 'code',
    auth_type: 'rerequest'
  }).toString();
  console.log('Minimal Page-Discovery OAuth URL:', minimalPageOAuthUrl);

  const baselineLoginOAuthUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' + new URLSearchParams({
    client_id: appId,
    redirect_uri: callbackUrl,
    state: testState,
    scope: 'public_profile,email',
    response_type: 'code',
    auth_type: 'rerequest'
  }).toString();
  console.log('Baseline Approved Login OAuth URL:', baselineLoginOAuthUrl);
}

runComprehensiveDiagnostic().catch(console.error);
