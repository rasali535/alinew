'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { ChevronLeft, ChevronRight, Filter, Mail, Phone, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';

type DealStage = 'LEAD' | 'CONTACTED' | 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CLOSED_WON' | 'CLOSED_LOST';
type DealType = 'LEAD' | 'CUSTOMER' | 'SUPPLIER' | 'PARTNER';

const PIPELINE_STAGES: DealStage[] = ['LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];
const DEAL_STAGE_PROBABILITIES: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROSPECT: 35,
  QUALIFIED: 50,
  PROPOSAL: 75,
  NEGOTIATION: 90,
  WON: 100,
  CLOSED_WON: 100,
  LOST: 0,
  CLOSED_LOST: 0,
};

interface DealItem {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  type: DealType;
  dealValue: number;
  stage: DealStage;
  tags: string[];
  aiLeadScore: number;
  probability: number;
  notes: string;
  createdAt: string;
}

interface DealForm {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  type: DealType;
  dealValue: string;
  stage: DealStage;
  notes: string;
}

const EMPTY_FORM: DealForm = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  type: 'LEAD',
  dealValue: '10000',
  stage: 'LEAD',
  notes: '',
};

function mapDeal(row: any): DealItem {
  const stage = (row.stage || 'LEAD') as DealStage;
  return {
    id: String(row.id),
    name: row.contact_name || row.title || 'Lead',
    title: row.title || 'Opportunity',
    company: row.company_name || 'Independent',
    email: row.email || '',
    phone: row.phone || '',
    type: (row.deal_type || 'LEAD') as DealType,
    dealValue: Number(row.value || 0),
    stage,
    tags: Array.isArray(row.tags) ? row.tags : [],
    aiLeadScore: Number(row.ai_score ?? 50),
    probability: Number(row.probability ?? DEAL_STAGE_PROBABILITIES[stage] ?? 0),
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export default function CRMPage() {
  const { organization } = useOrganization();
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'CONTACTS'>('PIPELINE');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDeals = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/deals');
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load pipeline.');
      setDeals((result.deals || []).map(mapDeal));
    } catch (err: any) {
      setDeals([]);
      setError(err?.message || 'Unable to load pipeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!organization?.id) return;
    void loadDeals();
  }, [organization?.id]);

  const filteredDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return deals.filter((deal) => {
      const typeMatches = typeFilter === 'ALL' || deal.type === typeFilter;
      const queryMatches = !normalizedQuery ||
        deal.name.toLowerCase().includes(normalizedQuery) ||
        deal.company.toLowerCase().includes(normalizedQuery) ||
        deal.email.toLowerCase().includes(normalizedQuery) ||
        deal.title.toLowerCase().includes(normalizedQuery);
      return typeMatches && queryMatches;
    });
  }, [deals, query, typeFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (deal: DealItem) => {
    setEditingId(deal.id);
    setForm({
      name: deal.name,
      title: deal.title,
      company: deal.company === 'Independent' ? '' : deal.company,
      email: deal.email,
      phone: deal.phone,
      type: deal.type,
      dealValue: String(deal.dealValue),
      stage: deal.stage,
      notes: deal.notes,
    });
    setIsModalOpen(true);
  };

  const saveDeal = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await authFetch('/api/crm/deals', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          title: form.title,
          company: form.company,
          email: form.email,
          phone: form.phone,
          type: form.type,
          dealValue: Number(form.dealValue || 0),
          stage: form.stage,
          probability: DEAL_STAGE_PROBABILITIES[form.stage] ?? 0,
          aiLeadScore: editingId ? selectedDeal?.aiLeadScore ?? 50 : 50,
          notes: form.notes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save deal.');

      const mapped = mapDeal(result.deal);
      setDeals((current) => editingId
        ? current.map((deal) => deal.id === editingId ? mapped : deal)
        : [mapped, ...current]
      );
      if (selectedDeal?.id === editingId) setSelectedDeal(mapped);
      setIsModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || 'Unable to save deal.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStage = async (deal: DealItem, stage: DealStage) => {
    setError('');
    try {
      const response = await authFetch('/api/crm/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deal.id, stage, probability: DEAL_STAGE_PROBABILITIES[stage] ?? 0 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to move deal.');
      const mapped = mapDeal(result.deal);
      setDeals((current) => current.map((item) => item.id === deal.id ? mapped : item));
      setSelectedDeal(mapped);
    } catch (err: any) {
      setError(err?.message || 'Unable to move deal.');
    }
  };

  const deleteDeal = async (deal: DealItem) => {
    if (!window.confirm(`Delete ${deal.title}? This cannot be undone.`)) return;
    setError('');
    try {
      const response = await authFetch(`/api/crm/deals?id=${encodeURIComponent(deal.id)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete deal.');
      setDeals((current) => current.filter((item) => item.id !== deal.id));
      setSelectedDeal(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to delete deal.');
    }
  };

  const stagePosition = selectedDeal ? PIPELINE_STAGES.indexOf(selectedDeal.stage) : -1;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">CRM & Sales Pipeline</h1>
            <Badge variant="primary">Durable CRM</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Workspace-scoped opportunities, contacts and sales progression.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pipeline..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white" />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button onClick={() => setActiveTab('PIPELINE')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'PIPELINE' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>Pipeline</button>
            <button onClick={() => setActiveTab('CONTACTS')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'CONTACTS' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>Contacts</button>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Deal</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Type</span>
        {['ALL', 'LEAD', 'CUSTOMER', 'SUPPLIER', 'PARTNER'].map((type) => (
          <button key={type} onClick={() => setTypeFilter(type)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${typeFilter === type ? 'bg-blue-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>{type}</button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-200">{error}</div>}

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-zinc-500">Loading pipeline…</Card>
      ) : activeTab === 'PIPELINE' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((deal) => deal.stage === stage);
            const total = stageDeals.reduce((sum, deal) => sum + deal.dealValue, 0);
            return (
              <div key={stage} className="flex flex-col gap-3 min-w-[200px] bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white tracking-wider">{stage}</span>
                  <Badge variant="default" className="text-[10px]">{stageDeals.length}</Badge>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono font-semibold">Total: ${total.toLocaleString()}</div>
                <div className="flex flex-col gap-2.5">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} onClick={() => setSelectedDeal(deal)} className="p-3.5 hover:border-blue-500/50 cursor-pointer transition-all group">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300">{deal.name}</span>
                        <Badge variant="primary" className="text-[9px]">${deal.dealValue.toLocaleString()}</Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{deal.company}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 truncate">{deal.title}</p>
                      <div className="mt-3 flex items-center justify-between text-[10px] border-t border-zinc-800/60 pt-2">
                        <span className="flex items-center gap-1 font-mono text-purple-400"><Sparkles className="w-3 h-3" /> Mari: {deal.aiLeadScore}</span>
                        <span className="font-mono text-blue-400 font-semibold">{deal.probability}% win</span>
                      </div>
                    </Card>
                  ))}
                  {stageDeals.length === 0 && <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-[11px] text-zinc-600">No deals</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>CRM Contact Directory ({filteredDeals.length})</CardTitle>
            <CardDescription>Contacts tied to active opportunities in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDeals.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">No CRM contacts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                    <tr><th className="p-4">Contact</th><th className="p-4">Company</th><th className="p-4">Contact Info</th><th className="p-4">Stage</th><th className="p-4">Value</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredDeals.map((deal) => (
                      <tr key={deal.id} onClick={() => setSelectedDeal(deal)} className="hover:bg-zinc-800/40 cursor-pointer">
                        <td className="p-4 font-bold text-white">{deal.name}</td>
                        <td className="p-4">{deal.company}</td>
                        <td className="p-4 font-mono text-zinc-400">{deal.email || 'No email'}<br /><span className="text-[10px]">{deal.phone || 'No phone'}</span></td>
                        <td className="p-4"><Badge variant="primary">{deal.stage}</Badge></td>
                        <td className="p-4 font-mono">${deal.dealValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedDeal && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">{selectedDeal.title}<Badge variant="primary">{selectedDeal.stage}</Badge></h2>
              <p className="text-xs text-zinc-400 mt-1">{selectedDeal.name} • {selectedDeal.company}</p>
            </div>
            <button onClick={() => setSelectedDeal(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4"><p className="text-[10px] uppercase text-zinc-500">Deal Value</p><p className="text-xl font-black text-white mt-1">${selectedDeal.dealValue.toLocaleString()}</p></Card>
              <Card className="p-4"><p className="text-[10px] uppercase text-zinc-500">Win Probability</p><p className="text-xl font-black text-blue-400 mt-1">{selectedDeal.probability}%</p></Card>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3 text-xs">
              <span className="flex gap-2 text-zinc-400"><Mail className="w-4 h-4" /><strong className="text-white font-mono">{selectedDeal.email || 'Not supplied'}</strong></span>
              <span className="flex gap-2 text-zinc-400"><Phone className="w-4 h-4" /><strong className="text-white font-mono">{selectedDeal.phone || 'Not supplied'}</strong></span>
              <span className="text-zinc-400">Mari lead score: <strong className="text-purple-300">{selectedDeal.aiLeadScore}/100</strong></span>
              <span className="text-zinc-400 border-t border-zinc-800 pt-3">Notes: <span className="text-zinc-200">{selectedDeal.notes || 'No notes yet.'}</span></span>
            </div>

            {stagePosition >= 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Move pipeline stage</p>
                <div className="flex items-center gap-2">
                  <Button variant="glass" size="sm" disabled={stagePosition <= 0} onClick={() => void updateStage(selectedDeal, PIPELINE_STAGES[stagePosition - 1])}><ChevronLeft className="w-4 h-4" /> Previous</Button>
                  <div className="flex-1 text-center text-xs font-bold text-white">{selectedDeal.stage}</div>
                  <Button variant="primary" size="sm" disabled={stagePosition >= PIPELINE_STAGES.length - 1} onClick={() => void updateStage(selectedDeal, PIPELINE_STAGES[stagePosition + 1])}>Next <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between gap-3">
            <Button variant="glass" size="sm" onClick={() => void deleteDeal(selectedDeal)}><Trash2 className="w-4 h-4" /> Delete</Button>
            <Button variant="primary" size="sm" onClick={() => openEdit(selectedDeal)}>Edit Deal</Button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Deal' : 'Add Deal / Lead'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contact name *" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Opportunity title" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.dealValue} onChange={(event) => setForm({ ...form, dealValue: event.target.value })} placeholder="Deal value" type="number" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white" />
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DealType })} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white">
            <option value="LEAD">Lead</option><option value="CUSTOMER">Customer</option><option value="SUPPLIER">Supplier</option><option value="PARTNER">Partner</option>
          </select>
          <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as DealStage })} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white">
            {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" rows={4} className="sm:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-white resize-none" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="glass" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={isSaving || !form.name.trim()} onClick={() => void saveDeal()}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Deal'}</Button>
        </div>
      </Modal>
    </div>
  );
}
