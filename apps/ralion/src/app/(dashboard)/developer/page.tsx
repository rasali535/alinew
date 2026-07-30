'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Code, Key, Webhook, BookOpen, Copy, Check, Plus, Shield, Terminal } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
}

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'failing';
}

const sampleKeys: ApiKey[] = [
  { id: 'k1', name: 'ERP Production Key', prefix: 'ralion_live_8f9a', scopes: ['read', 'write', 'webhooks'], createdAt: '2026-07-20' },
  { id: 'k2', name: 'Mobile App Staging', prefix: 'ralion_test_2b4c', scopes: ['read'], createdAt: '2026-07-24' },
];

const sampleWebhooks: WebhookItem[] = [
  { id: 'w1', url: 'https://api.kalaharimine.co.bw/webhooks/ralion', events: ['customer.created', 'order.updated'], status: 'active' },
];

export default function DeveloperPage() {
  const [keys, setKeys] = useState(sampleKeys);
  const [webhooks, setWebhooks] = useState(sampleWebhooks);
  const [activeTab, setActiveTab] = useState<'KEYS' | 'WEBHOOKS' | 'DOCS' | 'SANDBOX'>('KEYS');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(val);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Developer Platform & APIs</h1>
            <Badge variant="primary">SDK & REST API</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Manage API keys, configure webhooks, access documentation, and build custom integrations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => {
            const newK = { id: `k-${Date.now()}`, name: 'New Integration Key', prefix: 'ralion_live_' + Math.random().toString(36).slice(2, 6), scopes: ['read'], createdAt: new Date().toISOString().split('T')[0] };
            setKeys([newK, ...keys]);
          }}>
            <Plus className="w-4 h-4" /> Create API Key
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {(['KEYS', 'WEBHOOKS', 'DOCS', 'SANDBOX'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Keys Tab */}
      {activeTab === 'KEYS' && (
        <Card>
          <CardHeader><CardTitle>API Secret Keys</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Key Name</th>
                  <th className="p-4 text-left">Key Prefix</th>
                  <th className="p-4 text-left">Scopes</th>
                  <th className="p-4 text-left">Created</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {keys.map(k => (
                  <tr key={k.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-blue-400" /> {k.name}
                    </td>
                    <td className="p-4 font-mono text-zinc-400">{k.prefix}••••••••••••</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {k.scopes.map(s => <span key={s} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">{s}</span>)}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-500 font-mono">{k.createdAt}</td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(k.prefix)}>
                        {copiedKey === k.prefix ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'WEBHOOKS' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Configured Webhooks</CardTitle>
                <Button variant="outline" size="sm"><Plus className="w-3.5 h-3.5" /> Add Endpoint</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {webhooks.map(w => (
                <div key={w.id} className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-white font-bold">{w.url}</div>
                    <div className="flex gap-1 mt-1">
                      {w.events.map(ev => <span key={ev} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">{ev}</span>)}
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Docs Tab */}
      {activeTab === 'DOCS' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">REST API Quickstart</h3>
          </div>
          <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{`# 1. Fetch all organization customers
curl -X GET https://ralion.rasalilabs.com/api/v1/customers \\
  -H "Authorization: Bearer ralion_live_8f9a..." \\
  -H "Content-Type: application/json"

# Response 200 OK
{
  "data": [
    { "id": "cust_123", "name": "Kalahari Mining Ltd", "status": "active" }
  ]
}`}
          </pre>
        </Card>
      )}

      {/* Sandbox */}
      {activeTab === 'SANDBOX' && (
        <Card className="p-6">
          <CardTitle>Interactive API Console</CardTitle>
          <CardDescription className="mt-1">Test live Ralion OS endpoints directly from your browser.</CardDescription>
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">GET</span>
            <input type="text" readOnly value="https://ralion.rasalilabs.com/api/v1/customers" className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-white" />
            <Button variant="primary" size="sm">Send Request</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
