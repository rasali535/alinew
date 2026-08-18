'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { 
  Building2, 
  HeartPulse, 
  Shield, 
  Truck, 
  ShoppingBag, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Lock
} from 'lucide-react';

interface IndustryVertical {
  id: string;
  title: string;
  category: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: 'ACTIVE' | 'ENTERPRISE' | 'AVAILABLE';
  features: string[];
  colorBadge: 'rose' | 'purple' | 'amber' | 'emerald' | 'blue';
}

const industryVerticals: IndustryVertical[] = [
  {
    id: 'health',
    title: 'Ralion Healthcare OS',
    category: 'Clinical & Patient Practice',
    description: 'Patient and client intake records, appointment booking calendars, confidential case notes, and Mari AI medical triage assistance.',
    href: '/ralion/industry/health',
    icon: <HeartPulse className="w-6 h-6 text-rose-400" />,
    status: 'ACTIVE',
    features: ['Client / Patient Registry', 'Appointment Scheduling', 'Case Progress Tracking', 'Confidential AI Clinical Insights'],
    colorBadge: 'rose',
  },
  {
    id: 'funeral',
    title: 'Ralion Funeral Services OS',
    category: 'End-of-Life & Mortuary Ops',
    description: 'End-to-end case management, mortuary vault tracking, family policy ledger, transport vehicle dispatch, and memorial documentation.',
    href: '/ralion/industry/funeral',
    icon: <Shield className="w-6 h-6 text-purple-400" />,
    status: 'ACTIVE',
    features: ['Deceased Case Records', 'Mortuary Capacity Ledger', 'Fleet Transport Dispatch', 'Family Policy & Claims Sync'],
    colorBadge: 'purple',
  },
  {
    id: 'logistics',
    title: 'Ralion Logistics & Fleet OS',
    category: 'Freight, Route & Fleet Management',
    description: 'Vehicle fleet maintenance tracking, real-time driver dispatching, fuel consumption telemetry, and consignment manifest delivery.',
    href: '/ralion/industry/logistics',
    icon: <Truck className="w-6 h-6 text-amber-400" />,
    status: 'ACTIVE',
    features: ['Vehicle Fleet Telemetry', 'Driver Manifest Assignment', 'Route Dispatch Optimization', 'Preventative Maintenance Alerts'],
    colorBadge: 'amber',
  },
  {
    id: 'trade',
    title: 'Ralion Trade & Retail OS',
    category: 'Commerce, POS & Wholesale Supply',
    description: 'Multi-location inventory tracking, barcode SKU catalog, supplier purchase orders, wholesale margins, and POS checkout.',
    href: '/ralion/industry/trade',
    icon: <ShoppingBag className="w-6 h-6 text-emerald-400" />,
    status: 'ACTIVE',
    features: ['Barcode / SKU Inventory', 'Purchase Order Pipeline', 'Supplier Ledger Sync', 'Multi-Warehouse Transfers'],
    colorBadge: 'emerald',
  },
  {
    id: 'government',
    title: 'Ralion Government Edition',
    category: 'Public Sector & Citizen Requests',
    description: 'Citizen service processing, inter-agency case routing, regulatory audit logs, and sovereign public sector compliance.',
    href: '/ralion/government',
    icon: <Layers className="w-6 h-6 text-blue-400" />,
    status: 'ENTERPRISE',
    features: ['Citizen Service Portals', 'Cross-Agency Routing', 'Immutable Audit Trails', 'Air-Gapped Cloud Readiness'],
    colorBadge: 'blue',
  },
];

export default function IndustrySolutionsHubPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Industry Solutions Hub</h1>
            <Badge variant="primary" className="text-[10px] font-mono">Specialized OS</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ralion OS configurations tailored for specific industry operations, workflows, and regulatory requirements.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Badge variant="default" className="text-xs font-mono text-emerald-400 border border-emerald-500/30">
            ● 5 Industry Suites Ready
          </Badge>
        </div>
      </div>

      {/* Solutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {industryVerticals.map((sol) => (
          <Card 
            key={sol.id} 
            className="flex flex-col justify-between bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700 transition-all duration-200"
          >
            <CardHeader className="p-5 border-b border-zinc-800/50">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {sol.icon}
                </div>
                <Badge 
                  variant={sol.status === 'ACTIVE' ? 'default' : 'primary'}
                  className="text-[10px] font-mono"
                >
                  {sol.status}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-white leading-tight">
                {sol.title}
              </CardTitle>
              <span className="text-[11px] font-medium text-indigo-400 mt-0.5">
                {sol.category}
              </span>
            </CardHeader>

            <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                {sol.description}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/40">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Key Capabilities
                </span>
                {sol.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link href={sol.href} className="w-full block">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
                  >
                    <span>Launch {sol.title.replace('Ralion ', '')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise Custom Vertical Callout */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Need a Custom Industry Architecture?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ras Ali Labs crafts tailored Ralion OS deployments for specialized manufacturing, mining, finance, and logistics operations.
            </p>
          </div>
        </div>
        <Link href="/ralion/developer">
          <Button variant="secondary" size="sm" className="shrink-0 text-xs">
            Explore SDK & APIs
          </Button>
        </Link>
      </div>
    </div>
  );
}
