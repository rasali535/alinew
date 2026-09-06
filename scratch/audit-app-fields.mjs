import fetch from 'node-fetch';

const APP_ID = '1759273775121373';
const APP_SECRET = '44402f5d49f3be40102e2f11039499fe';
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function main() {
  const fields = [
    'id', 'name', 'link', 'category', 'subcategory', 'company',
    'contact_email', 'privacy_policy_url', 'terms_of_service_url',
    'user_support_email', 'user_support_url', 'app_domains', 'website_url',
    'server_ip_whitelist', 'restrictions', 'app_type'
  ].join(',');
  const appRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}?fields=${fields}&access_token=${APP_TOKEN}`);
  const appData = await appRes.json();
  console.log('App Metadata:', JSON.stringify(appData, null, 2));
}

main();
