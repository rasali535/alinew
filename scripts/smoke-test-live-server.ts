async function runLiveServerSmokeTest() {
  console.log('\n================================================================');
  console.log('🚀 RALION OS — POST-FIX LIVE SERVER SMOKE TEST (PORT 6509)');
  console.log('================================================================\n');

  const BASE = 'http://localhost:6509/ralion';
  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, detail: string) {
    if (ok) {
      console.log(`✅ PASS: ${name}\n   └─ ${detail}\n`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}\n   └─ ${detail}\n`);
      failed++;
    }
  }

  // TEST 1 — Route /mari-ai HTML Page Load
  try {
    const res = await fetch(`${BASE}/mari-ai`);
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    report(
      'Mari AI Page Rendering',
      res.status === 200 && text.length > 500 && !text.includes('404 Not Found'),
      `Status: ${res.status} | Content-Type: ${ct} | Length: ${text.length} bytes`
    );
  } catch (err: any) {
    report('Mari AI Page Rendering', false, `Request failed: ${err.message}`);
  }

  // TEST 2 — Mari API Chat Endpoint (JSON Contract)
  try {
    const res = await fetch(`${BASE}/api/mari/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is working on my Facebook page and what creative campaign should we launch next?',
        organizationId: 'org-smoke-test-01',
      }),
    });
    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const data = (await res.json()) as any;
    const hasActions = Array.isArray(data.suggestedActions) && data.suggestedActions.length > 0;
    const routeNoTextInPath = !data.suggestedActions?.some((a: any) => typeof a.payload === 'string' && a.payload.includes(' '));
    report(
      'Mari API Chat Endpoint & Action Route Sanitization',
      res.status === 200 && isJson && data.success && routeNoTextInPath,
      `Status: ${res.status} | Content-Type: ${ct} | Answer Length: ${data.answer?.length} | Actions: ${data.suggestedActions?.length || 0} (clean routes)`
    );
  } catch (err: any) {
    report('Mari API Chat Endpoint & Action Route Sanitization', false, `Request failed: ${err.message}`);
  }

  // TEST 3 — Mari Image/Video Proxy Route (/api/mari/generate)
  try {
    const res = await fetch(`${BASE}/api/mari/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'image',
        prompt: 'Commercial technology headquarters at sunset',
        quality: 'fast',
      }),
    });
    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const data = (await res.json()) as any;
    report(
      'Mari AI Image Generation Endpoint (JSON Contract)',
      res.status === 200 && isJson && data.success && Boolean(data.url),
      `Status: ${res.status} | Content-Type: ${ct} | URL: ${data.url?.substring(0, 60)}...`
    );
  } catch (err: any) {
    report('Mari AI Image Generation Endpoint (JSON Contract)', false, `Request failed: ${err.message}`);
  }

  // TEST 4 — Growth Studio Page Rendering (/growth)
  try {
    const res = await fetch(`${BASE}/growth`);
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    report(
      'Growth Studio Page Rendering',
      res.status === 200 && text.length > 500,
      `Status: ${res.status} | Content-Type: ${ct} | Length: ${text.length} bytes`
    );
  } catch (err: any) {
    report('Growth Studio Page Rendering', false, `Request failed: ${err.message}`);
  }

  // TEST 5 — Billing API & Page Rendering
  try {
    const res = await fetch(`${BASE}/api/billing/subscription?organizationId=org-smoke-test-01`);
    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const data = (await res.json()) as any;
    report(
      'Billing API Subscription Endpoint',
      res.status === 200 && isJson && data.success,
      `Status: ${res.status} | Content-Type: ${ct} | Plan: ${data.effectivePlan?.name || data.subscription?.planId}`
    );
  } catch (err: any) {
    report('Billing API Subscription Endpoint', false, `Request failed: ${err.message}`);
  }

  // TEST 6 — CRM & Creatives Core Dashboard Routes
  try {
    const [resCrm, resCreatives, resSettings] = await Promise.all([
      fetch(`${BASE}/crm`),
      fetch(`${BASE}/creatives`),
      fetch(`${BASE}/settings`),
    ]);
    report(
      'CRM, Creatives, and Settings Core Dashboard Routes',
      resCrm.status === 200 && resCreatives.status === 200 && resSettings.status === 200,
      `CRM Status: ${resCrm.status} | Creatives Status: ${resCreatives.status} | Settings Status: ${resSettings.status}`
    );
  } catch (err: any) {
    report('CRM, Creatives, and Settings Core Dashboard Routes', false, `Request failed: ${err.message}`);
  }

  console.log('================================================================');
  console.log(`SMOKE TEST RESULTS: ${passed} / ${passed + failed} PASSED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runLiveServerSmokeTest();
