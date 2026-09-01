/**
 * RALION OS — CREATE REAL PAYPAL LIVE PRODUCTS & PLANS
 * Ras Ali Labs (Pty) Ltd
 *
 * Executes against https://api-m.paypal.com
 * Never prints Client Secret or Access Tokens.
 */

import * as dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'https://api-m.paypal.com';

async function main() {
  console.log('================================================================================');
  console.log('RALION OS — PAYPAL LIVE PRODUCT & PLAN CREATION ENGINE');
  console.log('================================================================================\n');

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Error: Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
    process.exit(1);
  }

  // 1. Live OAuth Token Acquisition
  console.log('--- STEP 1: Acquiring Live OAuth 2.0 Access Token ---');
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    console.error(`❌ Token Error: ${tokenRes.status} ${tokenRes.statusText}`);
    console.error(await tokenRes.text());
    process.exit(1);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  console.log('✅ Live OAuth Token Acquired Successfully.\n');

  // 2. Check or Create Product in PayPal Catalog
  console.log('--- STEP 2: Checking / Creating Ralion OS Catalog Product ---');
  let productId = '';
  let productCreated = false;

  const productsRes = await fetch(`${API_BASE}/v1/catalogs/products?page_size=20&total_required=true`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });

  if (productsRes.ok) {
    const pData = await productsRes.json();
    const existingRalion = (pData.products || []).find((p: any) =>
      p.name?.toLowerCase().includes('ralion')
    );
    if (existingRalion) {
      productId = existingRalion.id;
      console.log(`✅ Reusing existing product: "${existingRalion.name}" (ID: ${productId})`);
    }
  }

  if (!productId) {
    console.log('Creating new product: "Ralion OS Platform"...');
    const newProductRes = await fetch(`${API_BASE}/v1/catalogs/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ralion OS Platform',
        description: 'Enterprise AI & Business Operating System Subscription Plans',
        type: 'SERVICE',
        category: 'SOFTWARE',
        image_url: 'https://rasalilabs.com/assets/images/logo.png',
        home_url: 'https://rasalilabs.com/ralion',
      }),
    });

    if (!newProductRes.ok) {
      console.error(`❌ Product creation failed: ${newProductRes.status}`);
      console.error(await newProductRes.text());
      process.exit(1);
    }

    const newProduct = await newProductRes.json();
    productId = newProduct.id;
    productCreated = true;
    console.log(`✅ Created Product: "${newProduct.name}" (ID: ${productId})\n`);
  }

  // 3. Define Plan Configurations
  const planConfigs = [
    {
      tier: 'STARTER',
      name: 'Ralion OS Starter',
      description: 'Starter tier subscription with 1,000 monthly AI credits and multi-workspace access.',
      price: '19.00',
    },
    {
      tier: 'PROFESSIONAL',
      name: 'Ralion OS Professional',
      description: 'Professional tier subscription with 5,000 monthly AI credits and video generation.',
      price: '49.00',
    },
    {
      tier: 'ENTERPRISE',
      name: 'Ralion OS Enterprise',
      description: 'Enterprise tier subscription with 25,000 monthly AI credits and sovereign cloud.',
      price: '199.00',
    },
  ];

  // 4. Query existing plans
  const existingPlansRes = await fetch(`${API_BASE}/v1/billing/plans?page_size=20&total_required=true`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  const existingPlansList = existingPlansRes.ok ? (await existingPlansRes.json()).plans || [] : [];

  const createdPlans: Array<{
    tier: string;
    planId: string;
    name: string;
    price: string;
    currency: string;
    interval: string;
    status: string;
    productId: string;
    action: string;
  }> = [];

  console.log('--- STEP 3: Creating / Verifying 3 Paid Live Billing Plans ---');
  for (const cfg of planConfigs) {
    // Check if an active plan with same name already exists
    const matchingExisting = existingPlansList.find(
      (p: any) => p.name === cfg.name && p.status === 'ACTIVE'
    );

    let planId = '';
    let action = '';

    if (matchingExisting) {
      planId = matchingExisting.id;
      action = 'REUSED_EXISTING';
      console.log(`Found existing active plan for [${cfg.tier}]: ${planId}`);
    } else {
      console.log(`Creating PayPal Live Plan: "${cfg.name}" ($${cfg.price} USD / month)...`);
      const createPayload = {
        product_id: productId,
        name: cfg.name,
        description: cfg.description,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: cfg.price,
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      const planCreateRes = await fetch(`${API_BASE}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(createPayload),
      });

      if (!planCreateRes.ok) {
        console.error(`❌ Plan creation failed for ${cfg.tier}: HTTP ${planCreateRes.status}`);
        console.error(await planCreateRes.text());
        process.exit(1);
      }

      const planData = await planCreateRes.json();
      planId = planData.id;
      action = 'NEWLY_CREATED';
      console.log(`✅ Created Live Plan [${cfg.tier}]: ${planId}`);
    }

    // Read back and verify plan
    const verifyRes = await fetch(`${API_BASE}/v1/billing/plans/${encodeURIComponent(planId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    if (!verifyRes.ok) {
      console.error(`❌ Failed to verify plan ${planId}: HTTP ${verifyRes.status}`);
      process.exit(1);
    }

    const verified = await verifyRes.json();
    const cycle = verified.billing_cycles?.[0];
    const pricing = cycle?.pricing_scheme?.fixed_price;

    createdPlans.push({
      tier: cfg.tier,
      planId,
      name: verified.name,
      price: pricing?.value || cfg.price,
      currency: pricing?.currency_code || 'USD',
      interval: `${cycle?.frequency?.interval_count || 1} ${cycle?.frequency?.interval_unit || 'MONTH'}`,
      status: verified.status,
      productId: verified.product_id || productId,
      action,
    });
  }

  // 5. Output Results Table
  console.log('\n================================================================================');
  console.log('REAL PAYPAL LIVE PLANS CREATED & VERIFIED');
  console.log('================================================================================');
  console.table(
    createdPlans.map((p) => ({
      Plan: p.name,
      'Real PayPal Plan ID': p.planId,
      Status: p.status,
      Price: `$${p.price}`,
      Currency: p.currency,
      Interval: p.interval,
      'Product ID': p.productId,
      Action: p.action,
    }))
  );

  console.log('\n================================================================================');
  console.log('COPY TO RENDER ENVIRONMENT VARIABLES:');
  console.log('================================================================================');
  const starter = createdPlans.find((p) => p.tier === 'STARTER')!;
  const pro = createdPlans.find((p) => p.tier === 'PROFESSIONAL')!;
  const ent = createdPlans.find((p) => p.tier === 'ENTERPRISE')!;

  console.log(`PAYPAL_PLAN_ID_STARTER=${starter.planId}`);
  console.log(`PAYPAL_PLAN_ID_PROFESSIONAL=${pro.planId}`);
  console.log(`PAYPAL_PLAN_ID_ENTERPRISE=${ent.planId}`);
  console.log('================================================================================\n');

  return {
    productId,
    productCreated,
    starterPlanId: starter.planId,
    proPlanId: pro.planId,
    entPlanId: ent.planId,
    plans: createdPlans,
  };
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
