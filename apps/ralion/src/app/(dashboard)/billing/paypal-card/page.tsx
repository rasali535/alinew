'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

interface PayPalCardFields {
  isEligible(): boolean;
  NameField(): { render(selector: string): Promise<void> | void };
  NumberField(): { render(selector: string): Promise<void> | void };
  ExpiryField(): { render(selector: string): Promise<void> | void };
  CVVField(): { render(selector: string): Promise<void> | void };
  submit(): Promise<any>;
}

declare global {
  interface Window {
    paypal?: {
      CardFields(options: Record<string, any>): PayPalCardFields;
    };
  }
}

const ALLOWED_PLANS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function loadPayPalSdk(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal?.CardFields) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-ralion-paypal-card-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load PayPal secure card fields.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=card-fields&currency=USD&intent=capture`;
    script.async = true;
    script.dataset.ralionPaypalCardSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load PayPal secure card fields.'));
    document.head.appendChild(script);
  });
}

export default function PayPalCardCheckoutPage() {
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardFieldsRef = useRef<PayPalCardFields | null>(null);

  const checkout = useMemo(() => {
    if (typeof window === 'undefined') return { orderId: '', planId: '' };
    const query = new URLSearchParams(window.location.search);
    return {
      orderId: String(query.get('orderId') || ''),
      planId: String(query.get('plan') || '').toUpperCase(),
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const initialize = async () => {
      try {
        if (!checkout.orderId || !ALLOWED_PLANS.includes(checkout.planId)) {
          throw new Error('This checkout link is invalid or incomplete. Return to Billing and choose a plan again.');
        }

        const configResponse = await authFetch('/api/billing/paypal/card-config');
        const config = await configResponse.json().catch(() => ({}));
        if (!configResponse.ok || !config.success || !config.clientId) {
          throw new Error(config.error || 'PayPal card checkout is not available right now.');
        }
        await loadPayPalSdk(String(config.clientId));
        if (disposed || !window.paypal?.CardFields) return;

        const fields = window.paypal.CardFields({
          createOrder: async () => checkout.orderId,
          onApprove: async (data: any) => {
            if (disposed) return;
            setProcessing(true);
            setError(null);
            try {
              const captureResponse = await authFetch('/api/billing/paypal/card-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: String(data?.orderID || checkout.orderId) }),
              });
              const capture = await captureResponse.json().catch(() => ({}));
              if (!captureResponse.ok || !capture.success) {
                throw new Error(capture.error || 'Your payment could not be completed.');
              }
              sessionStorage.removeItem('ralion_pending_paypal_checkout');
              window.dispatchEvent(new Event('ralion_subscription_updated'));
              window.dispatchEvent(new Event('ralion_organization_updated'));
              window.location.assign('/ralion/billing?card=success');
            } catch (captureError: any) {
              setProcessing(false);
              setError(captureError?.message || 'Payment capture failed. No duplicate charge will be created by retrying.');
            }
          },
          onCancel: () => {
            if (!disposed) setError('Card verification was cancelled. No completed payment was recorded.');
          },
          onError: (paypalError: any) => {
            console.error('[PayPal Card Fields]', paypalError);
            if (!disposed) {
              setProcessing(false);
              setError('PayPal could not process the card. Check the card details or try another card.');
            }
          },
        });

        if (!fields.isEligible()) {
          throw new Error('PayPal card fields are not eligible for this browser or merchant account.');
        }
        cardFieldsRef.current = fields;
        await Promise.all([
          Promise.resolve(fields.NameField().render('#paypal-card-name')),
          Promise.resolve(fields.NumberField().render('#paypal-card-number')),
          Promise.resolve(fields.ExpiryField().render('#paypal-card-expiry')),
          Promise.resolve(fields.CVVField().render('#paypal-card-cvv')),
        ]);
        if (!disposed) setReady(true);
      } catch (initializationError: any) {
        if (!disposed) setError(initializationError?.message || 'Unable to initialize secure card checkout.');
      }
    };
    void initialize();
    return () => { disposed = true; };
  }, [checkout.orderId, checkout.planId]);

  const submit = async () => {
    if (!cardFieldsRef.current || !ready || processing) return;
    setProcessing(true);
    setError(null);
    try {
      await cardFieldsRef.current.submit();
    } catch (submitError: any) {
      setProcessing(false);
      setError(submitError?.message || 'Please check your card details and try again.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
              <ShieldCheck className="h-4 w-4" /> Secure Ralion checkout
            </div>
            <h1 className="text-2xl font-black text-white">Activate {checkout.planId || 'your'} plan</h1>
            <p className="mt-1 text-sm text-zinc-400">Your card is entered directly into PayPal-hosted secure fields and is never stored by Ralion.</p>
          </div>
          <CreditCard className="h-8 w-8 text-zinc-500" />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        )}

        <div className="grid gap-4">
          <label className="grid gap-2 text-xs font-semibold text-zinc-300">
            Name on card
            <div id="paypal-card-name" className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3" />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-zinc-300">
            Card number
            <div id="paypal-card-number" className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-xs font-semibold text-zinc-300">
              Expiry
              <div id="paypal-card-expiry" className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3" />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-zinc-300">
              CVV
              <div id="paypal-card-cvv" className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3" />
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={!ready || processing}
          onClick={submit}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          {processing ? 'Securing payment…' : ready ? 'Pay securely & activate' : 'Loading secure card fields…'}
        </button>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs leading-5 text-zinc-400">
          By activating the plan you authorize the displayed monthly Ralion subscription charge and future monthly renewals to this saved payment method until cancellation. 3-D Secure may be requested by your bank when required.
        </div>
      </div>
    </div>
  );
}
