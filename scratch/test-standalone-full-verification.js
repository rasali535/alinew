const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 6520;
process.env.PORT = String(PORT);
process.env.HOSTNAME = '127.0.0.1';
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

const standaloneServerPath = path.resolve(
  __dirname,
  '../apps/ralion/.next/standalone/apps/ralion/server.js'
);

console.log('Spawning standalone server on port', PORT);
const proc = spawn('node', [standaloneServerPath], {
  env: {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

proc.stdout.on('data', (d) => process.stdout.write(`[SERVER OUT] ${d}`));
proc.stderr.on('data', (d) => process.stderr.write(`[SERVER ERR] ${d}`));

function get(pathStr, origin = 'https://rasalilabs.com') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${PORT}${pathStr}`,
      {
        method: 'GET',
        headers: {
          Origin: origin,
          Accept: 'application/json,image/*,*/*',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve({
            status: res.status,
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            text: body.toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  // Wait for server to start
  await new Promise((r) => setTimeout(r, 4000));

  console.log('\n==================================================');
  console.log('FULL VERIFICATION SUITE');
  console.log('==================================================\n');

  try {
    // 1. Check Logo
    console.log('1. Testing GET /logo.png:');
    const logoRes = await get('/logo.png');
    console.log(`   Status: ${logoRes.statusCode}`);
    console.log(`   Content-Type: ${logoRes.headers['content-type']}`);
    console.log(`   Content-Length: ${logoRes.body.length} bytes`);

    // 2. Check Facebook Page Posts
    console.log('\n2. Testing GET /api/social/facebook/pages/default/posts:');
    const postsRes = await get('/api/social/facebook/pages/default/posts');
    console.log(`   Status: ${postsRes.statusCode}`);
    console.log(`   Access-Control-Allow-Origin: ${postsRes.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Credentials: ${postsRes.headers['access-control-allow-credentials']}`);
    try {
      const pData = JSON.parse(postsRes.text);
      console.log(`   Success: ${pData.success}`);
      console.log(`   Total Posts returned: ${pData.posts?.length}`);
      if (pData.posts?.length > 0) {
        console.log('   Sample Post #1:', {
          id: pData.posts[0].id,
          title: pData.posts[0].title,
          publishedAt: pData.posts[0].publishedAt,
          source: pData.posts[0].source,
          hasMedia: pData.posts[0].mediaUrls?.length > 0,
          engagement: pData.posts[0].engagement,
        });
      }
    } catch {
      console.log('   Raw text:', postsRes.text.slice(0, 200));
    }

    // 3. Check Facebook Page Analytics
    console.log('\n3. Testing GET /api/social/facebook/pages/default/analytics:');
    const analyticsRes = await get('/api/social/facebook/pages/default/analytics');
    console.log(`   Status: ${analyticsRes.statusCode}`);
    try {
      const aData = JSON.parse(analyticsRes.text);
      console.log(`   Success: ${aData.success}`);
      console.log('   Analytics:', aData.analytics);
    } catch {
      console.log('   Raw text:', analyticsRes.text.slice(0, 200));
    }

    // 4. Check Facebook Comments
    console.log('\n4. Testing GET /api/social/comments:');
    const commentsRes = await get('/api/social/comments');
    console.log(`   Status: ${commentsRes.statusCode}`);
    try {
      const cData = JSON.parse(commentsRes.text);
      console.log(`   Success: ${cData.success}`);
      console.log(`   Total Comments: ${cData.total || cData.comments?.length}`);
      if (cData.comments?.length > 0) {
        console.log('   Sample Comment #1:', cData.comments[0]);
      }
    } catch {
      console.log('   Raw text:', commentsRes.text.slice(0, 200));
    }

    // 5. Check Facebook Inbox Conversations
    console.log('\n5. Testing GET /api/social/inbox?provider=facebook:');
    const inboxRes = await get('/api/social/inbox?provider=facebook');
    console.log(`   Status: ${inboxRes.statusCode}`);
    try {
      const iData = JSON.parse(inboxRes.text);
      console.log(`   Success: ${iData.success}`);
      console.log(`   Total Conversations: ${iData.conversations?.length}`);
      if (iData.conversations?.length > 0) {
        console.log('   Sample Conversation #1:', {
          id: iData.conversations[0].conversationId,
          participant: iData.conversations[0].participantName,
          lastMessage: iData.conversations[0].lastMessage,
          messagesCount: iData.conversations[0].messages?.length,
        });
      }
    } catch {
      console.log('   Raw text:', inboxRes.text.slice(0, 200));
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    proc.kill();
    process.exit(0);
  }
})();
