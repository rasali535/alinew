'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { CreditCard, Check, Plus, DollarSign, Download, ShieldCheck, Zap } from 'lucide-react';
import { LicenseTier } from '@ralion/auth';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = "BAAGH9vviiSc0ZUHX1Zp1QX-VKI9-CLsGBCiZKif6Aj-jXwyraUkDeQVgf6ntdbN2dYgywFor7M0K5LxYQ";

interface InvoiceRow {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: 'PAID' | 'OVERDUE' | 'SENT' | 'DRAFT';
  dueDate: string;
}

const sampleInvoices: InvoiceRow[] = [];

export default function BillingPage() {
  const [currentTier, setCurrentTier] = useState<LicenseTier>('STANDARD');
  const [billingCycle, setBillingCycle] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [invoices, setInvoices] = useState<InvoiceRow[]>(sampleInvoices);

  React.useEffect(() => {
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user?.tier) setCurrentTier(user.tier.toUpperCase() as any);
        else {
          const local = typeof window !== 'undefined' ? localStorage.getItem('ralion_user_tier') : null;
          if (local) setCurrentTier(local.toUpperCase() as any);
        }
      });
    });
  }, []);

  const handleUpgrade = (tier: LicenseTier) => {
    setCurrentTier(tier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ralion_user_tier', tier);
      localStorage.setItem('ralion_billing_frequency', billingCycle);
    }
    alert(`🎉 Successfully activated ${tier} Plan (${billingCycle} billing)! Your dashboard has been upgraded.`);
  };

  const statusBadges: Record<string, 'success' | 'danger' | 'primary' | 'default'> = {
    PAID: 'success',
    OVERDUE: 'danger',
    SENT: 'primary',
    DRAFT: 'default'
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Billing & License Subscriptions</h1>
            <Badge variant="primary">Active Plans</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your subscription tier, billing frequency (Daily, Weekly, Monthly, Yearly), and payment methods.
          </p>
        </div>

        {/* Billing Frequency Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                billingCycle === cycle
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {cycle === 'DAILY' ? 'Daily' : cycle === 'WEEKLY' ? 'Weekly' : cycle === 'MONTHLY' ? 'Monthly' : 'Yearly (-20%)'}
            </button>
          ))}
        </div>
      </div>

      {/* Ralion License Subscription Tiers (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Community */}
        <Card className={`p-5 flex flex-col justify-between ${currentTier === 'COMMUNITY' ? 'border-blue-500 ring-2 ring-blue-500/30' : ''}`}>
          <div>
            <div className="flex items-center justify-between">
              <Badge variant="default">Free Forever</Badge>
              {currentTier === 'COMMUNITY' && <Badge variant="success">Active</Badge>}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Community</h3>
            <p className="text-xs text-zinc-400 mt-1">Core business tools for solo operators</p>
            <div className="mt-4 text-2xl font-black text-white">$0 <span className="text-xs text-zinc-500 font-normal">/ forever</span></div>

            <ul className="mt-5 flex flex-col gap-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Core CRM & Tasks</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 1,000 Mari AI Credits/mo</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Document Vault (5 GB)</li>
            </ul>
          </div>

          <Button
            variant={currentTier === 'COMMUNITY' ? 'outline' : 'glass'}
            size="sm"
            className="w-full mt-6"
            onClick={() => handleUpgrade('COMMUNITY')}
            disabled={currentTier === 'COMMUNITY'}
          >
            {currentTier === 'COMMUNITY' ? 'Current Plan' : 'Downgrade to Free'}
          </Button>
        </Card>

        {/* Standard (Affordable Starter-Pro) */}
        <Card className={`p-5 flex flex-col justify-between bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-900 border-amber-500/40 ${currentTier === 'STANDARD' ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/10' : ''}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Most Affordable
              </span>
              {currentTier === 'STANDARD' && <Badge variant="success">Active</Badge>}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Standard</h3>
            <p className="text-xs text-zinc-400 mt-1">Affordable starter with hints of Pro power</p>
            <div className="mt-4 text-2xl font-black text-white">
              {billingCycle === 'DAILY' ? '$1' : billingCycle === 'WEEKLY' ? '$5' : billingCycle === 'YEARLY' ? '$190' : '$19'}
              <span className="text-xs text-zinc-500 font-normal">
                {billingCycle === 'DAILY' ? ' / day' : billingCycle === 'WEEKLY' ? ' / week' : billingCycle === 'YEARLY' ? ' / yr' : ' / mo'}
              </span>
            </div>

            <ul className="mt-5 flex flex-col gap-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 5 AI Social Posts/Reels daily</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 3 Visual Automated Workflows</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> 10,000 Mari AI Credits/mo</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Standard Customer BI Reports</li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 font-bold"
            onClick={() => handleUpgrade('STANDARD')}
            disabled={currentTier === 'STANDARD'}
          >
            {currentTier === 'STANDARD' ? 'Current Plan' : `Activate Standard (${billingCycle.toLowerCase()})`}
          </Button>
        </Card>

        {/* Professional */}
        <Card className={`p-5 flex flex-col justify-between bg-gradient-to-b from-blue-900/20 via-zinc-900 to-zinc-900 border-blue-500/50 ${currentTier === 'PROFESSIONAL' ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : ''}`}>
          <div>
            <div className="flex items-center justify-between">
              <Badge variant="primary">Full Power</Badge>
              {currentTier === 'PROFESSIONAL' && <Badge variant="success">Active</Badge>}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Professional</h3>
            <p className="text-xs text-zinc-400 mt-1">Full operational automation for growing businesses</p>
            <div className="mt-4 text-2xl font-black text-white">
              {billingCycle === 'DAILY' ? '$3' : billingCycle === 'WEEKLY' ? '$15' : billingCycle === 'YEARLY' ? '$490' : '$49'}
              <span className="text-xs text-zinc-500 font-normal">
                {billingCycle === 'DAILY' ? ' / day' : billingCycle === 'WEEKLY' ? ' / week' : billingCycle === 'YEARLY' ? ' / yr' : ' / mo'}
              </span>
            </div>

            <ul className="mt-5 flex flex-col gap-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Unlimited Growth AI Campaigns</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Unlimited Workflows & Rules</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 50,000 Mari AI Credits/mo</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Advanced BI Reports & Exports</li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 font-bold"
            onClick={() => handleUpgrade('PROFESSIONAL')}
            disabled={currentTier === 'PROFESSIONAL'}
          >
            {currentTier === 'PROFESSIONAL' ? 'Current Plan' : `Upgrade to Pro (${billingCycle.toLowerCase()})`}
          </Button>
        </Card>

        {/* Enterprise */}
        <Card className={`p-5 flex flex-col justify-between ${currentTier === 'ENTERPRISE' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}>
          <div>
            <div className="flex items-center justify-between">
              <Badge variant="purple">Enterprise</Badge>
              {currentTier === 'ENTERPRISE' && <Badge variant="success">Active</Badge>}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Enterprise</h3>
            <p className="text-xs text-zinc-400 mt-1">Multi-branch corporations & sovereign cloud</p>
            <div className="mt-4 text-2xl font-black text-white">Custom <span className="text-xs text-zinc-500 font-normal">quote</span></div>

            <ul className="mt-5 flex flex-col gap-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> All Industry Plugins (Health/Trade)</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Unlimited Branches & SSO</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Dedicated SLA & Sovereign Cloud</li>
            </ul>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-6"
            onClick={() => handleUpgrade('ENTERPRISE')}
            disabled={currentTier === 'ENTERPRISE'}
          >
            {currentTier === 'ENTERPRISE' ? 'Current Plan' : 'Contact Enterprise Sales'}
          </Button>
        </Card>
      </div>

      {/* Invoicing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices & Client Billing History</CardTitle>
          <CardDescription>Integrates with Stripe, PayPal, and Botswana Payment Providers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">{inv.number}</td>
                    <td className="p-4 text-zinc-300 font-medium">{inv.client}</td>
                    <td className="p-4 font-mono text-zinc-400">{inv.dueDate}</td>
                    <td className="p-4">
                      <Badge variant={statusBadges[inv.status]}>{inv.status}</Badge>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">{inv.amount}</td>
                    <td className="p-4 text-right">
                      <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
