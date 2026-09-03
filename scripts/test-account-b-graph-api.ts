import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '@ralion/integrations';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAccountB() {
  const { data: conn } = await supabase
    .from('social_connections')
    .select('*')
    .eq('id', '9196984f-a119-42ec-b23d-588e623a4415')
    .single();

  const encToken = conn?.metadata?.encrypted_access_token;
  const token = decryptToken(encToken);
  console.log('Account B Token decrypted successfully. Prefix:', token.slice(0, 15));

  // 1. Query /me to see user info
  try {
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
    const meData = await meRes.json();
    console.log('Account B /me response:', meData);
  } catch (e: any) {
    console.error('/me failed:', e.message);
  }

  // 2. Query /me/accounts to see if this user manages any Facebook Pages
  try {
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
    const pagesData = await pagesRes.json();
    console.log('Account B /me/accounts (Managed Pages):', JSON.stringify(pagesData, null, 2));
  } catch (e: any) {
    console.error('/me/accounts failed:', e.message);
  }

  // 3. Query /me/posts to see if any posts exist
  try {
    const postsRes = await fetch(`https://graph.facebook.com/v19.0/me/posts?access_token=${token}`);
    const postsData = await postsRes.json();
    console.log('Account B /me/posts response:', JSON.stringify(postsData, null, 2));
  } catch (e: any) {
    console.error('/me/posts failed:', e.message);
  }
}

checkAccountB();
