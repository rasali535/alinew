require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { ZernioSocialService } = require('../packages/integrations/src/social/services/ZernioSocialService');

async function testDirectPublish() {
  console.log('Testing direct Zernio /v1/posts publish with exact Zernio accountId and Page ID...');

  const payload = {
    profileId: '6a82deac1a69158ef81cb2cd',
    content: '🚀 Testing verified live publishing from Ralion Enterprise OS to Ras Ali Labs Facebook Page! #RalionOS #RasAliLabs #EnterpriseAI',
    platforms: [
      {
        platform: 'facebook',
        accountId: '6a82e16d4c62c3327d530062',
        platformSpecificData: {
          pageId: '477334159265235'
        }
      }
    ],
    publishNow: true
  };

  try {
    const res = await ZernioSocialService.createPost(payload);
    console.log('Publish result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Publish error:', err);
  }
}

testDirectPublish().catch(console.error);
