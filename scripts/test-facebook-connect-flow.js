#!/usr/bin/env node

/**
 * RALION — Test Facebook OAuth Connect Flow Simulation
 * Ras Ali Labs (Pty) Ltd
 */

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const ROOT_DIR = path.resolve(__dirname, '..');
const ralionProd = parseEnvFile(path.join(ROOT_DIR, 'apps/ralion/.env.production'));
const rootEnv = parseEnvFile(path.join(ROOT_DIR, '.env'));

for (const [k, v] of Object.entries({ ...rootEnv, ...ralionProd })) {
  if (!process.env[k]) process.env[k] = v;
}

const { ZernioSocialService } = require('../packages/integrations/dist/social/services/ZernioSocialService.js');

async function testFacebookConnectFlow() {
  console.log('\n' + '='.repeat(70));
  console.log('  🧪  RALION FACEBOOK CONNECT FLOW END-TO-END SIMULATION');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('1. Checking Zernio configuration...');
    const isConfigured = ZernioSocialService.isConfigured();
    console.log(`   isConfigured: ${isConfigured}`);

    console.log('\n2. Listing Zernio Profiles...');
    const profiles = await ZernioSocialService.listProfiles();
    console.log(`   Found ${profiles.length} profiles:`, profiles);

    if (profiles.length === 0) {
      throw new Error('No Zernio profiles available.');
    }

    const profileId = profiles[0].id;
    console.log(`\n3. Active Profile ID: ${profileId}`);

    console.log('\n4. Generating Connect URL for Facebook...');
    const appUrl = 'https://rasalilabs.com';
    const callbackUrl = `${appUrl}/ralion/growth?connected=facebook&provider=zernio`;
    
    const { authUrl } = await ZernioSocialService.getConnectUrl('facebook', profileId, callbackUrl);
    console.log('\n[SUCCESS] Facebook OAuth Authorization URL generated:');
    console.log(`URL: ${authUrl.substring(0, 100)}...`);

    const parsed = new URL(authUrl);
    console.log('\nParameters in Auth URL:');
    console.log(` - Host: ${parsed.host}`);
    console.log(` - Pathname: ${parsed.pathname}`);
    console.log(` - Client ID: ${parsed.searchParams.get('client_id')}`);
    console.log(` - Redirect URI: ${parsed.searchParams.get('redirect_uri')}`);
    console.log(` - Scopes: ${parsed.searchParams.get('scope')}`);

    console.log('\n' + '='.repeat(70));
    console.log('  🏆 FACEBOOK CONNECT FLOW SUCCESSFULLY VERIFIED');
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('\n[ERROR]:', err.message);
    console.log('\n' + '='.repeat(70) + '\n');
  }
}

testFacebookConnectFlow();
