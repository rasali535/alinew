'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Package, Plus, ShoppingCart, Star, Sparkles, ChevronRight, TrendingUp, Globe, FileText } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  country: string;
  category: string;
  status: 'active' | 'inactive';
  rating: number;
  ordersCount: number;
}

interface TradeProduct {
  id: string;
  name: string;
  supplier: string;
  category: string;
  unitPrice: number;
  currency: string;
  stockQty: number;
  status: 'active' | 'out_of_stock';
}

interface Order {
  id: string;
  orderNumber: string;
  supplier: string;
  totalAmount: number;
  status: 'draft' | 'submitted' | 'confirmed' | 'delivered';
  items: number;
  expectedDelivery: string;
}

const suppliers: Supplier[] = [
  { id: 's1', name: 'AgriSouth Producers', country: 'South Africa', category: 'Agriculture', status: 'active', rating: 4.7, ordersCount: 12 },
  { id: 's2', name: 'Zambia Copper Exports', country: 'Zambia', category: 'Minerals', status: 'active', rating: 4.4, ordersCount: 8 },
  { id: 's3', name: 'China Wholesale Direct', country: 'China', category: 'Electronics', status: 'active', rating: 4.1, ordersCount: 22 },
  { id: 's4', name: 'Kenya Maize Board', country: 'Kenya', category: 'Agriculture', status: 'inactive', rating: 3.8, ordersCount: 3 },
];

const products: TradeProduct[] = [
  { id: 'p1', name: 'Grade A Maize (50kg)', supplier: 'AgriSouth Producers', category: 'Agriculture', unitPrice: 280, currency: 'BWP', stockQty: 500, status: 'active' },
  { id: 'p2', name: 'Copper Wire Bundle (100m)', supplier: 'Zambia Copper Exports', category: 'Minerals', unitPrice: 1200, currency: 'BWP', stockQty: 0, status: 'out_of_stock' },
  { id: 'p3', name: 'LED Lighting Kit Commercial', supplier: 'China Wholesale Direct', category: 'Electronics', unitPrice: 650, currency: 'BWP', stockQty: 45, status: 'active' },
];

const orders: Order[] = [
  { id: 'o1', orderNumber: 'ORD-2026-001', supplier: 'AgriSouth Producers', totalAmount: 140000, status: 'confirmed', items: 3, expectedDelivery: 'Aug 5, 2026' },
  { id: 'o2', orderNumber: 'ORD-2026-002', supplier: 'China Wholesale Direct', totalAmount: 32500, status: 'submitted', items: 5, expectedDelivery: 'Aug 15, 2026' },
  { id: 'o3', orderNumber: 'ORD-2026-003', supplier: 'Zambia Copper Exports', totalAmount: 86400, status: 'draft', items: 2, expectedDelivery: 'TBC' },
];

