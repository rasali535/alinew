require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { SocialPublishingService } = require('../apps/ralion/src/lib/services/social/socialPublishing.service');

async function debugPublish() {
  const result = await SocialPublishingService.publish({
    userId: 'default-user',
    organizationId: 'org_ralion_prod',
    title: 'UI publishing test from Ralion OS.',
    body: 'UI publishing test from Ralion OS with unique timestamp: ' + Date.now(),
    platforms: ['facebook'],
    authorName: 'Ras Ali Labs',
    socialConnectionId: '6a82df7277555aae018b92b4',
    pageId: '477334159265235',
  });
  console.log('Result:', JSON.stringify(result, null, 2));
}

debugPublish().catch(console.error);
