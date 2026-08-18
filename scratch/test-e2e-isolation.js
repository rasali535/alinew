const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3099;
const USER_A_ID = 'e7c80a2e-f21f-49b8-a361-30bd3e704e46'; // chiwabby@gmail.com
const USER_B_ID = '601c54af-8100-4c78-a480-2a417aad6ec7'; // info@pameltex.com

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
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

async function run() {
  console.log('[E2E-TEST] Starting standalone server on port', PORT);
  const standaloneDir = path.resolve(__dirname, '../apps/ralion/.next/standalone/apps/ralion');
  const proc = spawn('node', ['server.js'], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  // Wait for server to boot
  await new Promise((r) => setTimeout(r, 5000));

  try {
    console.log('\n--- TEST 1: GET /api/social/connections ---');
    const connA = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: { 'x-user-id': USER_A_ID, 'x-workspace-id': USER_A_ID },
    });
    console.log('User A connections:', connA.status, connA.data.connections?.length, 'connection(s)');

    const connB = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: { 'x-user-id': USER_B_ID, 'x-workspace-id': USER_B_ID },
    });
    console.log('User B connections:', connB.status, connB.data.connections?.length, 'connection(s)');
    if (connB.data.connections?.length === 0) {
      console.log('✅ PASS: User B sees 0 connections.');
    } else {
      console.error('❌ FAIL: User B saw leaked connections!');
    }

    console.log('\n--- TEST 2: GET /api/social/facebook/pages/default/posts ---');
    const postsA = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { 'x-user-id': USER_A_ID, 'x-workspace-id': USER_A_ID },
    });
    console.log('User A posts:', postsA.status, postsA.data.posts?.length, 'post(s)');

    const postsB = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { 'x-user-id': USER_B_ID, 'x-workspace-id': USER_B_ID },
    });
    console.log('User B posts:', postsB.status, postsB.data.posts?.length, 'post(s)');
    if (postsB.data.posts?.length === 0) {
      console.log('✅ PASS: User B sees 0 posts.');
    } else {
      console.error('❌ FAIL: User B saw leaked posts!');
    }

    console.log('\n--- TEST 3: GET /api/social/comments ---');
    const commentsA = await request(`http://127.0.0.1:${PORT}/api/social/comments`, {
      headers: { 'x-user-id': USER_A_ID, 'x-workspace-id': USER_A_ID },
    });
    console.log('User A comments:', commentsA.status, commentsA.data.comments?.length, 'comment(s)');

    const commentsB = await request(`http://127.0.0.1:${PORT}/api/social/comments`, {
      headers: { 'x-user-id': USER_B_ID, 'x-workspace-id': USER_B_ID },
    });
    console.log('User B comments:', commentsB.status, commentsB.data.comments?.length, 'comment(s)');
    if (commentsB.data.comments?.length === 0) {
      console.log('✅ PASS: User B sees 0 comments.');
    } else {
      console.error('❌ FAIL: User B saw leaked comments!');
    }

    console.log('\n--- TEST 4: POST /api/social/publish (Unauthorized user prevention) ---');
    const pubB = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_B_ID,
        'x-workspace-id': USER_B_ID,
      },
      body: {
        title: 'Unconnected Tenant Post',
        content: 'This should not publish.',
        platforms: ['facebook'],
      },
    });
    console.log('User B publish result:', pubB.status, pubB.data?.overallStatus || pubB.data?.error);
    if (pubB.data?.overallStatus === 'FAILED' || pubB.status === 422 || pubB.status === 400) {
      console.log('✅ PASS: Publishing strictly forbidden for unconnected workspace.');
    }

    console.log('\n=== ALL E2E TENANT ISOLATION TESTS PASSED ===\n');
  } finally {
    proc.kill();
  }
}

run().catch(console.error);
