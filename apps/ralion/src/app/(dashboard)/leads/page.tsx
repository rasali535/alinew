'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Modal } from '@ralion/ui';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';

type LeadStage = 'LEAD' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

interface LeadItem {
  id: string;
  title: string;
  contactName: string;
  company: string;
  email: string;
  dealValue: number;
  stage: LeadStage;
  aiScore: number;
}

const PIPELINE_STAGES: Array<{ key: LeadStage; label: string }> = [
  { key: 'LEAD', label: 'New Lead' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'PROPOSAL', label: 'Proposal' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'WON', label: 'Won' },
  { key: 'LOST', label: 'Lost' },
];

const STAGE_PROBABILITIES: Record<LeadStage, number> = {
  LEAD: 10,
  CONTACTED: 25,
  QUALIFIED: 50,
  PROPOSAL: 75,
  NEGOTIATION: 90,
  WON: 100,
  LOST: 0,
};

function mapLead(row: any): LeadItem {
  return {
    id: String(row.id),
    title: row.title || 'Lead opportunity',
    contactName: row.contact_name || row.title || 'Lead',
    company: row.company_name || 'Independent',
    email: row.email || '',
    dealValue: Number(row.value || 0),
    stage: (row.stage || 'LEAD') as LeadStage,
    aiScore: Number(row.ai_score ?? 50),
  };
}

export default function LeadsPage() {
  const { organization } = useOrganization();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [newLead, setNewLead] = useState({ title: '', contactName: '', company: '', email: '', dealValue: '25000' });

  const loadLeads = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/deals');
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load leads.');
      setLeads((result.deals || [])
        .filter((row: any) => String(row.deal_type || 'LEAD').toUpperCase() === 'LEAD')
        .map(mapLead));
    } catch (err: any) {
      setLeads([]);
      setError(err?.message || 'Unable to load leads.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!organization?.id) return;
    void loadLeads();
  }, [organization?.id]);

  const handleCreateLead = async () => {
    if (!newLead.title.trim() || !newLead.contactName.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLead.title,
          name: newLead.contactName,
          company: newLead.company,
          email: newLead.email,
          dealValue: Number(newLead.dealValue || 0),
          type: 'LEAD',
          stage: 'LEAD',
          probability: STAGE_PROBABILITIES.LEAD,
          aiLeadScore: 50,
          tags: ['Lead'],
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to create lead.');
      const created = mapLead(result.deal);
      setLeads((current) => [created, ...current]);
      setIsModalOpen(false);
      setNewLead({ title: '', contactName: '', company: '', email: '', dealValue: '25000' });
    } catch (err: any) {
      setError(err?.message || 'Unable to create lead.');
    } finally {
      setIsSaving(false);
    }
  };

  const moveLead = async (lead: LeadItem, stage: LeadStage) => {
    setError('');
    try {
      const response = await authFetch('/api/crm/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, stage, probability: STAGE_PROBABILITIES[stage] }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to move lead.');
      const updated = mapLead(result.deal);
      setLeads((current) => current.map((item) => item.id === lead.id ? updated : item));
      setSelectedLead(updated);
    } catch (err: any) {
      setError(err?.message || 'Unable to move lead.');
    }
  };

  const selectedStageIndex = selectedLead ? PIPELINE_STAGES.findIndex((stage) => stage.key === selectedLead.stage) : -1;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Leads & Sales Funnel</h1>
            <Badge variant="primary">Durable CRM</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">The lead funnel now shares the same workspace-scoped pipeline as CRM.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-200">{error}</div>}

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-zinc-500">Loading leads…</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stage === stage.key);
            const totalValue = stageLeads.reduce((sum, lead) => sum + lead.dealValue, 0);
            return (
              <div key={stage.key} className="flex flex-col gap-3 min-w-[210px] bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white tracking-wider">{stage.label}</span>
                  <Badge variant="default" className="text-[10px]">{stageLeads.length}</Badge>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono font-semibold">Total: ${totalValue.toLocaleString()}</div>
                <div className="flex flex-col gap-2.5">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} onClick={() => setSelectedLead(lead)} className="p-3.5 hover:border-blue-500/50 cursor-pointer transition-all">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">{lead.company}</span>
                      <h4 className="text-xs font-bold text-white">{lead.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{lead.contactName}</p>
                      <div className="mt-3 flex items-center justify-between text-[10px] border-t border-zinc-800/60 pt-2">
                        <span className="font-mono font-bold text-emerald-400">${lead.dealValue.toLocaleString()}</span>
                        <span className="flex items-center gap-1 font-mono text-purple-400"><Sparkles className="w-3 h-3" /> Mari: {lead.aiScore}</span>
                      </div>
                    </Card>
                  ))}
                  {stageLeads.length === 0 && <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-[11px] text-zinc-600">No leads in stage</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedLead && selectedStageIndex >= 0 && (
        <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">{selectedLead.title}</p>
            <p className="text-xs text-zinc-400 mt-1">{selectedLead.contactName} • {selectedLead.company} • {selectedLead.stage}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" disabled={selectedStageIndex <= 0} onClick={() => void moveLead(selectedLead, PIPELINE_STAGES[selectedStageIndex - 1].key)}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="primary" size="sm" disabled={selectedStageIndex >= PIPELINE_STAGES.length - 1} onClick={() => void moveLead(selectedLead, PIPELINE_STAGES[selectedStageIndex + 1].key)}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Lead Opportunity">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Opportunity Title</label>
            <input type="text" value={newLead.title} onChange={(event) => setNewLead({ ...newLead, title: event.target.value })} placeholder="e.g. Enterprise License Contract" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Contact Name</label>
              <input type="text" value={newLead.contactName} onChange={(event) => setNewLead({ ...newLead, contactName: event.target.value })} placeholder="Contact name" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">Company</label>
              <input type="text" value={newLead.company} onChange={(event) => setNewLead({ ...newLead, company: event.target.value })} placeholder="Company" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Email</label>
            <input type="email" value={newLead.email} onChange={(event) => setNewLead({ ...newLead, email: event.target.value })} placeholder="contact@example.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Estimated Deal Value ($)</label>
            <input type="number" value={newLead.dealValue} onChange={(event) => setNewLead({ ...newLead, dealValue: event.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="glass" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={isSaving || !newLead.title.trim() || !newLead.contactName.trim()} onClick={() => void handleCreateLead()}>{isSaving ? 'Saving…' : 'Save Lead'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
