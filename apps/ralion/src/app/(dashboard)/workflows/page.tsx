'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Zap, Plus, Play, CheckCircle2, ArrowRight, Bell, Mail, FileCheck } from 'lucide-react';

interface RuleItem {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  executions: number;
  isActive: boolean;
}

const sampleRules: RuleItem[] = [
  { id: 'w1', name: 'New Lead Onboarding', trigger: 'New Customer Created', actions: ['Send Welcome Email', 'Create Task for Manager', 'Notify Mari AI'], executions: 142, isActive: true },
  { id: 'w2', name: 'Deal Won Billing Trigger', trigger: 'CRM Deal Stage = WON', actions: ['Generate Invoice PDF', 'Notify Accounting', 'Send WhatsApp Confirmation'], executions: 38, isActive: true },
  { id: 'w3', name: 'Ralion Funeral Intake Automation', trigger: 'New Funeral Case Registered', actions: ['Reserve Hearse Fleet', 'Assign Coordinator', 'Generate Family Intake Pack'], executions: 19, isActive: true },
  { id: 'w4', name: 'Logistics Border Alert', trigger: 'Shipment Status = CUSTOMS_HOLD', actions: ['Notify Compliance Officer', 'Flag Priority Task'], executions: 7, isActive: false },
];

export default function WorkflowsPage() {
  const [rules, setRules] = useState<RuleItem[]>(sampleRules);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Visual No-Code Workflows</h1>
            <Badge variant="primary">Phase 1 Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automate business processes, trigger emails, generate tasks, and notify managers instantly.
          </p>
        </div>

        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4" /> Build Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-5 border-zinc-800 hover:border-blue-500/40 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${rule.isActive ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {rule.name}
                      <Badge variant={rule.isActive ? 'success' : 'default'}>{rule.isActive ? 'Active' : 'Disabled'}</Badge>
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Trigger: <span className="text-blue-400">{rule.trigger}</span>
                    </p>
                  </div>
                </div>

                {/* Workflow Sequence Visualization */}
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-12 text-xs text-zinc-300">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200">
                    {rule.trigger}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                  {rule.actions.map((act, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-500/30 text-[11px] font-semibold text-blue-300">
                        {act}
                      </span>
                      {idx < rule.actions.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Status & Executions */}
              <div className="flex items-center gap-4 border-t md:border-t-0 border-zinc-800 pt-3 md:pt-0">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Executions</span>
                  <span className="text-sm font-mono font-bold text-white">{rule.executions} times</span>
                </div>
                <Button
                  variant={rule.isActive ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => toggleRule(rule.id)}
                >
                  {rule.isActive ? 'Pause' : 'Enable'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
