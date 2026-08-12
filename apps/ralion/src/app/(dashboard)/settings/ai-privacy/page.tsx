'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@ralion/ui';
import { AiModelManager } from '@/components/AiModelManager';
import { ShieldAlert, Database, Cloud } from 'lucide-react';

export default function AiPrivacySettings() {
  const [useCloud, setUseCloud] = useState(true);
  const [encryptLocal, setEncryptLocal] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 border-b border-zinc-800/80 pb-5">
        <h1 className="text-2xl font-black tracking-tight text-white">AI & Privacy Settings</h1>
        <p className="text-sm text-zinc-400">Manage Ralion's Local AI Engine and offline capabilities.</p>
      </div>

      <AiModelManager />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Security & Routing
          </CardTitle>
          <CardDescription>Configure how Mari AI routes your requests and stores data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-blue-400 mt-1" />
              <div>
                <h4 className="text-sm font-semibold text-white">Allow Cloud Fallback (Hybrid Mode)</h4>
                <p className="text-xs text-zinc-400 max-w-md mt-1">
                  When enabled, Mari AI will route highly complex reasoning tasks to secure Cloud models (aimlapi) if your local model cannot handle them. If disabled, all processing stays 100% on your device (Offline Mode).
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={useCloud} onChange={(e) => setUseCloud(e.target.checked)} />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-purple-400 mt-1" />
              <div>
                <h4 className="text-sm font-semibold text-white">Encrypt AI Memory</h4>
                <p className="text-xs text-zinc-400 max-w-md mt-1">
                  Encrypt the local Ralion Knowledge Database on your hard drive. This ensures that even if your device is compromised, offline business documents remain unreadable.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={encryptLocal} onChange={(e) => setEncryptLocal(e.target.checked)} />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

        </CardContent>
      </Card>

      {/* Botswana DPA & BOCRA Compliance Banner */}
      <Card className="border-emerald-500/30 bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Botswana Data Protection Act & BOCRA Governance
            </CardTitle>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider border border-emerald-500/30">
              Act 32 (2018) Compliant
            </span>
          </div>
          <CardDescription>
            Ras Ali Labs and Ralion operate under the regulatory oversight of the Botswana Communications Regulatory Authority (BOCRA) and the Botswana Data Protection Act (Act No. 32 of 2018).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <h5 className="font-bold text-white mb-1">Local Data Residency</h5>
              <p className="text-[11px] text-zinc-400">Zero foreign cloud telemetry when running in offline on-premises desktop mode.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <h5 className="font-bold text-white mb-1">Statutory DPA Rights</h5>
              <p className="text-[11px] text-zinc-400">Instant data access, rectification, export, and right-to-be-forgotten erasure.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <h5 className="font-bold text-white mb-1">Telecom Standards</h5>
              <p className="text-[11px] text-zinc-400">Strict anti-spam and verified electronic communications gateway routing.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
            <span className="text-xs text-zinc-500">
              Data Protection Officer: <a href="mailto:privacy@rasalilabs.com" className="text-emerald-400 hover:underline">privacy@rasalilabs.com</a>
            </span>
            <div className="flex items-center gap-3">
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-zinc-300 hover:text-emerald-400 underline transition-colors"
              >
                View Privacy Policy
              </a>
              <a
                href="/data-protection"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
              >
                BOCRA & DPA Portal →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
