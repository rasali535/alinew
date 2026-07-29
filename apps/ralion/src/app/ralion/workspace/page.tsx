'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Shield, Sparkles, Users, CheckSquare, Calendar, Folder, Zap, CreditCard, TrendingUp, HeartPulse, Truck, ShoppingBag, ArrowRight } from 'lucide-react';
import { useOrganization } from '@ralion/auth';
import { REGISTERED_MODULES, IndustryModuleManifest } from '@ralion/modules';

const iconMap: Record<string, any> = {
  sparkles: Sparkles,
  users: Users,
  'check-square': CheckSquare,
  calendar: Calendar,
  folder: Folder,
  zap: Zap,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'heart-pulse': HeartPulse,
  shield: Shield,
  truck: Truck,
  'shopping-bag': ShoppingBag
};

export default function RalionDynamicWorkspacePage() {
  const { organization, user } = useOrganization();

  const enabledModuleKeys = organization?.enabledModules || ['mari', 'crm', 'tasks', 'calendar', 'documents', 'workflows', 'billing', 'growth', 'health', 'funeral', 'logistics', 'trade'];

  const activeModules: IndustryModuleManifest[] = enabledModuleKeys
    .map(key => REGISTERED_MODULES[key])
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800/80 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {organization?.name || 'Ralion Platform Workspace'}
            </h1>
            <Badge variant="primary" className="font-mono text-xs">
              {organization?.licenseTier || 'ENTERPRISE'}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            "Empowered to Prosper" — Dynamic AI-Powered Operating System for {user?.displayName || 'Ras Ali Admin'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-xs font-mono text-emerald-400 border border-emerald-500/30">
            ● {activeModules.length} Modules Active
          </Badge>
          <Link href="/ralion/mari-ai">
            <Button variant="primary" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" /> Ask Mari AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Enabled Modules */}
      <div>
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">
          Enabled System Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeModules.map((mod) => {
            const IconComponent = iconMap[mod.icon] || Sparkles;
            return (
              <Card key={mod.id} className="p-5 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-zinc-800/80 text-blue-400 border border-zinc-700/50">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    {mod.isIndustryPlugin && (
                      <Badge variant="purple" className="text-[10px] uppercase font-mono">
                        Industry Vertical
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">{mod.name}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">{mod.description}</p>
                </div>

                <Link href={`/ralion${mod.route}`}>
                  <Button variant="outline" size="sm" className="w-full justify-between group">
                    <span>Open Module</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
