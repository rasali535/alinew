import fetch from 'node-fetch';

const APP_ID = '1759273775121373';
const REDIRECT_URI = 'https://rasalilabs.com/ralion/api/oauth/facebook/callback';

async function testOAuthEndpoint(scopes) {
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  console.log(`\nTesting GET: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log('Body length:', body.length);
    console.log('Body snippet (first 500 chars):', body.substring(0, 500));
    if (body.includes('error') || body.includes('Error') || body.includes('403') || body.includes('not active') || body.includes('Not Active')) {
      console.log('Body contains error indicators!');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

async function main() {
  await testOAuthEndpoint('public_profile,email');
  await testOAuthEndpoint('public_profile');
}

main();
