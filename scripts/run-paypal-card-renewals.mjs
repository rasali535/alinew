const baseUrl = (process.env.RALION_BACKEND_URL || 'https://ralion-dynamic-backend.onrender.com').replace(/\/$/, '');
const secret = process.env.PAYPAL_RENEWAL_CRON_SECRET;

if (!secret || secret.length < 24) {
  console.error('PAYPAL_RENEWAL_CRON_SECRET is missing or too short.');
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/billing/paypal/renew`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ limit: 25 }),
});

const text = await response.text();
let payload = {};
try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 500) }; }

if (!response.ok || payload?.success !== true) {
  console.error('PayPal renewal run failed', { status: response.status, payload });
  process.exit(1);
}

console.log('PayPal renewal run completed', {
  attempted: payload.attempted || 0,
  succeeded: payload.succeeded || 0,
  failed: payload.failed || 0,
});

if ((payload.failed || 0) > 0) process.exitCode = 2;
