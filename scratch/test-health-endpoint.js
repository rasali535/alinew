const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

async function testHealth() {
  const PORT = 3099;
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

  try {
    let resData = null;
    for (let i = 0; i < 20; i++) {
      try {
        resData = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
          }).on('error', reject);
        });
        if (resData.status === 200) break;
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log('Health check response:', resData);
    if (resData && resData.status === 200) {
      console.log('✅ PASS: /api/health responds with 200 OK');
      process.exit(0);
    } else {
      console.error('❌ FAIL: /api/health did not return 200 OK');
      process.exit(1);
    }
  } finally {
    proc.kill();
  }
}

testHealth();
