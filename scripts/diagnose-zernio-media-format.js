require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { ZernioSocialService } = require('../packages/integrations/src/social/services/ZernioSocialService');

async function testMediaVariants() {
  const imageUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop';

  // Variant 1: mediaItems as array of strings
  console.log('Testing Variant 1: mediaItems as string array');
  try {
    const res1 = await ZernioSocialService.request('posts', 'POST', {
      content: 'Testing media variant 1 (string array) from Ralion OS',
      platforms: [{
        platform: 'facebook',
        accountId: '6a82df7277555aae018b92b4',
        platformSpecificData: { pageId: '477334159265235' }
      }],
      mediaItems: [imageUrl],
      publishNow: true
    });
    console.log('Variant 1 Result:', res1);
  } catch (e) {
    console.log('Variant 1 Error:', e.message);
  }

  // Variant 2: mediaItems as array of objects { url, type }
  console.log('\nTesting Variant 2: mediaItems as object array');
  try {
    const res2 = await ZernioSocialService.request('posts', 'POST', {
      content: 'Testing media variant 2 (object array) from Ralion OS',
      platforms: [{
        platform: 'facebook',
        accountId: '6a82df7277555aae018b92b4',
        platformSpecificData: { pageId: '477334159265235' }
      }],
      mediaItems: [{ url: imageUrl, type: 'image' }],
      publishNow: true
    });
    console.log('Variant 2 Result:', res2);
  } catch (e) {
    console.log('Variant 2 Error:', e.message);
  }

  // Variant 3: mediaUrls as array of strings
  console.log('\nTesting Variant 3: mediaUrls as string array');
  try {
    const res3 = await ZernioSocialService.request('posts', 'POST', {
      content: 'Testing media variant 3 (mediaUrls) from Ralion OS',
      platforms: [{
        platform: 'facebook',
        accountId: '6a82df7277555aae018b92b4',
        platformSpecificData: { pageId: '477334159265235' }
      }],
      mediaUrls: [imageUrl],
      publishNow: true
    });
    console.log('Variant 3 Result:', res3);
  } catch (e) {
    console.log('Variant 3 Error:', e.message);
  }
}

testMediaVariants().catch(console.error);
