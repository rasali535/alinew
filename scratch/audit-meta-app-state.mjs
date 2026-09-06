import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const APP_ID = '1759273775121373';
const APP_SECRET = '44402f5d49f3be40102e2f11039499fe';
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

async function auditMetaAppState() {
  console.log('=================================================================');
  console.log('META GRAPH API APP STATE & ENTITLEMENT AUDIT');
  console.log('=================================================================\n');

  // 1. Interrogate App Node
  console.log('--- 1. APP NODE METADATA (via App Access Token) ---');
  try {
    const fields = [
      'id', 'name', 'link', 'category', 'subcategory', 'company',
      'contact_email', 'privacy_policy_url', 'terms_of_service_url',
      'user_support_email', 'user_support_url', 'app_domains', 'website_url',
      'server_ip_whitelist', 'restrictions', 'app_type', 'business'
    ].join(',');
    const appRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}?fields=${fields}&access_token=${APP_TOKEN}`);
    const appData = await appRes.json();
    console.log('App Metadata Response Status:', appRes.status);
    console.log('App Metadata:', JSON.stringify(appData, null, 2));
  } catch (err) {
    console.error('Failed to fetch App Node:', err);
  }

  // 2. Interrogate App Permissions & Capabilities
  console.log('\n--- 2. APP PERMISSIONS / CAPABILITIES ---');
  try {
    const permRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/permissions?access_token=${APP_TOKEN}`);
    const permData = await permRes.json();
    console.log('App Permissions Status:', permRes.status);
    console.log('App Permissions:', JSON.stringify(permData, null, 2));
  } catch (err) {
    console.error('Failed to fetch App Permissions:', err);
  }

  // 3. Interrogate App Roles (Admins, Devs, Testers)
  console.log('\n--- 3. APP ROLES ---');
  try {
    const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/roles?access_token=${APP_TOKEN}`);
    const rolesData = await rolesRes.json();
    console.log('App Roles Status:', rolesRes.status);
    console.log('App Roles:', JSON.stringify(rolesData, null, 2));
  } catch (err) {
    console.error('Failed to fetch App Roles:', err);
  }

  // 4. Interrogate Stored Facebook Tokens in Supabase via debug_token
  console.log('\n--- 4. STORED TOKENS INSPECTION (debug_token) ---');
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: conns, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('provider', 'facebook');

    if (error) {
      console.error('Supabase query error:', error);
    } else {
      console.log(`Found ${conns?.length || 0} facebook connection(s) in Supabase.`);
      for (const conn of (conns || [])) {
        console.log(`\nConnection [${conn.id}] - User [${conn.user_id}] - Account [${conn.account_name}] (${conn.provider_account_id})`);
        console.log('Status:', conn.connection_status, 'Token Status:', conn.token_status);
        console.log('Scopes in DB:', conn.scopes);
        console.log('Metadata:', JSON.stringify(conn.metadata, null, 2));
      }
    }
  } catch (err) {
    console.error('Failed to query Supabase tokens:', err);
  }
}

auditMetaAppState();
