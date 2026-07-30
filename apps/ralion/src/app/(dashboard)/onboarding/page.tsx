'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Building2, Shield, Truck, HeartPulse, ShoppingBag, Sparkles, Check, ArrowRight, UserPlus, Layers } from 'lucide-react';
import { useOrganization } from '@ralion/auth';
import { REGISTERED_MODULES } from '@ralion/modules';

export default function RalionOnboardingPage() {
  const router = useRouter();
  const { setOrganization } = useOrganization();

  const [step, setStep] = useState(1);
  const [orgData, setOrgData] = useState({
    name: 'Ralion Funeral Services',
    slug: 'ralion-funeral-services',
    industry: 'FUNERAL',
    licenseTier: 'ENTERPRISE',
    selectedModules: ['mari', 'crm', 'tasks', 'calendar', 'documents', 'billing', 'funeral'],
    inviteEmail: 'manager@ralion.com'
  });

  const industries = [
    { id: 'FUNERAL', name: 'Ralion Funeral OS', icon: Shield, defaultModules: ['mari', 'crm', 'documents', 'billing', 'funeral'] },
    { id: 'LOGISTICS', name: 'Ralion Logistics OS', icon: Truck, defaultModules: ['mari', 'crm', 'documents', 'billing', 'logistics'] },
    { id: 'HEALTH', name: 'Ralion Health OS', icon: HeartPulse, defaultModules: ['mari', 'crm', 'documents', 'billing', 'health'] },
    { id: 'TRADE', name: 'Ralion Trade OS', icon: ShoppingBag, defaultModules: ['mari', 'crm', 'documents', 'billing', 'trade'] }
  ];

  const handleSelectIndustry = (indId: string) => {
    const ind = industries.find(i => i.id === indId);
    setOrgData(prev => ({
      ...prev,
      industry: indId,
      selectedModules: Array.from(new Set([...prev.selectedModules, ...(ind?.defaultModules || [])]))
    }));
  };

  const handleToggleModule = (modKey: string) => {
    setOrgData(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(modKey)
        ? prev.selectedModules.filter(m => m !== modKey)
        : [...prev.selectedModules, modKey]
    }));
  };

  const handleCompleteOnboarding = () => {
    const newOrg = {
      id: `org-${Date.now()}`,
      name: orgData.name,
      slug: orgData.slug,
      ownerId: 'u-admin-101',
      licenseTier: orgData.licenseTier as any,
      maxUsers: 50,
      enabledModules: orgData.selectedModules,
      activeBranches: [{ id: 'b-main', name: 'Main Headquarters', code: 'HQ-01', isMain: true }],
      activeDepartments: [{ id: 'd-ops', name: 'Operations', code: 'OPS' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOrganization(newOrg);
    router.push('/ralion/workspace');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="purple" className="font-mono text-xs">
          Ralion OS Beta — Enterprise Onboarding
        </Badge>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Deploy Your Ralion Workspace
        </h1>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Set up your organization, activate specialized industry modules, and configure your Mari AI agent layer in minutes.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-4 border-y border-zinc-800 py-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-white' : 'text-zinc-500'}`}>
              {s === 1 ? 'Organization' : s === 2 ? 'Industry Vertical' : s === 3 ? 'Modules' : 'Team Invite'}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-zinc-900 border-zinc-800 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Step 1: Enterprise Profile
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  value={orgData.name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Workspace Slug ID</label>
                <input
                  type="text"
                  readOnly
                  className="w-full bg-zinc-800/50 border border-zinc-800 rounded-lg p-2.5 text-zinc-400 font-mono"
                  value={orgData.slug}
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Enterprise License Tier</label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  value={orgData.licenseTier}
                  onChange={(e) => setOrgData({ ...orgData, licenseTier: e.target.value })}
                >
                  <option value="ENTERPRISE">Ralion Enterprise OS (Unlimited Modules)</option>
                  <option value="BUSINESS">Ralion Business (5 Modules)</option>
                  <option value="PROFESSIONAL">Ralion Professional (3 Modules)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <Button variant="primary" size="sm" onClick={() => setStep(2)}>
                Next: Choose Vertical <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" /> Step 2: Select Primary Industry Vertical
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industries.map((ind) => {
                const IconComp = ind.icon;
                const isSelected = orgData.industry === ind.id;
                return (
                  <div
                    key={ind.id}
                    onClick={() => handleSelectIndustry(ind.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-zinc-800/50 border-zinc-700/80 text-zinc-300 hover:border-zinc-600'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <IconComp className={`w-6 h-6 ${isSelected ? 'text-blue-400' : 'text-zinc-400'}`} />
                      {isSelected && <Badge variant="primary">Selected</Badge>}
                    </div>
                    <h3 className="font-bold text-sm text-white">{ind.name}</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Includes tailored workflow state engines & Mari AI prompts.</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(3)}>
                Next: Modules <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Step 3: Module Activation Engine
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {Object.values(REGISTERED_MODULES).map((mod) => {
                const isEnabled = orgData.selectedModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => handleToggleModule(mod.id)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${isEnabled ? 'bg-zinc-800 border-emerald-500/50 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-70'}`}
                  >
                    <div>
                      <span className="font-bold text-xs block">{mod.name}</span>
                      <span className="text-[10px] text-zinc-400">{mod.category}</span>
                    </div>
                    <Badge variant={isEnabled ? 'success' : 'default'}>
                      {isEnabled ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(4)}>
                Next: Team Invite <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" /> Step 4: Invite Team Members
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Team Member Email Address</label>
                <input
                  type="email"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  value={orgData.inviteEmail}
                  onChange={(e) => setOrgData({ ...orgData, inviteEmail: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-zinc-400">An invitation email will be sent with workspace access instructions.</p>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleCompleteOnboarding} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                <Check className="w-4 h-4" /> Provision Ralion Workspace
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