const orderStatusBadge: Record<string, any> = {
  draft: 'default',
  submitted: 'primary',
  confirmed: 'success',
  in_transit: 'warning',
  delivered: 'success',
};

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS' | 'PRODUCTS' | 'MARI_AI'>('ORDERS');
  const [mariQuery, setMariQuery] = useState('');
  const [mariResponse, setMariResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleMariAsk = () => {
    if (!mariQuery.trim()) return;
    setIsAsking(true);
    setTimeout(() => {
      setMariResponse(`📦 Mari Trade Intelligence:\n\n"${mariQuery}"\n\nTrade Summary:\n• 3 active orders totalling BWP 258,900\n• Top supplier: China Wholesale Direct (22 orders, 4.1★)\n• Out of stock: Copper Wire Bundle — contact Zambia Copper Exports\n\nInsights:\n• ORD-2026-001 (BWP 140,000) confirmed with AgriSouth — delivery Aug 5\n• ORD-2026-003 still in draft — recommend submission to lock pricing\n• Maize stock sufficient for 6 weeks at current consumption rate\n\nRecommendation:\n1. Submit ORD-2026-003 before Aug 1 to avoid price increase\n2. Reorder Copper Wire Bundle — current stock: 0\n3. Consider qualifying Kenya Maize Board as backup supplier`);
      setIsAsking(false);
    }, 1100);
  };

  const totalPipeline = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Trade</h1>
            <Badge variant="warning">Commerce Module</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Supplier management, product catalogue, procurement orders, and AI trade intelligence.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> New Order</Button>
          <Button variant="outline" size="sm"><Package className="w-4 h-4" /> Add Product</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Suppliers', value: suppliers.filter(s => s.status === 'active').length.toString(), icon: '🤝' },
          { label: 'Products', value: products.length.toString(), icon: '📦' },
          { label: 'Orders in Pipeline', value: orders.length.toString(), icon: '📋' },
          { label: 'Total Pipeline Value', value: `BWP ${(totalPipeline / 1000).toFixed(0)}k`, icon: '💰' },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="text-xl">{s.icon}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">{s.label}</div>
            <div className="text-xl font-black text-white mt-0.5">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {(['ORDERS', 'SUPPLIERS', 'PRODUCTS', 'MARI_AI'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders */}
      {activeTab === 'ORDERS' && (
        <div className="flex flex-col gap-3">
          {orders.map(o => (
            <Card key={o.id} className="p-5 hover:border-blue-500/30 cursor-pointer transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{o.orderNumber}</span>
                    <Badge variant={orderStatusBadge[o.status]}>{o.status}</Badge>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-1">{o.supplier}</h3>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{o.items} item{o.items > 1 ? 's' : ''} · Expected: {o.expectedDelivery}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-white text-lg">BWP {o.totalAmount.toLocaleString()}</div>
                  <Button variant="outline" size="sm" className="mt-2">View Order</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Suppliers */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map(s => (
            <Card key={s.id} className="p-5 hover:border-blue-500/30 cursor-pointer transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{s.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                    <Globe className="w-3 h-3" /> {s.country}
                    <span className="mx-1 text-zinc-700">·</span>
                    {s.category}
                  </div>
                </div>
                <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                <span className="text-amber-400 font-bold">⭐ {s.rating}</span>
                <span>{s.ordersCount} orders</span>
                <span className="ml-auto text-blue-400 font-semibold">View Profile →</span>
              </div>
            </Card>
          ))}
          <button className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 transition-all">
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add Supplier</span>
          </button>
        </div>
      )}

      {/* Products */}
      {activeTab === 'PRODUCTS' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-left">Supplier</th>
                  <th className="p-4 text-left">Unit Price</th>
                  <th className="p-4 text-left">Stock</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">{p.name}</td>
                    <td className="p-4 text-zinc-400">{p.supplier}</td>
                    <td className="p-4 font-mono text-emerald-400 font-bold">{p.currency} {p.unitPrice.toLocaleString()}</td>
                    <td className="p-4 text-zinc-300">{p.stockQty} units</td>
                    <td className="p-4"><Badge variant={p.status === 'active' ? 'success' : 'danger'}>{p.status.replace('_', ' ')}</Badge></td>
                    <td className="p-4"><Button variant="outline" size="sm">Order</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Mari AI */}
      {activeTab === 'MARI_AI' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white"><Sparkles className="w-4 h-4" /></div>
                <div><CardTitle>Mari Trade Intelligence</CardTitle><CardDescription>Procurement insights, supplier analysis, and document verification</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {['Summarize my trade pipeline', 'Which suppliers need reorders?', 'Check if ORD-2026-003 documents are complete', 'Find best supplier for maize exports'].map((p, i) => (
                <button key={i} onClick={() => setMariQuery(p)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white text-left transition-all">{p}</button>
              ))}
              <textarea rows={2} value={mariQuery} onChange={e => setMariQuery(e.target.value)} placeholder="Ask Mari about your trade operations..." className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none" />
              <Button variant="primary" size="sm" onClick={handleMariAsk} className="w-full justify-center">
                {isAsking ? 'Analysing...' : <><Sparkles className="w-3.5 h-3.5" /> Ask Mari</>}
              </Button>
            </CardContent>
          </Card>
          {mariResponse && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mari Trade Report</CardTitle></CardHeader>
              <CardContent><pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{mariResponse}</pre></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
