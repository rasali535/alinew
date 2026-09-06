import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { decryptToken } from '../packages/integrations/src/core/crypto';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '1759273775121373';
const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
const appToken = `${appId}|${appSecret}`;

async function testAppFields() {
  const fields = ['id', 'name', 'link', 'category', 'owner_business', 'roles'];
  for (const f of fields) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=${f}&access_token=${appToken}`);
      console.log(`Field ${f}:`, JSON.stringify(await res.json()));
    } catch (e: any) {
      console.log(`Field ${f} error:`, e.message);
    }
  }

  // Also test /1759273775121373/roles
  try {
    const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/roles?access_token=${appToken}`);
    console.log(`App Roles:`, JSON.stringify(await rolesRes.json()));
  } catch (e: any) {
    console.log(`App Roles error:`, e.message);
  }
}

testAppFields().catch(console.error);
