'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@ralion/ui';
import { Users, DollarSign, TrendingUp, AlertTriangle, Shield, Activity, Search, ChevronDown } from 'lucide-react';

// Ras Ali Labs internal admin — view all customers, manage subscriptions, issue licenses

const customers = [
  { id: 'c1', org: 'Kalahari Mining Ltd', owner: 'Kabo Molefe', email: 'kabo@kalaharimine.co.bw', plan: 'enterprise', status: 'active', mrr: 2500, users: 24, since: 'Jan 2026' },
  { id: 'c2', org: 'Doves Funeral Group', owner: 'Thabo Sithole', email: 'thabo@doves.co.bw', plan: 'professional', status: 'active', mrr: 999, users: 8, since: 'Mar 2026' },
  { id: 'c3', org: 'Pameltex Psychosocial', owner: 'Dr. Lesego Moagi', email: 'lesego@pameltex.co.bw', plan: 'professional', status: 'trialing', mrr: 0, users: 3, since: 'Jul 2026' },
  { id: 'c4', org: 'Smith & Co Enterprises', owner: 'James Smith', email: 'james@smithco.bw', plan: 'community', status: 'active', mrr: 0, users: 2, since: 'Jun 2026' },
  { id: 'c5', org: 'TransAfrica Freight', owner: 'Mpho Dlamini', email: 'mpho@transafrica.bw', plan: 'professional', status: 'past_due', mrr: 999, users: 11, since: 'Feb 2026' },
];

const planBadge: Record<string, any> = { enterprise: 'purple', professional: 'primary', community: 'default' };
const statusBadge: Record<string, any> = { active: 'success', trialing: 'warning', past_due: 'danger', cancelled: 'default' };

const stats = [
  { label: 'Total Organizations', value: '5', change: '+2 this month', icon: Users, color: 'blue' },
  { label: 'Monthly Recurring Revenue', value: 'BWP 4,498', change: '+BWP 999 MoM', icon: DollarSign, color: 'emerald' },
  { label: 'Active Subscriptions', value: '4', change: '1 trialing', icon: TrendingUp, color: 'purple' },
  { label: 'Past Due / At Risk', value: '1', change: 'Needs attention', icon: AlertTriangle, color: 'amber' },
];

export default function AdminBillingPage() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);

  const filtered = customers.filter(c =>
    c.org.toLowerCase().includes(search.toLowerCase()) ||
    c.owner.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Admin Header */}
      <div className="border-b border-red-900/30 bg-red-950/20 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-400" />
            <span className="font-black text-sm text-white">Ras Ali Labs Admin</span>
            <Badge variant="danger" className="text-[10px]">INTERNAL</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> All systems operational
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black text-white">Billing Management</h1>
          <p className="text-xs text-zinc-400 mt-1">View all customers, manage subscriptions, and issue licenses.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between">
                <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                <span className="text-[10px] text-zinc-500">{s.change}</span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-3">{s.label}</div>
              <div className="text-xl font-black text-white mt-0.5">{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Customer Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Customers</CardTitle>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="pl-8 pr-4 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Organization</th>
                  <th className="p-4 text-left">Owner</th>
                  <th className="p-4 text-left">Plan</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">MRR</th>
                  <th className="p-4 text-left">Users</th>
                  <th className="p-4 text-left">Since</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                    <td className="p-4 font-bold text-white">{c.org}</td>
                    <td className="p-4">
                      <div>{c.owner}</div>
                      <div className="text-zinc-500 font-mono text-[10px]">{c.email}</div>
                    </td>
                    <td className="p-4"><Badge variant={planBadge[c.plan]} className="capitalize">{c.plan}</Badge></td>
                    <td className="p-4"><Badge variant={statusBadge[c.status]}>{c.status.replace('_', ' ')}</Badge></td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      {c.mrr > 0 ? `BWP ${c.mrr.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-4 text-zinc-300">{c.users}</td>
                    <td className="p-4 text-zinc-500">{c.since}</td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setSelectedCustomer(c); }}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Slide-over Customer Panel */}
      {selectedCustomer && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
          <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <div>
              <h2 className="font-black text-white text-sm">{selectedCustomer.org}</h2>
              <p className="text-[11px] text-zinc-400">{selectedCustomer.owner} · {selectedCustomer.email}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="text-zinc-400 hover:text-white text-xl">✕</button>
          </div>
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase">Plan</div>
                <Badge variant={planBadge[selectedCustomer.plan]} className="mt-1 capitalize">{selectedCustomer.plan}</Badge>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase">Status</div>
                <Badge variant={statusBadge[selectedCustomer.status]} className="mt-1">{selectedCustomer.status.replace('_', ' ')}</Badge>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase">MRR</div>
                <div className="text-emerald-400 font-black text-sm mt-1">{selectedCustomer.mrr > 0 ? `BWP ${selectedCustomer.mrr}` : 'Free'}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase">Users</div>
                <div className="text-white font-black text-sm mt-1">{selectedCustomer.users}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="sm">Upgrade Plan</Button>
              <Button variant="outline" size="sm">Issue License Key</Button>
              <Button variant="outline" size="sm">View Audit Logs</Button>
              {selectedCustomer.status === 'past_due' && (
                <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/40">Mark as Paid</Button>
              )}
              <Button variant="outline" size="sm" className="text-red-400 border-red-500/40">Suspend Account</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
