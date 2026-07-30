'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { ShoppingBag, Search, Sparkles, Download, Check, Star, Code, Layers, Bot, FileCode } from 'lucide-react';

interface MarketplaceItem {
  id: string;
  title: string;
  type: 'module' | 'integration' | 'agent' | 'template';
  category: string;
  description: string;
  author: string;
  price: string;
  rating: number;
  downloads: number;
  icon: string;
  installed: boolean;
}

const initialItems: MarketplaceItem[] = [
  { id: 'm1', title: 'Ralion HR & Payroll', type: 'module', category: 'HR', description: 'Complete staff management, leave tracking, and Botswana BURS tax-ready payroll.', author: 'Ras Ali Labs', price: 'BWP 499/mo', rating: 4.9, downloads: 128, icon: '👥', installed: false },
  { id: 'm2', title: 'Sage & Xero Accounting Sync', type: 'integration', category: 'Finance', description: 'Bi-directional financial sync with Xero and Sage Pastel Accounting.', author: 'Ras Ali Labs', price: 'BWP 199/mo', rating: 4.8, downloads: 210, icon: '💸', installed: true },
  { id: 'm3', title: 'Mari Executive Advisor Agent', type: 'agent', category: 'AI', description: 'Autonomous CEO/CFO advisory agent for automated daily strategic intelligence.', author: 'Mari AI Core', price: 'Free', rating: 5.0, downloads: 450, icon: '🧠', installed: true },
  { id: 'm4', title: 'Government Case Workflow Template', type: 'template', category: 'Public Sector', description: 'Pre-configured workflow and form templates for public sector citizen request processing.', author: 'Ras Ali Labs', price: 'Free', rating: 4.9, downloads: 85, icon: '🏛️', installed: false },
  { id: 'm5', title: 'WhatsApp Business Connector', type: 'integration', category: 'Communication', description: 'Automated CRM customer messages and order notifications via WhatsApp API.', author: 'TradeGrid Devs', price: 'BWP 299/mo', rating: 4.7, downloads: 312, icon: '💬', installed: false },
  { id: 'm6', title: 'Ralion Inventory & Warehouse', type: 'module', category: 'Supply Chain', description: 'Barcode scanning, stock levels, multi-warehouse transfer management.', author: 'Ras Ali Labs', price: 'BWP 399/mo', rating: 4.8, downloads: 174, icon: '📦', installed: false },
];

export default function MarketplacePage() {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'module' | 'integration' | 'agent' | 'template'>('ALL');

  const toggleInstall = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, installed: !i.installed } : i));
  };

  const filtered = items.filter(i => {
    const matchesFilter = activeFilter === 'ALL' || i.type === activeFilter;
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Marketplace</h1>
            <Badge variant="purple">Phase 8 Ecosystem</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Discover third-party modules, AI agents, integrations, and business templates.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search extensions..."
            className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {[
          { label: 'All Items', value: 'ALL' },
          { label: 'Modules', value: 'module' },
          { label: 'Integrations', value: 'integration' },
          { label: 'AI Agents', value: 'agent' },
          { label: 'Templates', value: 'template' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === tab.value ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <Card key={item.id} className="p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
            <div>
              <div className="flex items-start justify-between">
                <div className="text-3xl p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform">{item.icon}</div>
                <Badge variant={item.type === 'agent' ? 'purple' : item.type === 'module' ? 'primary' : 'default'} className="uppercase text-[9px]">
                  {item.type}
                </Badge>
              </div>
              <h3 className="font-bold text-white text-sm mt-3">{item.title}</h3>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-3">
                <span className="text-amber-400 font-bold flex items-center gap-1">⭐ {item.rating}</span>
                <span>{item.downloads} installs</span>
                <span className="font-mono text-zinc-300 font-semibold">{item.price}</span>
              </div>
              <Button
                variant={item.installed ? 'outline' : 'primary'}
                size="sm"
                className="w-full justify-center"
                onClick={() => toggleInstall(item.id)}
              >
                {item.installed ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Active</> : <><Download className="w-3.5 h-3.5" /> Install Extension</>}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
