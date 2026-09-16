'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '@ralion/ui';
import { Check, ShieldCheck, Calendar, Loader2 } from 'lucide-react';
import { useOrganization } from '@ralion/auth';
import { SubscriptionPlanId, BillingCycle } from '@ralion/database';
import { authFetch } from '@/lib/api-config';

interface SubscriptionData {
  subscription: {
    id: string;
    organizationId: string;
    planId: SubscriptionPlanId;
    status: string;
    billingCycle: BillingCycle;
    provider: string;
    currentPeriodEnd: string;
    providerSubscriptionId?: string;
  };
  effectivePlan: {
    planId: SubscriptionPlanId;
    name: string;
    description: string;
    monthlyPriceUsd: number;
    monthlyCreditQuota: number;
    maxWorkspaces: number;
    maxSocialConnections: number;
    maxTeamMembers: number;
    features: Record<string, boolean>;
  };
  status: string;
  isPastDue: boolean;
  currentPeriodEnd: string;
  credits: {
    balance: number;
    monthlyQuota: number;
    reserved?: number;
    used?: number;
    updatedAt: string;
  };
}

interface TransactionRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  eventType: string;
  provider?: string;
  providerTransactionId?: string;
  description?: string;
  createdAt: string;
}

interface CreditLedgerRow {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  reason: string;
  timestamp: string;
}

const PAYPAL_PENDING_KEY = 'ralion_pending_paypal_checkout';
const billingCycle: BillingCycle = 'MONTHLY';

