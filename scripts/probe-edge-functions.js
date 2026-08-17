#!/usr/bin/env node

const https = require('https');

const functions = ['zernio-health', 'zernio-proxy', 'social-health', 'health', 'zernio'];

functions.forEach((fn) => {
  const req = https.request(
    `https://yidsfihagwttlmhfynmf.supabase.co/functions/v1/${fn}`,
    { method: 'GET', timeout: 5000 },
    (res) => {
      console.log(`[Edge Function Probe]: /functions/v1/${fn} -> HTTP ${res.statusCode}`);
    }
  );
  req.on('error', (e) => console.log(`[Edge Function Probe]: /functions/v1/${fn} -> Error: ${e.message}`));
  req.end();
});
