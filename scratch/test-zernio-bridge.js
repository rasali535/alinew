const dotenv = require('dotenv');
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });

async function testZernioBridge() {
  const { ZernioSocialService } = require('./packages/integrations/dist/index.js');
  console.log('ZernioSocialService configured:', ZernioSocialService.isConfigured());

  try {
    const profiles = await ZernioSocialService.listProfiles();
    console.log('Profiles retrieved from Zernio bridge:', JSON.stringify(profiles, null, 2));

    if (profiles.length > 0) {
      const p = profiles[0];
      const connect = await ZernioSocialService.getConnectUrl('facebook', p.id, 'https://app.ralion.co/ralion/growth');
      console.log('Connect URL response:', JSON.stringify(connect, null, 2));

      if (connect?.authUrl) {
        const u = new URL(connect.authUrl);
        console.log('\n--- OAUTH URL DETAILS ---');
        console.log('Host:', u.host);
        console.log('Path:', u.pathname);
        console.log('Client ID (Meta App ID):', u.searchParams.get('client_id') || u.searchParams.get('app_id'));
        console.log('Redirect URI:', u.searchParams.get('redirect_uri'));
        console.log('Scope:', u.searchParams.get('scope'));
      }
    }
  } catch (err) {
    console.error('Error querying Zernio:', err);
  }
}

testZernioBridge();
