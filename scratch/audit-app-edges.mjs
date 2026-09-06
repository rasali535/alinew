import fetch from 'node-fetch';

const APP_ID = '1759273775121373';
const APP_SECRET = '44402f5d49f3be40102e2f11039499fe';
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function testEdge(edgeName) {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/${edgeName}?access_token=${APP_TOKEN}`);
    const data = await res.json();
    console.log(`--- Edge: /${edgeName} (Status: ${res.status}) ---`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log(`Edge /${edgeName} error:`, e.message);
  }
}

async function main() {
  const edges = [
    'accounts',
    'app_insights',
    'authorized_user_domains',
    'banned',
    'business',
    'buttons',
    'cloud_games',
    'context',
    'events',
    'features',
    'groups',
    'mobile_sdk_logs',
    'objects',
    'plugins',
    'roles',
    'subscriptions',
    'whatsapp_business_accounts'
  ];

  for (const edge of edges) {
    await testEdge(edge);
  }
}

main();
