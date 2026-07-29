'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Building2, HeartPulse, Shield, Truck, Sparkles, ArrowRight, CheckCircle2, Users, FileText, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DemoEnvironment {
  id: string;
  clientName: string;
  pluginName: string;
  industry: string;
  route: string;
  badgeColor: 'purple' | 'primary' | 'success';
  stats: { metric1: string; metric2: string; metric3: string };
  caseStudy: string;
}

const showcaseDemos: DemoEnvironment[] = [
  {
    id: 'demo-pameltex',
    clientName: 'Pameltex Healthcare Services',
    pluginName: 'Ralion Health',
    industry: 'Healthcare & Wellness',
    route: '/industry/health',
    badgeColor: 'purple',
    stats: { metric1: '14 Active Patients', metric2: '84/100 Avg Wellness', metric3: '24h Intake SLA' },
    caseStudy: 'Client intake records, counseling progress entries, physical indicators, and automated clinical intake PDF report generation.'
  },
  {
    id: 'demo-doves',
    clientName: 'Doves Funeral Parlour',
    pluginName: 'Ralion Funeral',
    industry: 'Bereavement & Funeral Services',
    route: '/industry/funeral',
    badgeColor: 'primary',
    stats: { metric1: '8 Active Cases', metric2: 'Gaborone & Francistown', metric3: 'Hearse Fleet Synced' },
    caseStudy: 'Family intake records, casket & urn inventory tracking, hearse dispatch scheduling, and invoice contract generation.'
  },
  {
    id: 'demo-dfs',
    clientName: 'DFS Group Logistics',
    pluginName: 'Ralion Logistics',
    industry: 'Freight & Cross-Border Logistics',
    route: '/industry/logistics',
    badgeColor: 'success',
    stats: { metric1: '12 Active Shipments', metric2: 'Pioneer Border Hub', metric3: '98.4% On-Time' },
    caseStudy: 'Fleet dispatch monitoring, driver identification hash, customs border clearance checklist, and transport manifests.'
  },
  {
    id: 'demo-rasali',
    clientName: 'Ras Ali Labs (Internal Workspace)',
    pluginName: 'Ralion Business Engine',
    industry: 'Software & Intelligent Ecosystems',
    route: '/',
    badgeColor: 'purple',
    stats: { metric1: '5 Active Projects', metric2: '$142.5k Pipeline', metric3: '99.99% SLA Uptime' },
    caseStudy: 'Ras Ali Labs internal workspace managing real clients, proposals, tasks, documents, and Mari AI RAG vectors.'
  }
];

export default function DemosPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Showcase Demo Environments</h1>
            <Badge variant="purple" className="gap-1 font-mono">
              <Sparkles className="w-3.5 h-3.5" /> Validation Phase 1
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Empowered to Prosper — Pre-populated industry case study showcase environments for Pameltex, Doves Funeral, DFS Group, and Ras Ali Labs.
          </p>
        </div>
      </div>

      {/* Demo Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showcaseDemos.map((demo) => (
          <Card key={demo.id} className="p-6 bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-all flex flex-col justify-between group">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">{demo.industry}</span>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5">{demo.clientName}</h3>
                </div>
                <Badge variant={demo.badgeColor}>{demo.pluginName}</Badge>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                {demo.caseStudy}
              </p>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-zinc-800 text-[11px] text-zinc-400 font-mono">
                <span className="text-center bg-zinc-950 p-2 rounded-lg">{demo.stats.metric1}</span>
                <span className="text-center bg-zinc-950 p-2 rounded-lg text-purple-400">{demo.stats.metric2}</span>
                <span className="text-center bg-zinc-950 p-2 rounded-lg text-emerald-400">{demo.stats.metric3}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(demo.route)}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 font-bold justify-between"
            >
              <span>Launch {demo.pluginName} Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
