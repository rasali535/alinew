import fetch from 'node-fetch';

const APP_ID = '1759273775121373';
const APP_SECRET = '44402f5d49f3be40102e2f11039499fe';
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function main() {
  console.log('--- 1. APP NODE METADATA ---');
  const fields = [
    'id', 'name', 'link', 'category', 'subcategory', 'company',
    'contact_email', 'privacy_policy_url', 'terms_of_service_url',
    'user_support_email', 'user_support_url', 'app_domains', 'website_url',
    'server_ip_whitelist', 'restrictions', 'app_type', 'business'
  ].join(',');
  const appRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}?fields=${fields}&access_token=${APP_TOKEN}`);
  const appData = await appRes.json();
  console.log('App Metadata:', JSON.stringify(appData, null, 2));

  console.log('\n--- 2. APP PERMISSIONS / CAPABILITIES ---');
  const permRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/permissions?access_token=${APP_TOKEN}`);
  const permData = await permRes.json();
  console.log('App Permissions:', JSON.stringify(permData, null, 2));

  console.log('\n--- 3. APP ROLES ---');
  const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/roles?access_token=${APP_TOKEN}`);
  const rolesData = await rolesRes.json();
  console.log('App Roles:', JSON.stringify(rolesData, null, 2));

  console.log('\n--- 4. DEBUG TOKEN ON APP TOKEN ---');
  const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${APP_TOKEN}&access_token=${APP_TOKEN}`);
  const debugData = await debugRes.json();
  console.log('Debug Token Data:', JSON.stringify(debugData, null, 2));
}

main();
