'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Shield, Key, Lock, Users, Activity, CheckCircle2, Server, Globe } from 'lucide-react';

export default function EnterprisePage() {
  const [ssoProvider, setSsoProvider] = useState('azure_ad');
  const [domainAllowlist, setDomainAllowlist] = useState('kalaharimine.co.bw, rasalilabs.com');
  const [ssoEnabled, setSsoEnabled] = useState(true);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900/30 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Enterprise Control Center</h1>
            <Badge variant="purple">Phase 9 Enterprise</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Single Sign-On (SSO), security policy enforcement, audit compliance, and multi-tenant management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SSO Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Single Sign-On (SSO / SAML 2.0)</CardTitle>
                <CardDescription>Enforce corporate identity provider authentication for all workspace members.</CardDescription>
              </div>
              <Badge variant={ssoEnabled ? 'success' : 'default'}>{ssoEnabled ? 'SSO Active' : 'Disabled'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Identity Provider</label>
              <select value={ssoProvider} onChange={e => setSsoProvider(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white">
                <option value="azure_ad">Microsoft Azure AD / Entra ID</option>
                <option value="okta">Okta Enterprise</option>
                <option value="google_workspace">Google Workspace SAML</option>
                <option value="saml_custom">Custom SAML 2.0 Provider</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Allowed Email Domains</label>
              <input type="text" value={domainAllowlist} onChange={e => setDomainAllowlist(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white" />
              <p className="text-[10px] text-zinc-500 mt-1">Comma-separated domains allowed to authenticate via SSO.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex flex-col gap-2">
              <div className="flex justify-between text-zinc-400"><span>SAML Entity ID:</span><span className="font-mono text-zinc-200">https://ralion.rasalilabs.com/saml/metadata</span></div>
              <div className="flex justify-between text-zinc-400"><span>Assertion Consumer URL:</span><span className="font-mono text-zinc-200">https://ralion.rasalilabs.com/api/v1/auth/saml</span></div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="primary" size="sm" onClick={() => setSsoEnabled(!ssoEnabled)}>
                {ssoEnabled ? 'Save SSO Configuration' : 'Enable SSO'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Compliance Card */}
        <Card>
          <CardHeader><CardTitle>Security Compliance</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-xs">
            {[
              { label: 'Role-Based Access Control (RBAC)', status: 'Enforced' },
              { label: 'Database Field Encryption', status: 'AES-256' },
              { label: 'Audit Trail Retention', status: '7 Years' },
              { label: 'Data Sovereignty (Botswana Node)', status: 'Active' },
              { label: 'SOC 2 Type II Readiness', status: 'Compliant' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300 font-medium">{item.label}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {item.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
