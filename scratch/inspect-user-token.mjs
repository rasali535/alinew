import fetch from 'node-fetch';

const TOKEN = 'EAAZAADNhtw90BSWL34RBtg7hZCnZCKIq4Cqw3JGZCJIxkXOCPlQ7OcMByZAx1BoHFRvR40EidXzzsIKU61dAnelPagLzZBISiGM889y0ccZBg2ECUYyZAxH4bJUPwZA4ajfe2r5HGy4fKZBQtgtsKILIySZAFg9oYef5nIARkboNlDscwXNC4TMdSYd41ZBBnzJHJ5cl7bRoXJXvKx4zl5ZBVmdc4UW2XJBLgzkD5xGFgowrcgLqjivDkfUDnbNl0WtMD9FCXu0fn9Urk2sJ7wvcTvLvuU7Df';
const APP_ID = '1759273775121373';
const APP_SECRET = '44402f5d49f3be40102e2f11039499fe';
const APP_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function inspectToken() {
  console.log('=================================================================');
  console.log('TOKEN DIAGNOSTIC & DEBUG REPORT');
  console.log('=================================================================\n');

  // 1. Debug Token
  console.log('--- 1. /debug_token ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${TOKEN}&access_token=${APP_TOKEN}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Debug token error:', e);
  }

  // 2. Permissions granted to this token
  console.log('\n--- 2. /me/permissions ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${TOKEN}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Permissions error:', e);
  }

  // 3. User profile details
  console.log('\n--- 3. /me?fields=id,name,email,picture ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${TOKEN}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('User profile error:', e);
  }

  // 4. Managed Pages / Accounts
  console.log('\n--- 4. /me/accounts ---');
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,tasks,followers_count,fan_count&access_token=${TOKEN}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Accounts error:', e);
  }
}

inspectToken();
