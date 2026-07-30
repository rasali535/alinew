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
    </div>
  );
}
