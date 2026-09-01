/**
 * RALION OS — PAYPAL LIVE PLAN & CREDENTIALS READ-ONLY VERIFICATION
 * Ras Ali Labs (Pty) Ltd
 *
 * Direct read-only audit against https://api-m.paypal.com
 * Never prints Client Secret or Access Token.
 */

import * as dotenv from 'dotenv';
dotenv.config();

interface PlanVerificationResult {
  planName: string;
  configuredId: string;
  httpStatus: number;
  exists: boolean;
  active: boolean;
  price: string;
  currency: string;
  interval: string;
  productId: string;
  errorDetails?: string;
}

async function verifyPayPalLivePlans() {
  console.log('================================================================================');
  console.log('RALION OS — REAL PAYPAL LIVE API READ-ONLY VERIFICATION');
  console.log('================================================================================\n');

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiBase = 'https://api-m.paypal.com';

  if (!clientId || !clientSecret) {
    console.error('❌ Error: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in environment.');
    process.exit(1);
  }

  console.log(`[Config] Live API Endpoint: ${apiBase}`);
  console.log(`[Config] Client ID: ${clientId.substring(0, 8)}...${clientId.substring(clientId.length - 6)}`);
  console.log(`[Config] Client Secret: [CONFIGURED - NEVER PRINTED]\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. LIVE OAUTH TOKEN ACQUISITION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- STEP 1: Acquiring Live OAuth 2.0 Access Token ---');
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  let accessToken = '';
  let tokenHttpStatus = 0;
  let tokenStatusText = '';

  try {
    const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    tokenHttpStatus = tokenRes.status;
    tokenStatusText = tokenRes.statusText;

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error(`❌ OAuth Token Request Failed: HTTP ${tokenHttpStatus} ${tokenStatusText}`);
      console.error(`   Details: ${errBody}`);
      return {
        tokenSuccess: false,
        tokenHttpStatus,
        tokenError: errBody,
        plans: [],
      };
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    console.log(`✅ Live OAuth Token Request: HTTP ${tokenHttpStatus} ${tokenStatusText} (Token acquired successfully)\n`);
  } catch (err: any) {
    console.error(`❌ Network error contacting ${apiBase}:`, err.message);
    return {
      tokenSuccess: false,
      tokenError: err.message,
      plans: [],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. VERIFY CONFIGURED PLAN IDs
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- STEP 2: Verifying Configured Plan IDs via GET /v1/billing/plans/{id} ---');
  const plansToVerify = [
    {
      name: 'Starter ($19/mo)',
      id: process.env.PAYPAL_PLAN_ID_STARTER || 'P-RALION-STARTER-19',
      expectedPrice: '19.00',
    },
    {
      name: 'Professional ($49/mo)',
      id: process.env.PAYPAL_PLAN_ID_PROFESSIONAL || 'P-RALION-PRO-49',
      expectedPrice: '49.00',
    },
    {
      name: 'Enterprise ($199/mo)',
      id: process.env.PAYPAL_PLAN_ID_ENTERPRISE || 'P-RALION-ENT-199',
      expectedPrice: '199.00',
    },
  ];

  const results: PlanVerificationResult[] = [];

  for (const plan of plansToVerify) {
    console.log(`\nChecking [${plan.name}] ID: "${plan.id}"...`);
    try {
      const planRes = await fetch(`${apiBase}/v1/billing/plans/${encodeURIComponent(plan.id)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const httpStatus = planRes.status;
      if (!planRes.ok) {
        const errorText = await planRes.text();
        let parsedErr = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedErr = jsonErr.message || jsonErr.name || errorText;
        } catch {}

        console.log(`   └─ HTTP ${httpStatus}: ${parsedErr}`);
        results.push({
          planName: plan.name,
          configuredId: plan.id,
          httpStatus,
          exists: false,
          active: false,
          price: 'N/A',
          currency: 'N/A',
          interval: 'N/A',
          productId: 'N/A',
          errorDetails: parsedErr,
        });
      } else {
        const planData = await planRes.json();
        const pricingTier = planData.billing_cycles?.[0]?.pricing_scheme?.fixed_price;
        const cycle = planData.billing_cycles?.[0]?.frequency;

        console.log(`   └─ HTTP ${httpStatus} OK | Status: ${planData.status} | Price: ${pricingTier?.currency_code} ${pricingTier?.value}`);
        results.push({
          planName: plan.name,
          configuredId: plan.id,
          httpStatus,
          exists: true,
          active: planData.status === 'ACTIVE',
          price: pricingTier?.value || 'N/A',
          currency: pricingTier?.currency_code || 'N/A',
          interval: cycle ? `${cycle.interval_count} ${cycle.interval_unit}` : 'N/A',
          productId: planData.product_id || 'N/A',
        });
      }
    } catch (err: any) {
      console.log(`   └─ Error: ${err.message}`);
      results.push({
        planName: plan.name,
        configuredId: plan.id,
        httpStatus: 0,
        exists: false,
        active: false,
        price: 'N/A',
        currency: 'N/A',
        interval: 'N/A',
        productId: 'N/A',
        errorDetails: err.message,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DISCOVER EXISTING PLANS IN LIVE ACCOUNT (IF ANY)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- STEP 3: Querying Existing Plans in PayPal Live Account ---');
  try {
    const listRes = await fetch(`${apiBase}/v1/billing/plans?page_size=20&total_required=true`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const existingPlans = listData.plans || [];
      console.log(`Found ${existingPlans.length} plan(s) in Live merchant account:`);
      if (existingPlans.length === 0) {
        console.log('   (No billing plans currently exist in this PayPal Live merchant account)');
      } else {
        for (const p of existingPlans) {
          console.log(`   - ID: ${p.id} | Name: "${p.name}" | Status: ${p.status} | Product ID: ${p.product_id}`);
        }
      }
    } else {
      console.log(`   List plans returned HTTP ${listRes.status}`);
    }
  } catch (err: any) {
    console.log(`   Could not list plans: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SUMMARY TABLE
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================================');
  console.log('LIVE PLAN VERIFICATION REPORT TABLE');
  console.log('================================================================================');
  console.table(
    results.map((r) => ({
      Plan: r.planName,
      'PayPal Plan ID': r.configuredId,
      'HTTP Status': r.httpStatus,
      Exists: r.exists ? 'YES' : 'NO (404)',
      ACTIVE: r.active ? 'YES' : 'NO',
      Price: r.price,
      Currency: r.currency,
      Interval: r.interval,
    }))
  );

  return {
    tokenSuccess: true,
    tokenHttpStatus,
    plans: results,
  };
}

verifyPayPalLivePlans().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
