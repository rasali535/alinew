import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/admin/.env.local' });

import { createClient } from '@supabase/supabase-js';

async function diagnose() {
  console.log('================================================================');
  console.log('  DIAGNOSING FACEBOOK CONNECTIONS & ADMIN CUSTOMER SOURCES');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Social Connections
  console.log('--- 1. Supabase social_connections table ---');
  const { data: conns, error: connErr } = await supabase.from('social_connections').select('*');
  if (connErr) {
    console.error('social_connections error:', connErr);
  } else {
    console.log(`Found ${conns?.length} social_connections:`);
    for (const c of conns || []) {
      console.log(JSON.stringify(c, null, 2));
    }
  }

  // 2. Zernio Profiles & Accounts
  const zernioApiKey = process.env.ZERNIO_API_KEY;
  console.log('\n--- 2. Zernio API Accounts ---');
  console.log('Zernio API Key present:', Boolean(zernioApiKey));

  if (zernioApiKey) {
    for (const c of conns || []) {
      if (c.zernio_profile_id) {
        try {
          console.log(`\nQuerying Zernio for profileId: ${c.zernio_profile_id}...`);
          const res = await fetch(`https://api.zernio.com/v1/accounts?profileId=${c.zernio_profile_id}`, {
            headers: { 'Authorization': `Bearer ${zernioApiKey}` }
          });
          console.log(`Zernio /accounts status: ${res.status}`);
          const zData = await res.json();
          console.log('Zernio accounts response:', JSON.stringify(zData, null, 2));
        } catch (err: any) {
          console.error('Zernio fetch error:', err.message);
        }
      }
    }
  }

  // 3. Supabase profiles, organizations, ralion_customers
  console.log('\n--- 3. Database Entities (profiles, organizations, customers) ---');
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role');
  console.log('profiles:', profiles);

  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('organizations:', orgs);

  const { data: customers } = await supabase.from('ralion_customers').select('*');
  console.log('ralion_customers:', customers);
}

diagnose().catch(console.error);
