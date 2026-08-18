const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 6540;
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

function request(pathStr, method = 'GET', body = null, origin = 'https://rasalilabs.com') {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const headers = {
      Origin: origin,
      Accept: 'application/json',
    };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = http.request(
      `http://127.0.0.1:${PORT}${pathStr}`,
      {
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: JSON.parse(raw),
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              text: raw,
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await request('/api/health');
      if (res.statusCode === 200) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Server did not start in 20s');
}

(async () => {
  await waitForServer();

  console.log('\n==================================================');
  console.log('E2E PRODUCTION VERIFICATION SUITE');
  console.log('==================================================\n');

  try {
    // 1. Health
    console.log('1. Health check:');
    const health = await request('/api/health');
    console.log(`   Status: ${health.statusCode}, Success: ${health.data?.success || health.data?.status}`);

    // 2. Market research (Benchmarks safety)
    console.log('\n2. Market research (Benchmarks safe verification):');
    const market = await request('/api/social/facebook/pages/default/market-research');
    console.log(`   Status: ${market.statusCode}, Success: ${market.data?.success}`);
    console.log('   Benchmarks loaded:', {
      industry: market.data?.report?.benchmarks?.industry,
      engagement: market.data?.report?.benchmarks?.rasAliLabsEngagementRate,
      growth: market.data?.report?.benchmarks?.rasAliLabsGrowthMonthly,
    });

    // 3. Facebook Posts
    console.log('\n3. Facebook Posts:');
    const posts = await request('/api/social/facebook/pages/default/posts');
    console.log(`   Status: ${posts.statusCode}, Total posts: ${posts.data?.posts?.length}`);

    // 4. Facebook Comments
    console.log('\n4. Facebook Comments:');
    const comments = await request('/api/social/comments');
    console.log(`   Status: ${comments.statusCode}, Total comments: ${comments.data?.total || comments.data?.comments?.length}`);
    const sampleComment = comments.data?.comments?.[0];
    console.log('   Target comment to reply to:', {
      id: sampleComment?.id,
      postId: sampleComment?.postId,
      author: sampleComment?.authorName,
      text: sampleComment?.commentText,
    });

    // 5. Post real reply to comment
    if (sampleComment) {
      console.log('\n5. Posting real reply to comment:');
      const replyPayload = {
        commentId: sampleComment.id,
        postId: sampleComment.postId,
        replyText: 'Hello from Ralion OS! [Automated Production E2E Verification ' + Date.now() + ']',
        authorName: 'Ras Ali Labs',
      };
      const replyRes = await request('/api/social/comments', 'POST', replyPayload);
      console.log(`   Reply POST status: ${replyRes.statusCode}`);
      console.log('   Reply response:', replyRes.data);

      // 6. Verify reply exists in comments thread
      console.log('\n6. Re-fetching post comments to verify reply on thread:');
      await new Promise((r) => setTimeout(r, 1500));
      const threadRes = await request(`/api/social/comments?postId=${sampleComment.postId}`);
      const updatedComment = threadRes.data?.comments?.find((c) => c.id === sampleComment.id);
      console.log(`   Thread comments count: ${threadRes.data?.comments?.length}`);
      console.log(`   Replies on target comment: ${updatedComment?.replies?.length}`);
      if (updatedComment?.replies?.length > 0) {
        console.log('   Latest reply:', updatedComment.replies[updatedComment.replies.length - 1]);
      }
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    proc.kill();
    process.exit(0);
  }
})();
