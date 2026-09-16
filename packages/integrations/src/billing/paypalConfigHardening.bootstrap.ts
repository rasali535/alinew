import 'server-only';

import { PayPalService } from './paypal.service';

const globalState = globalThis as unknown as {
  __ralionPayPalConfigHardened?: boolean;
};

if (!globalState.__ralionPayPalConfigHardened) {
  globalState.__ralionPayPalConfigHardened = true;

  // OAuth and subscription creation only require client credentials. A webhook
  // ID is required for webhook signature verification, but must not prevent a
  // customer from opening PayPal checkout if that independent setting drifts.
  PayPalService.getConfig = function hardenedPayPalConfig() {
    const isLive = process.env.PAYPAL_MODE === 'live' || process.env.PAYPAL_ENV === 'live';
    const environment: 'sandbox' | 'live' = isLive ? 'live' : 'sandbox';
    const apiBase = isLive
      ? (process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com')
      : (process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com');

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';

    if (!clientId) {
      throw new Error('[PayPalService] PAYPAL_CLIENT_ID is not configured.');
    }
    if (!clientSecret) {
      throw new Error('[PayPalService] PAYPAL_CLIENT_SECRET is not configured.');
    }

    return { clientId, clientSecret, webhookId, environment, apiBase };
  } as typeof PayPalService.getConfig;
}
