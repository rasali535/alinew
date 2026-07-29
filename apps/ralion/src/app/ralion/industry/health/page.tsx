'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Heart, Plus, Calendar, FileText, User, Clock, AlertTriangle, Sparkles, ChevronRight, Shield } from 'lucide-react';

interface HealthClient {
  id: string;
  name: string;
  phone: string;
  intakeDate: string;
  status: 'active' | 'inactive' | 'discharged';
  professional: string;
  nextAppointment?: string;
  openCases: number;
}

interface Appointment {
  id: string;
  clientName: string;
  professional: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

const clients: HealthClient[] = [
  { id: 'hc1', name: 'Boitumelo Tsheko', phone: '+267 71223344', intakeDate: 'Jul 2, 2026', status: 'active', professional: 'Dr. Lesego Moagi', nextAppointment: 'Jul 30, 2026', openCases: 1 },
  { id: 'hc2', name: 'Kagiso Sithole', phone: '+267 72334455', intakeDate: 'Jun 15, 2026', status: 'active', professional: 'Counsellor Naledi Kgosi', nextAppointment: 'Jul 29, 2026', openCases: 2 },
  { id: 'hc3', name: 'Mpho Dlamini', phone: '+267 73445566', intakeDate: 'May 20, 2026', status: 'active', professional: 'Dr. Lesego Moagi', nextAppointment: 'Aug 5, 2026', openCases: 1 },
  { id: 'hc4', name: 'Refilwe Tau', phone: '+267 74556677', intakeDate: 'Apr 10, 2026', status: 'discharged', professional: 'Counsellor Naledi Kgosi', openCases: 0 },
];

const appointments: Appointment[] = [
  { id: 'a1', clientName: 'Kagiso Sithole', professional: 'Counsellor Naledi Kgosi', date: 'Jul 29, 2026', time: '10:00 AM', type: 'session', status: 'confirmed' },
  { id: 'a2', clientName: 'Boitumelo Tsheko', professional: 'Dr. Lesego Moagi', date: 'Jul 30, 2026', time: '2:00 PM', type: 'follow_up', status: 'scheduled' },
  { id: 'a3', clientName: 'Mpho Dlamini', professional: 'Dr. Lesego Moagi', date: 'Aug 5, 2026', time: '9:00 AM', type: 'assessment', status: 'scheduled' },
];

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'APPOINTMENTS' | 'CASES' | 'MARI_AI'>('CLIENTS');
  const [selectedClient, setSelectedClient] = useState<HealthClient | null>(null);
  const [mariQuery, setMariQuery] = useState('');
  const [mariResponse, setMariResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleMariAsk = () => {
    if (!mariQuery.trim()) return;
    setIsAsking(true);
    setTimeout(() => {
      setMariResponse(`🏥 Mari Health Analysis (Confidential):\n\n"${mariQuery}"\n\nSummary:\n\n3 of 4 active clients have appointments scheduled within the next 7 days.\n\nAttention required:\n• Kagiso Sithole: 2 open cases — next session tomorrow (Jul 29). Review progress notes before session.\n• Boitumelo Tsheko: 45 days since last documented case note update — recommend update before Jul 30 appointment.\n\nUpcoming this week:\n• Jul 29 — Kagiso Sithole (Counsellor Naledi Kgosi) — Session\n• Jul 30 — Boitumelo Tsheko (Dr. Lesego Moagi) — Follow-up\n\nRecommendation: Send appointment reminders today. Ensure informed consent forms are on file for all active clients.`);
      setIsAsking(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Health</h1>
            <Badge variant="success">Clinical Module</Badge>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> HIPAA-Ready
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Client management, appointments, case notes, and AI-assisted clinical insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm"><Plus className="w-4 h-4" /> New Client</Button>
          <Button variant="outline" size="sm"><Calendar className="w-4 h-4" /> Schedule</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Clients', value: '3', icon: '👥' },
          { label: 'Appointments This Week', value: '2', icon: '📅' },
          { label: 'Open Cases', value: '4', icon: '📋' },
          { label: 'Due Follow-Ups', value: '1', icon: '⚠️' },
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
        {(['CLIENTS', 'APPOINTMENTS', 'CASES', 'MARI_AI'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Clients Tab */}
      {activeTab === 'CLIENTS' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Client</th>
                  <th className="p-4 text-left">Assigned Professional</th>
                  <th className="p-4 text-left">Intake Date</th>
                  <th className="p-4 text-left">Next Appt</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Open Cases</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setSelectedClient(c)}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">{c.name.charAt(0)}</div>
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-zinc-500 font-mono">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400">{c.professional}</td>
                    <td className="p-4 text-zinc-400 font-mono">{c.intakeDate}</td>
                    <td className="p-4 text-zinc-300 font-mono">{c.nextAppointment || '—'}</td>
                    <td className="p-4"><Badge variant={c.status === 'active' ? 'success' : c.status === 'discharged' ? 'default' : 'warning'}>{c.status}</Badge></td>
                    <td className="p-4 text-center font-bold text-white">{c.openCases}</td>
                    <td className="p-4"><ChevronRight className="w-4 h-4 text-zinc-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Appointments Tab */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="flex flex-col gap-3">
          {appointments.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{a.clientName}</span>
                    <Badge variant={a.status === 'confirmed' ? 'success' : a.status === 'completed' ? 'default' : 'primary'} className="text-[10px]">{a.status}</Badge>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    <span className="capitalize">{a.type.replace('_', ' ')}</span> · {a.professional}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" /> {a.date}
                    <Clock className="w-3 h-3 ml-1" /> {a.time}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Notes</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === 'CASES' && (
        <div className="flex flex-col gap-3">
          {clients.filter(c => c.openCases > 0).map(c => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{c.name}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{c.openCases} open case{c.openCases > 1 ? 's' : ''} · Assigned to {c.professional}</p>
                </div>
                <Button variant="outline" size="sm">View Cases</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Mari AI Tab */}
      {activeTab === 'MARI_AI' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white"><Sparkles className="w-4 h-4" /></div>
                <div><CardTitle>Mari Health Intelligence</CardTitle><CardDescription>Clinical insights — permission restricted</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400">
                <Shield className="w-3.5 h-3.5" /> Access restricted to assigned professionals only
              </div>
              {['Summarize today\'s client schedule', 'Which clients need follow-up?', 'List overdue case note updates', 'Generate session reminder messages'].map((p, i) => (
                <button key={i} onClick={() => setMariQuery(p)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white text-left transition-all">{p}</button>
              ))}
              <textarea rows={2} value={mariQuery} onChange={e => setMariQuery(e.target.value)} placeholder="Ask Mari about your clients and schedule..." className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none" />
              <Button variant="primary" size="sm" onClick={handleMariAsk} className="w-full justify-center">
                {isAsking ? 'Analysing...' : <><Sparkles className="w-3.5 h-3.5" /> Ask Mari</>}
              </Button>
            </CardContent>
          </Card>
          {mariResponse && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mari Clinical Report (Confidential)</CardTitle></CardHeader>
              <CardContent><pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{mariResponse}</pre></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
