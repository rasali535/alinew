import fetch from 'node-fetch';

const APP_ID = '1759273775121373';
const REDIRECT_URI = 'https://rasalilabs.com/ralion/api/oauth/facebook/callback';

async function followOAuth() {
  const initialUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=public_profile,email&response_type=code`;
  console.log(`Initial URL: ${initialUrl}`);
  
  const res1 = await fetch(initialUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'manual'
  });

  const location1 = res1.headers.get('location');
  console.log('Location 1:', location1);

  if (location1) {
    const res2 = await fetch(location1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    console.log('Status 2:', res2.status);
    console.log('Headers 2:', Object.fromEntries(res2.headers.entries()));
    const text2 = await res2.text();
    console.log('Body 2 Length:', text2.length);
    console.log('Body 2 Preview:', text2.substring(0, 1000));

    // Search for titles / errors in html
    const titleMatch = text2.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      console.log('HTML Title:', titleMatch[1]);
    }
  }
}

followOAuth();
