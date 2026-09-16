import 'server-only';
import { PayPalService, type PayPalSubscriptionCreationParams } from './paypal.service';

type PayPalDiagnosticIssue = {
  field?: string;
  issue?: string;
  description?: string;
};

export interface PayPalCreateDiagnosticResult {
  success: boolean;
  subscriptionId?: string;
  approveUrl?: string;
  error?: string;
  providerError?: {
    httpStatus: number;
    name?: string;
    message?: string;
    debugId?: string;
    issues?: PayPalDiagnosticIssue[];
  };
}

function safeString(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function createPayPalSubscriptionWithDiagnostics(
  params: PayPalSubscriptionCreationParams
): Promise<PayPalCreateDiagnosticResult> {
  const { organizationId, planId, billingCycle = 'MONTHLY', returnUrl, cancelUrl } = params;

  if (!organizationId) return { success: false, error: 'organizationId is required' };
  if (organizationId === 'ras-ali-labs') {
    return { success: false, error: 'Platform Admin organization cannot be converted to a customer PayPal subscription.' };
  }
  if (planId === 'COMMUNITY') {
    return { success: false, error: 'Community plan is free forever and does not require a paid PayPal subscription.' };
  }
  if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId)) {
    return { success: false, error: `Invalid subscription plan requested: ${planId}` };
  }
  if (billingCycle !== 'MONTHLY') {
    return { success: false, error: 'Only MONTHLY PayPal billing is currently enabled.' };
  }
  if (organizationId.length > 127) {
    return { success: false, error: 'Organization billing identifier exceeds the PayPal custom_id limit.' };
  }

  try {
    const paypalPlanId = PayPalService.getPlanId(planId);
    const token = await PayPalService.getAccessToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion';
    const payload = {
      plan_id: paypalPlanId,
      // PayPal custom_id is capped at 127 characters. Keep only the canonical,
      // server-verified tenant identifier here; plan identity is independently
      // verified from PayPal's plan_id during activation/webhook processing.
      custom_id: organizationId,
      application_context: {
        brand_name: 'Ralion OS',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl || `${appUrl}/billing?paypal=success`,
        cancel_url: cancelUrl || `${appUrl}/billing?paypal=cancelled`,
      },
    };

    const response = await fetch(`${PayPalService.getBaseUrl()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `ralion-${organizationId}-${planId}-${Date.now()}`.slice(0, 108),
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      const issues: PayPalDiagnosticIssue[] | undefined = Array.isArray(data?.details)
        ? data.details.slice(0, 5).map((detail: any): PayPalDiagnosticIssue => ({
            field: safeString(detail?.field, 200),
            issue: safeString(detail?.issue, 200),
            description: safeString(detail?.description, 500),
          }))
        : undefined;
      const providerError = {
        httpStatus: response.status,
        name: safeString(data?.name, 100),
        message: safeString(data?.message, 500),
        debugId: safeString(data?.debug_id || data?.debugId, 100),
        issues,
      };

      console.error('[PayPal Create Subscription] Provider rejected request', {
        httpStatus: providerError.httpStatus,
        name: providerError.name,
        debugId: providerError.debugId,
        issues: providerError.issues,
        planId,
        organizationId,
      });

      const issueSummary = issues?.map((item: PayPalDiagnosticIssue) => item.issue).filter(Boolean).join(', ');
      return {
        success: false,
        error: [
          `PayPal ${providerError.name || 'API_ERROR'} (HTTP ${response.status})`,
          issueSummary ? `issues: ${issueSummary}` : undefined,
          providerError.debugId ? `debug_id: ${providerError.debugId}` : undefined,
        ].filter(Boolean).join(' | '),
        providerError,
      };
    }

    const approveUrl = Array.isArray(data?.links)
      ? data.links.find((link: any) => link?.rel === 'approve')?.href
      : undefined;
    if (!data?.id || !approveUrl) {
      return { success: false, error: 'PayPal returned an incomplete subscription response.' };
    }

    return { success: true, subscriptionId: data.id, approveUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create PayPal subscription.',
    };
  }
}
