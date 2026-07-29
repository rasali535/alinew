'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Truck, Plus, MapPin, User, AlertTriangle, CheckCircle2, Clock, Package, Sparkles, FileText, ChevronRight } from 'lucide-react';

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  type: string;
  status: 'active' | 'maintenance' | 'unavailable';
  driver: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseExpiry: string;
  status: 'active' | 'off_duty';
  deliveries: number;
  rating: number;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  customer: string;
  origin: string;
  destination: string;
  status: 'created' | 'in_transit' | 'at_customs' | 'customs_cleared' | 'delivered';
  driver: string;
  vehicle: string;
  weightKg: number;
  customsCleared: boolean;
}

const vehicles: Vehicle[] = [
  { id: 'v1', registration: 'B 412 ABN', make: 'Volvo', model: 'FH16', type: 'truck', status: 'active', driver: 'Emanuel Ndlovu' },
  { id: 'v2', registration: 'B 887 CDF', make: 'Mercedes', model: 'Actros', type: 'truck', status: 'active', driver: 'Thabo Mokoena' },
  { id: 'v3', registration: 'B 101 XYZ', make: 'Isuzu', model: 'NPR', type: 'van', status: 'maintenance', driver: 'Unassigned' },
];

const drivers: Driver[] = [
  { id: 'd1', name: 'Emanuel Ndlovu', phone: '+267 73556677', licenseExpiry: '2027-03-15', status: 'active', deliveries: 248, rating: 4.8 },
  { id: 'd2', name: 'Thabo Mokoena', phone: '+267 71223344', licenseExpiry: '2026-11-20', status: 'active', deliveries: 195, rating: 4.6 },
  { id: 'd3', name: 'Kefilwe Sello', phone: '+267 72334455', licenseExpiry: '2028-01-08', status: 'off_duty', deliveries: 122, rating: 4.9 },
];

const shipments: Shipment[] = [
  { id: 's1', trackingNumber: 'SHP-9901AB', customer: 'Kalahari Mining Ltd', origin: 'Gaborone Depot', destination: 'Pioneer Border Post', status: 'in_transit', driver: 'Emanuel Ndlovu', vehicle: 'B 412 ABN', weightKg: 24500, customsCleared: false },
  { id: 's2', trackingNumber: 'SHP-9902CD', customer: 'Smith & Co Enterprises', origin: 'Lobatse Warehouse', destination: 'Johannesburg Hub', status: 'customs_cleared', driver: 'Thabo Mokoena', vehicle: 'B 887 CDF', weightKg: 8200, customsCleared: true },
  { id: 's3', trackingNumber: 'SHP-9903EF', customer: 'TransAfrica Freight', origin: 'Francistown Depot', destination: 'Kazungula Border', status: 'delivered', driver: 'Emanuel Ndlovu', vehicle: 'B 412 ABN', weightKg: 16000, customsCleared: true },
];

const statusConfig: Record<string, { label: string; badge: any }> = {
  created: { label: 'Created', badge: 'default' },
  in_transit: { label: 'In Transit', badge: 'primary' },
  at_customs: { label: 'At Customs', badge: 'warning' },
  customs_cleared: { label: 'Cleared', badge: 'success' },
  delivered: { label: 'Delivered', badge: 'success' },
};

