'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { CreditCard, Check, Plus, DollarSign, Download, ShieldCheck, Zap } from 'lucide-react';
import { LicenseTier } from '@ralion/auth';

interface InvoiceRow {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: 'PAID' | 'OVERDUE' | 'SENT' | 'DRAFT';
  dueDate: string;
}

const sampleInvoices: InvoiceRow[] = [
  { id: 'i1', number: 'INV-2026-001', client: 'Kalahari Mining Ltd', amount: '$45,000.00', status: 'PAID', dueDate: 'Jul 15, 2026' },
  { id: 'i2', number: 'INV-2026-002', client: 'Apex Logistics Inc', amount: '$14,200.00', status: 'OVERDUE', dueDate: 'Jul 10, 2026' },
  { id: 'i3', number: 'INV-2026-003', client: 'Gaborone Health Clinic', amount: '$12,500.00', status: 'PAID', dueDate: 'Jul 22, 2026' },
  { id: 'i4', number: 'INV-2026-004', client: 'Global Trade Corp', amount: '$8,900.00', status: 'SENT', dueDate: 'Jul 30, 2026' },
];

export default function BillingPage() {
  const [currentTier, setCurrentTier] = useState<LicenseTier>('PROFESSIONAL');
  const [invoices, setInvoices] = useState<InvoiceRow[]>(sampleInvoices);

  const statusBadges: Record<string, 'success' | 'danger' | 'primary' | 'default'> = {
    PAID: 'success',
    OVERDUE: 'danger',
    SENT: 'primary',
    DRAFT: 'default'
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Billing & License Subscriptions</h1>
            <Badge variant="primary">Phase 1 Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Invoicing, licensing plans, payment gateways (Stripe, Botswana local providers).
          </p>
        </div>

        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4" /> Issue Invoice
        </Button>
      </div>

      {/* Ralion License Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Community */}
        <Card className={`p-6 ${currentTier === 'COMMUNITY' ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}>
          <Badge variant="default">Free Plan</Badge>
          <h3 className="text-xl font-bold text-white mt-2">Community</h3>
          <p className="text-xs text-zinc-400 mt-1">For small teams getting started</p>
          <div className="mt-4 text-2xl font-black text-white">$0 <span className="text-xs text-zinc-500 font-normal">/ mo</span></div>

          <ul className="mt-6 flex flex-col gap-2.5 text-xs text-zinc-300">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 5 Users</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Basic CRM & Tasks</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 100 Mari AI Credits / mo</li>
          </ul>
        </Card>

        {/* Professional */}
        <Card className={`p-6 bg-gradient-to-b from-blue-900/20 to-zinc-900 border-blue-500/50 ${currentTier === 'PROFESSIONAL' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex items-center justify-between">
            <Badge variant="primary">Most Popular</Badge>
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white mt-2">Professional</h3>
          <p className="text-xs text-zinc-400 mt-1">Full operational automation for growing businesses</p>
          <div className="mt-4 text-2xl font-black text-white">$149 <span className="text-xs text-zinc-500 font-normal">/ mo</span></div>

          <ul className="mt-6 flex flex-col gap-2.5 text-xs text-zinc-300">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 25 Users</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Workflows</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 2,500 Mari AI Credits / mo</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Industry Module Plugins Access</li>
          </ul>

          <Button variant="primary" className="w-full mt-6" disabled={currentTier === 'PROFESSIONAL'}>
            {currentTier === 'PROFESSIONAL' ? 'Active Subscription' : 'Upgrade Plan'}
          </Button>
        </Card>

        {/* Enterprise */}
        <Card className={`p-6 ${currentTier === 'ENTERPRISE' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}>
          <Badge variant="purple">Unlimited Enterprise</Badge>
          <h3 className="text-xl font-bold text-white mt-2">Enterprise</h3>
          <p className="text-xs text-zinc-400 mt-1">Multi-branch corporations & white label</p>
          <div className="mt-4 text-2xl font-black text-white">Custom <span className="text-xs text-zinc-500 font-normal">quote</span></div>

          <ul className="mt-6 flex flex-col gap-2.5 text-xs text-zinc-300">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Branches & Users</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Custom Industry Modules</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated Mari RAG Vectors</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> White Label Branding</li>
          </ul>
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
