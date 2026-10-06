const assert = require('node:assert/strict');
const fs = require('node:fs');

const billing = fs.readFileSync('apps/ralion/src/app/(dashboard)/billing/page.tsx', 'utf8');
const orderRoute = fs.readFileSync('apps/ralion/src/app/api/billing/paypal/card-order/route.ts', 'utf8');
const captureRoute = fs.readFileSync('apps/ralion/src/app/api/billing/paypal/card-capture/route.ts', 'utf8');
const webhookRoute = fs.readFileSync('apps/ralion/src/app/api/billing/paypal/webhook/route.ts', 'utf8');
const cardService = fs.readFileSync('packages/integrations/src/billing/paypalCardVault.service.ts', 'utf8');

const upgradeStart = billing.indexOf('const handleServerUpgrade');
const upgradeEnd = billing.indexOf('const currentPlanId', upgradeStart);
const upgradeBlock = billing.slice(upgradeStart, upgradeEnd);

assert.match(upgradeBlock, /\/api\/billing\/paypal\/card-order/);
assert.doesNotMatch(upgradeBlock, /\/api\/billing\/paypal\/create-subscription/);
assert.match(upgradeBlock, /\/ralion\/billing\/paypal-card\?orderId=/);
assert.match(upgradeBlock, /checkoutMode: 'paypal_card_vault'/);

assert.match(orderRoute, /PLATFORM_ADMIN_BILLING_PROTECTED/);
assert.match(captureRoute, /PLATFORM_ADMIN_BILLING_PROTECTED/);
assert.match(orderRoute, /workspaceId: ctx\.workspace\.id/);

assert.match(cardService, /PayPal-Request-Id': checkout\.reference/);
assert.match(cardService, /store_in_vault: 'ON_SUCCESS'/);
assert.match(cardService, /SCA_WHEN_REQUIRED/);
assert.match(cardService, /PayPal-Request-Id': \x60\$\{billingReference\}-capture\x60/);

assert.match(captureRoute, /recordTransaction/);
assert.match(captureRoute, /PAYPAL_CARD_INITIAL_PAYMENT_COMPLETED/);
assert.match(captureRoute, /DurableTenantCreditsService\.syncWallet/);
assert.match(captureRoute, /existing\.metadata\?\.paypalCaptureId === result\.captureId/);

assert.match(webhookRoute, /verifyWebhookSignature/);
assert.match(webhookRoute, /processVaultWebhook/);

console.log('PASS: Billing uses guarded PayPal card-vault capture with durable payment, credit sync, and signed webhook processing.');
