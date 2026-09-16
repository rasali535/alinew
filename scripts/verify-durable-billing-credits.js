const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = read('packages/database/migrations/20260916170000_billing_credits_persistence_hardening.sql');
const catalogMigration = read('packages/database/migrations/20260916172000_subscription_plan_catalog_alignment.sql');
const checkoutReferenceMigration = read('packages/database/migrations/20260916173000_billing_checkout_references.sql');
const billing = read('packages/database/src/billingDatabase.durable.ts');
const checkoutReferences = read('packages/database/src/billingCheckoutReference.durable.ts');
const credits = read('packages/ai/src/durableTenantCredits.service.ts');
const mari = read('packages/ai/src/mariDurableCredits.bootstrap.ts');
const creative = read('packages/ai/src/creativeDurableCredits.bootstrap.ts');
const paypal = read('packages/integrations/src/billing/paypalDurable.service.ts');
const paypalOpaque = read('packages/integrations/src/billing/paypalOpaqueCheckout.bootstrap.ts');
const integrationsServer = read('packages/integrations/src/server.ts');
const createRoute = read('apps/ralion/src/app/api/billing/paypal/create-subscription/route.ts');
const verifyRoute = read('apps/ralion/src/app/api/billing/paypal/verify/route.ts');
const subscriptionRoute = read('apps/ralion/src/app/api/billing/subscription/route.ts');
const historyRoute = read('apps/ralion/src/app/api/billing/history/route.ts');
const adminCredits = read('apps/ralion/src/app/api/admin/credits/adjust/route.ts');
const billingPage = read('apps/ralion/src/app/(dashboard)/billing/page.tsx');

assert(migration.includes('ralion_claim_billing_webhook'), 'Missing durable webhook claim RPC');
assert(migration.includes('ralion_adjust_credits'), 'Missing atomic admin credit adjustment RPC');
assert(migration.includes('force row level security'), 'Billing tables must FORCE RLS');
assert(!migration.includes('Authenticated users can view subscriptions\"\n  on public.subscriptions\n  for select\n  to authenticated\n  using (true)'), 'Cross-tenant subscription read policy must not exist');
assert(catalogMigration.includes("where slug = 'starter'"), 'Starter price must be normalized in DB catalog');
assert(catalogMigration.includes('price = 19'), 'Starter DB price must match live PayPal plan');
assert(catalogMigration.includes('price = 49'), 'Professional DB price must match live PayPal plan');
assert(catalogMigration.includes('price = 199'), 'Enterprise DB price must match live PayPal plan');
assert(catalogMigration.includes("currency = 'USD'"), 'Canonical DB catalog must use PayPal USD pricing');
assert(checkoutReferenceMigration.includes('billing_checkout_references'), 'Missing durable checkout reference table');
assert(checkoutReferenceMigration.includes("reference like 'ral_sub_%'"), 'Checkout reference format must be constrained');
assert(checkoutReferenceMigration.includes('char_length(reference) <= 64'), 'Checkout references must remain safely below PayPal custom_id limits');
assert(checkoutReferenceMigration.includes('force row level security'), 'Checkout references must FORCE RLS');
assert(checkoutReferences.includes("ral_sub_${randomUUID().replace(/-/g, '')}"), 'Checkout references must be opaque random identifiers');
assert(checkoutReferences.includes("from('billing_checkout_references')"), 'Checkout reference service must persist to Supabase');
assert(billing.includes("from('subscriptions')"), 'Durable subscription service must use Supabase');
assert(billing.includes("from('payments')"), 'Durable payment service must use Supabase');
assert(credits.includes("rpc('ralion_reserve_credits'"), 'Credits must reserve atomically');
assert(credits.includes("rpc('ralion_finalize_credits'"), 'Credits must finalize atomically');
assert(mari.includes('reserveCredits'), 'Mari must reserve credits before reasoning');
assert(mari.includes('finalizeCredits'), 'Mari must finalize/release credits');
assert(creative.includes('reserveCredits'), 'Creative generation must reserve credits');
assert(creative.includes('finalizeCredits'), 'Creative generation must finalize/release credits');
assert(paypal.includes('claimWebhookEvent'), 'PayPal webhook processing must be durable/idempotent');
assert(paypal.includes('tenant metadata does not match'), 'PayPal activation must verify tenant metadata');
assert(paypal.includes('paypal_next_billing_time'), 'Completed payments must use provider-authoritative next billing time');
assert(!paypal.includes('currentPeriodEnd: addMonth(existing.currentPeriodEnd)'), 'Completed payments must not blindly extend an already-advanced billing period');
assert(paypalOpaque.includes('custom_id: billingReference'), 'PayPal custom_id must contain only the opaque billing reference');
assert(paypalOpaque.includes('resolveReference(remote.custom_id)'), 'PayPal verification must resolve checkout metadata server-side');
assert(paypalOpaque.includes('opaqueWebhookBridge'), 'PayPal webhooks must resolve opaque checkout references server-side');
assert(!paypalOpaque.includes('custom_id: JSON.stringify'), 'Opaque checkout must never send metadata JSON to PayPal');
assert(integrationsServer.includes("import './billing/paypalOpaqueCheckout.bootstrap'"), 'Opaque PayPal checkout bridge must be installed server-side');
assert(createRoute.includes('requireRalionContext'), 'PayPal create route must derive tenant from authenticated context');
assert(verifyRoute.includes('requireRalionContext'), 'PayPal verify route must derive tenant from authenticated context');
assert(subscriptionRoute.includes('DIRECT_SUBSCRIPTION_MUTATION_DISABLED'), 'Direct customer subscription mutation must be disabled');
assert(historyRoute.includes('requireRalionContext'), 'Billing history must be tenant-authenticated');
assert(adminCredits.includes('DurableTenantCreditsService.adjustCredits'), 'Admin adjustments must use durable credit RPC');
assert(!billingPage.includes('mockSubId'), 'Billing UI must not fabricate PayPal subscription IDs');
assert(billingPage.includes('approveUrl'), 'Billing UI must redirect to real PayPal approval URL');
assert(billingPage.includes("const billingCycle: BillingCycle = 'MONTHLY'"), 'Billing UI must not advertise unsupported provider cycles');

console.log('Durable billing/credits verification passed.');
