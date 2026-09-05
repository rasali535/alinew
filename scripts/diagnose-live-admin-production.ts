import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const RENDER_BASE = 'https://ralion-dynamic-backend.onrender.com';
const HOSTINGER_BASE = 'https://rasalilabs.com';

const adminKey = process.env.PLATFORM_ADMIN_SECRET || 'platform-admin-master-key-verified';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function probeEndpoint(url: string, headers: Record<string, string>) {
  console.log(`\n======================================================`);
  console.log(`🔍 PROBING: ${url}`);
  console.log(`Headers:`, headers);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Response Headers:`);
    res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(`JSON Response:\n`, JSON.stringify(json, null, 2));
      return { status: res.status, json, text };
    } catch {
      console.log(`Non-JSON Response (first 500 chars):\n`, text.slice(0, 500));
      return { status: res.status, text };
    }
  } catch (err: any) {
    console.error(`Fetch error:`, err.message);
    return { error: err.message };
  }
}

async function runLiveDiagnostics() {
  console.log('🚀 STARTING LIVE PRODUCTION COMMAND CENTRE DIAGNOSTICS');
  
  const headersVariations = [
    { 'x-admin-key': 'platform-admin-master-key-verified' },
    { 'x-admin-key': serviceRoleKey },
    { 'Authorization': `Bearer ${serviceRoleKey}` },
  ];

  // 1. Probe Render backend
  console.log('\n--- 1. RENDER BACKEND PROBES ---');
  await probeEndpoint(`${RENDER_BASE}/api/admin/customers`, headersVariations[0]);
  await probeEndpoint(`${RENDER_BASE}/api/admin/metrics`, headersVariations[0]);
  await probeEndpoint(`${RENDER_BASE}/api/admin/connected-users`, headersVariations[0]);

  // 2. Probe Hostinger domain
  console.log('\n--- 2. HOSTINGER WEB / RALION PROBES ---');
  await probeEndpoint(`${HOSTINGER_BASE}/api/admin/customers`, headersVariations[0]);
  await probeEndpoint(`${HOSTINGER_BASE}/ralion/api/admin/customers`, headersVariations[0]);
  await probeEndpoint(`${HOSTINGER_BASE}/api/admin/metrics`, headersVariations[0]);
  await probeEndpoint(`${HOSTINGER_BASE}/ralion/api/admin/metrics`, headersVariations[0]);
}

runLiveDiagnostics().catch(console.error);