const PLANS: Array<{
  id: SubscriptionPlanId;
  name: string;
  price: number;
  description: string;
  badge: string;
  credits: number;
  features: string[];
}> = [
  {
    id: 'COMMUNITY',
    name: 'Community',
    price: 0,
    description: 'Core business tools for solo operators',
    badge: 'Free Forever',
    credits: 250,
    features: ['Core CRM & Tasks', '250 Monthly Credits', '1 Social Account'],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 19,
    description: 'Visual generation & social campaigns',
    badge: 'Visual AI',
    credits: 1000,
    features: ['FLUX.1 Commercial Visuals', '1,000 Monthly Credits', '3 Social Connections', 'Automated Growth Workflows'],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 49,
    description: 'Full operational automation & commercial video',
    badge: 'Full Video Power',
    credits: 5000,
    features: ['CogVideoX Commercial Reels', '5,000 Monthly Credits', '10 Social Connections', 'Advanced Market Research & BI'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 199,
    description: 'Unlimited branches, SLA & sovereign cloud',
    badge: 'Enterprise',
    credits: 25000,
    features: ['25,000 Monthly Credits', 'Unlimited Workspaces & Socials', 'Dedicated Enterprise Controls', 'Priority SLA Support'],
  },
];

export default function BillingPage() {
  const { organization, refreshOrganization } = useOrganization();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlanId | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'ledger' | 'transactions'>('plans');
  const [error, setError] = useState<string | null>(null);

  const orgName = organization?.name || 'Organization';

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, histRes] = await Promise.all([
        authFetch('/api/billing/subscription'),
        authFetch('/api/billing/history'),
      ]);

      const subBody = await subRes.json().catch(() => ({}));
      const histBody = await histRes.json().catch(() => ({}));

      if (!subRes.ok) {
        throw new Error(subBody.error || `Subscription request failed (${subRes.status}).`);
      }
      if (!histRes.ok) {
        throw new Error(histBody.error || `Billing history request failed (${histRes.status}).`);
      }

      if (subBody.success) setSubData(subBody);
      if (histBody.success) {
        setTransactions(histBody.transactions || []);
        setCreditLedger(histBody.creditHistory || []);
      }
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      setError(err?.message || 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBillingData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paypalState = params.get('paypal');
    if (!paypalState) return;

    if (paypalState === 'cancelled') {
      sessionStorage.removeItem(PAYPAL_PENDING_KEY);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (paypalState !== 'success') return;

    let pending: { subscriptionId?: string; planId?: SubscriptionPlanId; billingCycle?: BillingCycle } = {};
    try {
      pending = JSON.parse(sessionStorage.getItem(PAYPAL_PENDING_KEY) || '{}');
    } catch {
      pending = {};
    }

    const subscriptionId = params.get('subscription_id') || pending.subscriptionId || '';
    const planId = pending.planId;
    if (!subscriptionId || !planId) {
      setError('PayPal returned successfully, but the pending subscription details could not be recovered. No plan was activated.');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    let cancelled = false;
    setUpgradingPlan(planId);

    void (async () => {
      try {
        const res = await authFetch('/api/billing/paypal/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            billingCycle: 'MONTHLY',
            subscriptionId,
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'The subscription could not be activated.');
        }

        sessionStorage.removeItem(PAYPAL_PENDING_KEY);
        window.dispatchEvent(new Event('ralion_subscription_updated'));
        window.dispatchEvent(new Event('ralion_organization_updated'));
        await refreshOrganization?.();
        await fetchBillingData();
      } catch (err: any) {
        if (!cancelled) setError(`PayPal verification failed: ${err?.message || 'Unknown error'}`);
      } finally {
        if (!cancelled) {
          setUpgradingPlan(null);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshOrganization]);

  const handleServerUpgrade = async (planId: SubscriptionPlanId) => {
    if (planId === 'COMMUNITY') return;
    setUpgradingPlan(planId);
    setError(null);
    try {
      const res = await authFetch('/api/billing/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle: 'MONTHLY',
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success || !result.subscriptionId || !result.approveUrl) {
        throw new Error(result.error || 'PayPal checkout could not be created.');
      }

      sessionStorage.setItem(PAYPAL_PENDING_KEY, JSON.stringify({
        subscriptionId: result.subscriptionId,
        planId,
        billingCycle: 'MONTHLY',
        createdAt: new Date().toISOString(),
      }));
      window.location.assign(result.approveUrl);
    } catch (err: any) {
      setError(`Checkout error: ${err?.message || 'Unknown payment error'}`);
      setUpgradingPlan(null);
    }
  };

  const currentPlanId = subData?.subscription?.planId || 'COMMUNITY';
  const creditBalance = subData?.credits?.balance ?? 250;
  const creditQuota = subData?.credits?.monthlyQuota ?? 250;
  const reservedCredits = subData?.credits?.reserved ?? 0;
  const usedCredits = subData?.credits?.used ?? Math.max(0, creditQuota - creditBalance);
  const renewalDate = subData?.currentPeriodEnd
    ? new Date(subData.currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Active';

  const activePlan = useMemo(() => PLANS.find(plan => plan.id === currentPlanId) || PLANS[0], [currentPlanId]);

  if (loading && !subData) {
    return <div className="min-h-[50vh] flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading billing…</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white">Commercial Subscriptions & Billing</h1>
            <Badge variant="primary">{orgName}</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Server-verified entitlements, durable credit wallets, and authenticated PayPal subscription management.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-300"><strong className="text-white">Monthly</strong> PayPal billing</span>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Subscription</span>
            <Badge variant={subData?.isPastDue ? 'danger' : 'success'}>{subData?.status || 'ACTIVE'}</Badge>
          </div>
          <div className="text-2xl font-black text-white">{activePlan.name} Plan</div>
          <p className="text-xs text-zinc-400 mt-1">{subData?.effectivePlan?.description || activePlan.description}</p>
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Cycle: <strong className="text-zinc-200">{subData?.subscription?.billingCycle || billingCycle}</strong></span>
            <span>Gateway: <strong className="text-zinc-200 capitalize">{subData?.subscription?.provider || 'manual'}</strong></span>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-950/30 via-zinc-900 to-zinc-950 border-blue-500/30">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2"><span className="font-semibold uppercase tracking-wider text-[10px] text-blue-400">Credit Wallet</span><Badge variant="primary">Metered</Badge></div>
          <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-white">{creditBalance.toLocaleString()}</span><span className="text-xs text-zinc-400">/ {creditQuota.toLocaleString()} monthly quota</span></div>
          <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, (creditBalance / Math.max(1, creditQuota)) * 100))}%` }} /></div>
          <div className="mt-3 text-[11px] text-zinc-400 flex justify-between"><span>{usedCredits.toLocaleString()} used</span><span>{reservedCredits.toLocaleString()} reserved</span></div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2"><span className="font-semibold uppercase tracking-wider text-[10px]">Renewal Period</span><Calendar className="w-3.5 h-3.5 text-zinc-400" /></div>
          <div className="text-xl font-bold text-white">{renewalDate}</div>
          <p className="text-xs text-zinc-400 mt-1">Automatic quota refresh upon cycle completion</p>
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5 text-xs text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /><span>Tenant derived from authenticated server context</span></div>
        </Card>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto">
        <button onClick={() => setActiveTab('plans')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeTab === 'plans' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400'}`}>Subscription Plans</button>
        <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeTab === 'ledger' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400'}`}>Credit Ledger ({creditLedger.length})</button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeTab === 'transactions' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400'}`}>Payments ({transactions.length})</button>
      </div>

      {activeTab === 'plans' && <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const active = currentPlanId === plan.id;
            return <Card key={plan.id} className={`p-5 flex flex-col justify-between ${active ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}>
              <div>
                <div className="flex items-center justify-between"><Badge variant={plan.id === 'ENTERPRISE' ? 'purple' : plan.id === 'COMMUNITY' ? 'default' : 'primary'}>{plan.badge}</Badge>{active && <Badge variant="success">Active</Badge>}</div>
                <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{plan.description}</p>
                <div className="mt-4 text-2xl font-black text-white">${plan.price}<span className="text-xs text-zinc-500 font-normal"> {plan.price === 0 ? '/ forever' : '/ month'}</span></div>
                <ul className="mt-5 flex flex-col gap-2 text-xs text-zinc-300">{plan.features.map(feature => <li key={feature} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{feature}</li>)}</ul>
              </div>
              <Button variant={active ? 'outline' : 'primary'} size="sm" className="w-full mt-6" disabled={active || plan.id === 'COMMUNITY' || upgradingPlan === plan.id} onClick={() => void handleServerUpgrade(plan.id)}>
                {active ? 'Current Plan' : plan.id === 'COMMUNITY' ? 'Free Baseline' : upgradingPlan === plan.id ? 'Opening PayPal…' : `Subscribe to ${plan.name}`}
              </Button>
            </Card>;
          })}
        </div>
        {currentPlanId !== 'COMMUNITY' && <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">Paid-plan changes remain protected from accidental double billing. Existing paid subscriptions require the managed provider revision flow.</div>}
      </>}

      {activeTab === 'ledger' && <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs text-zinc-300"><thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px]"><tr><th className="p-4">Transaction ID</th><th className="p-4">Type</th><th className="p-4">Reason</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Balance</th><th className="p-4 text-right">Timestamp</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{creditLedger.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No credit transactions recorded yet.</td></tr> : creditLedger.map(item => <tr key={item.id}><td className="p-4 font-mono text-zinc-400">{item.id}</td><td className="p-4"><Badge variant={item.type === 'CONSUMPTION' ? 'default' : 'success'}>{item.type}</Badge></td><td className="p-4 text-white">{item.reason}</td><td className={`p-4 text-right font-bold ${item.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.amount > 0 ? `+${item.amount}` : item.amount}</td><td className="p-4 text-right">{item.balanceAfter}</td><td className="p-4 text-right text-zinc-400">{new Date(item.timestamp).toLocaleString()}</td></tr>)}</tbody></table></div></Card>}

      {activeTab === 'transactions' && <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs text-zinc-300"><thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px]"><tr><th className="p-4">Transaction ID</th><th className="p-4">Provider</th><th className="p-4">Status</th><th className="p-4">Description</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Date</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{transactions.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No payment transactions recorded yet.</td></tr> : transactions.map(tx => <tr key={tx.id}><td className="p-4 font-mono text-zinc-400">{tx.providerTransactionId || tx.id}</td><td className="p-4 uppercase font-bold">{tx.provider || '—'}</td><td className="p-4"><Badge variant={tx.status === 'COMPLETED' ? 'success' : tx.status === 'REFUNDED' ? 'danger' : 'primary'}>{tx.status}</Badge></td><td className="p-4 text-white">{tx.description || tx.eventType}</td><td className="p-4 text-right font-bold">{tx.currency} ${Math.abs(tx.amount).toFixed(2)}</td><td className="p-4 text-right text-zinc-400">{new Date(tx.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></Card>}
    </div>
  );
}
