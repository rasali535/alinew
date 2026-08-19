import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { ZernioSocialService } = await import('../packages/integrations/dist/index.js');
  console.log('ZernioSocialService configured:', ZernioSocialService.isConfigured());
  console.log('SUPABASE_URL:', SUPABASE_URL);

  // 1. Check Profiles on Zernio
  try {
    const profiles = await ZernioSocialService.listProfiles();
    console.log('Profiles on Zernio:', JSON.stringify(profiles, null, 2));

    for (const p of profiles) {
      console.log(`\nChecking accounts for profile: ${p.id} (${p.name})`);
      const accounts = await ZernioSocialService.getAccounts(p.id);
      console.log('Accounts on Zernio:', JSON.stringify(accounts, null, 2));

      console.log(`\nRequesting connect URL for Facebook on profile: ${p.id}`);
      const connect = await ZernioSocialService.getConnectUrl('facebook', p.id, 'https://rasalilabs.com/ralion/growth?connected=facebook&provider=zernio');
      console.log('Connect result:', JSON.stringify(connect, null, 2));

      if (connect?.authUrl) {
        const u = new URL(connect.authUrl);
        console.log('\n=== OAUTH URL ANALYSIS ===');
        console.log('OAuth Host:', u.host);
        console.log('OAuth Path:', u.pathname);
        console.log('client_id / app_id (Meta App ID):', u.searchParams.get('client_id') || u.searchParams.get('app_id'));
        console.log('redirect_uri:', u.searchParams.get('redirect_uri'));
        console.log('scope:', u.searchParams.get('scope'));
        console.log('response_type:', u.searchParams.get('response_type'));
        console.log('state:', u.searchParams.get('state')?.slice(0, 30) + '...');
      }
    }
  } catch (err) {
    console.error('Zernio error:', err);
  }

  // 2. Check native Meta App ID in env
  console.log('\n=== NATIVE META APP CONFIG ===');
  console.log('FACEBOOK_APP_ID:', process.env.FACEBOOK_APP_ID);
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
}

run();