export default function LogisticsPage() {
  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'FLEET' | 'DRIVERS' | 'MARI_AI'>('SHIPMENTS');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [mariQuery, setMariQuery] = useState('');
  const [mariResponse, setMariResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleMariAsk = () => {
    if (!mariQuery.trim()) return;
    setIsAsking(true);
    setTimeout(() => {
      setMariResponse(`📦 Mari Logistics Analysis:\n\n"${mariQuery}"\n\nFleet Status: 2 of 3 vehicles are active. Vehicle B 101 XYZ is in scheduled maintenance — estimated return: 2 days.\n\nActive Shipments: 2 in transit. SHP-9901AB is approaching Pioneer Border Post and customs documents need verification.\n\n⚠️ Alert: SHP-9901AB customs clearance not yet confirmed. Recommend contacting Emanuel Ndlovu for document status.\n\nRecommendation: Schedule vehicle B 101 XYZ maintenance follow-up for Jul 30 and assign Kefilwe Sello (off-duty) to cover upcoming Kazungula shipment on Aug 2.`);
      setIsAsking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Logistics</h1>
            <Badge variant="primary">Fleet & Shipments</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Fleet management, shipment tracking, customs, and AI document intelligence.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> New Shipment</Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Vehicles', value: '2/3', icon: '🚛', color: 'emerald' },
          { label: 'Active Drivers', value: '2/3', icon: '👤', color: 'blue' },
          { label: 'In Transit', value: '2', icon: '📦', color: 'amber' },
          { label: 'Delivered Today', value: '1', icon: '✅', color: 'emerald' },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="text-xl">{s.icon}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-1">{s.label}</div>
            <div className="text-2xl font-black text-white">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {(['SHIPMENTS', 'FLEET', 'DRIVERS', 'MARI_AI'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Shipments Tab */}
      {activeTab === 'SHIPMENTS' && (
        <div className="flex flex-col gap-3">
          {shipments.map(s => (
            <Card key={s.id} className="p-5 cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => setSelectedShipment(s)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-400">{s.trackingNumber}</span>
                    <Badge variant={statusConfig[s.status]?.badge}>{statusConfig[s.status]?.label}</Badge>
                    {!s.customsCleared && s.status !== 'delivered' && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400"><AlertTriangle className="w-3 h-3" /> Customs Pending</span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-sm">{s.customer}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    <MapPin className="w-3 h-3 text-zinc-600" /> {s.origin} → {s.destination}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                    <span>🚛 {s.vehicle}</span>
                    <span>👤 {s.driver}</span>
                    <span>⚖️ {s.weightKg.toLocaleString()} kg</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 mt-1" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Fleet Tab */}
      {activeTab === 'FLEET' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <Card key={v.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-black text-white">{v.registration}</span>
                <Badge variant={v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'default'}>{v.status}</Badge>
              </div>
              <div className="text-xs text-zinc-400">
                <div className="font-bold text-zinc-200">{v.make} {v.model}</div>
                <div className="mt-1 capitalize text-zinc-500">{v.type}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex items-center gap-1">
                <User className="w-3 h-3 text-blue-400" /> {v.driver}
              </div>
            </Card>
          ))}
          <button className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 transition-all">
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add Vehicle</span>
          </button>
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === 'DRIVERS' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Driver</th>
                  <th className="p-4 text-left">Phone</th>
                  <th className="p-4 text-left">License Expiry</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Deliveries</th>
                  <th className="p-4 text-left">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">{d.name}</td>
                    <td className="p-4 text-zinc-400 font-mono">{d.phone}</td>
                    <td className="p-4 text-zinc-400 font-mono">{d.licenseExpiry}</td>
                    <td className="p-4"><Badge variant={d.status === 'active' ? 'success' : 'default'}>{d.status}</Badge></td>
                    <td className="p-4 text-zinc-300">{d.deliveries}</td>
                    <td className="p-4 text-amber-400 font-bold">⭐ {d.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Mari AI Tab */}
      {activeTab === 'MARI_AI' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white"><Sparkles className="w-4 h-4" /></div>
                <div><CardTitle>Mari Logistics Intelligence</CardTitle><CardDescription>Ask about fleet, shipments, customs, documents</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {['Check fleet status', 'Which shipments need customs clearance?', 'Who is the best performing driver?', 'Verify document completeness for SHP-9901AB'].map((p, i) => (
                <button key={i} onClick={() => setMariQuery(p)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white text-left transition-all">{p}</button>
              ))}
              <textarea rows={2} value={mariQuery} onChange={e => setMariQuery(e.target.value)} placeholder="Ask Mari about your logistics operations..." className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none" />
              <Button variant="primary" size="sm" onClick={handleMariAsk} className="w-full justify-center">
                {isAsking ? 'Analysing...' : <><Sparkles className="w-3.5 h-3.5" /> Ask Mari</>}
              </Button>
            </CardContent>
          </Card>
          {mariResponse && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mari Logistics Report</CardTitle></CardHeader>
              <CardContent><pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{mariResponse}</pre></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Shipment Detail Drawer */}
      {selectedShipment && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                {selectedShipment.trackingNumber}
                <Badge variant={statusConfig[selectedShipment.status]?.badge}>{statusConfig[selectedShipment.status]?.label}</Badge>
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">{selectedShipment.customer}</p>
            </div>
            <button onClick={() => setSelectedShipment(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-lg">✕</button>
          </div>
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs flex flex-col gap-2">
              <div className="flex justify-between"><span className="text-zinc-500">Origin:</span><span className="text-white font-semibold">{selectedShipment.origin}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Destination:</span><span className="text-white font-semibold">{selectedShipment.destination}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Driver:</span><span className="text-white">{selectedShipment.driver}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Vehicle:</span><span className="text-white font-mono">{selectedShipment.vehicle}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Weight:</span><span className="text-white">{selectedShipment.weightKg.toLocaleString()} kg</span></div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Customs:</span>
                {selectedShipment.customsCleared
                  ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Cleared</span>
                  : <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pending</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="sm">Update Status</Button>
              <Button variant="outline" size="sm">Download Documents</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
