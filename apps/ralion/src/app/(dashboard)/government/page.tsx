'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Building2, FileText, UserCheck, Shield, Sparkles, CheckCircle2, Clock, AlertTriangle, Plus } from 'lucide-react';

interface CitizenCase {
  id: string;
  referenceNo: string;
  citizenName: string;
  nationalId: string;
  ministry: string;
  caseType: string;
  status: 'submitted' | 'under_review' | 'approved' | 'escalated';
  createdAt: string;
}

const sampleCases: CitizenCase[] = [
  { id: 'gc1', referenceNo: 'GOV-CASE-8801', citizenName: 'Kagiso Tshipa', nationalId: '918239102', ministry: 'Ministry of Infrastructure', caseType: 'Commercial Land Permit Application', status: 'under_review', createdAt: '2026-07-25' },
  { id: 'gc2', referenceNo: 'GOV-CASE-8802', citizenName: 'Boitumelo Phane', nationalId: '827102938', ministry: 'Ministry of Trade & Industry', caseType: 'Export License Verification', status: 'approved', createdAt: '2026-07-24' },
  { id: 'gc3', referenceNo: 'GOV-CASE-8803', citizenName: 'Lesedi Mokoena', nationalId: '772819201', ministry: 'Ministry of Health', caseType: 'Medical Facility Registration', status: 'submitted', createdAt: '2026-07-27' },
];

const statusBadge: Record<string, any> = {
  submitted: 'default',
  under_review: 'primary',
  approved: 'success',
  escalated: 'danger',
};

export default function GovernmentPage() {
  const [cases, setCases] = useState(sampleCases);
  const [activeTab, setActiveTab] = useState<'CASES' | 'WORKFLOWS' | 'MARI_GOV'>('CASES');
  const [mariQuery, setMariQuery] = useState('');
  const [mariResponse, setMariResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleMariGovAsk = () => {
    if (!mariQuery.trim()) return;
    setIsAsking(true);
    setTimeout(() => {
      setMariResponse(`🏛️ Mari Government Case Analysis:\n\n"${mariQuery}"\n\nCase Overview:\n• Total active citizen applications: 3\n• GOV-CASE-8801 (Land Permit) under review by Ministry of Infrastructure — 3 days in workflow\n• GOV-CASE-8802 (Export License) approved by Ministry of Trade & Industry\n\nCompliance Check:\n✅ All 3 cases have valid national IDs verified against the national database.\n⚠️ GOV-CASE-8803 requires environmental impact assessment document upload before health clearance.\n\nRecommendation:\nAssign officer to expedite GOV-CASE-8801 land survey verification and send document request SMS to Lesedi Mokoena for case 8803.`);
      setIsAsking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-900/30 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Government Edition</h1>
            <Badge variant="warning">Public Sector</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Citizen management, inter-ministry case workflows, document processing, and public analytics.</p>
        </div>
        <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> Log Citizen Request</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Citizen Cases', value: '3', icon: '🏛️' },
          { label: 'Under Review', value: '1', icon: '⏳' },
          { label: 'Approved Today', value: '1', icon: '✅' },
          { label: 'Ministries Active', value: '3', icon: '🏢' },
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
        {(['CASES', 'WORKFLOWS', 'MARI_GOV'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Cases */}
      {activeTab === 'CASES' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Ref Number</th>
                  <th className="p-4 text-left">Citizen Name</th>
                  <th className="p-4 text-left">National ID</th>
                  <th className="p-4 text-left">Ministry</th>
                  <th className="p-4 text-left">Case Type</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {cases.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-400">{c.referenceNo}</td>
                    <td className="p-4 font-bold text-white">{c.citizenName}</td>
                    <td className="p-4 font-mono text-zinc-400">{c.nationalId}</td>
                    <td className="p-4 text-zinc-300">{c.ministry}</td>
                    <td className="p-4 text-zinc-400">{c.caseType}</td>
                    <td className="p-4"><Badge variant={statusBadge[c.status]}>{c.status.replace('_', ' ')}</Badge></td>
                    <td className="p-4"><Button variant="outline" size="sm">Process Case</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Mari AI */}
      {activeTab === 'MARI_GOV' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 text-white"><Sparkles className="w-4 h-4" /></div>
                <div><CardTitle>Mari Public Sector Intelligence</CardTitle><CardDescription>Automated case processing and inter-ministry workflow assistant</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {['Analyze pending citizen cases', 'Check missing documents for land permits', 'Summarize ministry turnaround times'].map((p, i) => (
                <button key={i} onClick={() => setMariQuery(p)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white text-left transition-all">{p}</button>
              ))}
              <textarea rows={2} value={mariQuery} onChange={e => setMariQuery(e.target.value)} placeholder="Ask Mari about public sector workflows..." className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none" />
              <Button variant="primary" size="sm" onClick={handleMariGovAsk} className="w-full justify-center bg-amber-600 hover:bg-amber-500 text-white">
                {isAsking ? 'Analysing...' : <><Sparkles className="w-3.5 h-3.5" /> Ask Mari Government</>}
              </Button>
            </CardContent>
          </Card>

          {mariResponse && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mari Government Briefing</CardTitle></CardHeader>
              <CardContent><pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{mariResponse}</pre></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
