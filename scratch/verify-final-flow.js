const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ralion-dynamic-backend.onrender.com';
const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.9lW_vF_1bL-1b9oF6YfH6L_qF5zU6V_X1Y2Z3A4B5C6';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          Origin: 'https://rasalilabs.com',
          Connection: 'close',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, rawData: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function verifyFinalFlow() {
  console.log('\n======================================================');
  console.log('RALION OS — FINAL RECONCILIATION & INTERACTION PASS');
  console.log('======================================================\n');

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find(u => u.email === 'chiwabby@gmail.com');
  const { data: linkA } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userA.email,
  });
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionA } = await clientA.auth.verifyOtp({
    email: userA.email,
    token: linkA.properties.email_otp,
    type: 'magiclink',
  });
  const tokenA = sessionA?.session?.access_token;

  // 1. Fetch live posts
  const postsRes = await request(`${PROD_URL}/api/social/facebook/pages/default/posts`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const targetPublished = postsRes.data?.posts?.find(p => p.platformPostId === '477334159265235_1686965636768092' || p.id === '6a84b330b6e4cdbded32e338');
  console.log('Final Published Post Object:', targetPublished);

  // 2. Fetch comments
  const commentsRes = await request(`${PROD_URL}/api/social/comments`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log(`Comments Count: ${commentsRes.data?.comments?.length || 0}`);

  console.log('\n======================================================');
  console.log('ALL VERIFICATION STEPS COMPLETE');
  console.log('======================================================\n');
}

verifyFinalFlow().catch(console.error);
