'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Plus, Sparkles, Mail, Phone, DollarSign, Calendar, ArrowRight, UserCheck } from 'lucide-react';
import { DealStage, DEAL_STAGE_PROBABILITIES } from '@ralion/core';

interface LeadItem {
  id: string;
  title: string;
  contactName: string;
  company: string;
  email: string;
  dealValue: number;
  stage: DealStage;
  aiScore: number;
}

const initialLeadsList: LeadItem[] = [];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>(initialLeadsList);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({ title: '', contactName: '', company: '', email: '', dealValue: '25000' });

  const pipelineStages = [
    { key: 'NEW_LEAD', label: 'New Lead' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'QUALIFIED', label: 'Qualified' },
    { key: 'PROPOSAL', label: 'Proposal' },
    { key: 'NEGOTIATION', label: 'Negotiation' },
    { key: 'WON', label: 'Won' },
    { key: 'LOST', label: 'Lost' },
  ];

  const handleCreateLead = () => {
    if (!newLead.title || !newLead.contactName) return;
    const created: LeadItem = {
      id: `ld-${Date.now()}`,
      title: newLead.title,
      contactName: newLead.contactName,
      company: newLead.company || 'Independent',
      email: newLead.email || 'contact@lead.com',
      dealValue: parseFloat(newLead.dealValue) || 25000,
      stage: 'NEW_LEAD' as any,
      aiScore: 75
    };
    setLeads(prev => [created, ...prev]);
    setIsModalOpen(false);
    setNewLead({ title: '', contactName: '', company: '', email: '', dealValue: '25000' });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Leads & Sales Funnel</h1>
            <Badge variant="primary">Ralion Business</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Empowered to Prosper — Move leads from initial intake to proposal, negotiation, and won.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
        {pipelineStages.map((stg) => {
          const stageLeads = leads.filter(l => l.stage === (stg.key as any));
          const totalVal = stageLeads.reduce((s, l) => s + l.dealValue, 0);

          return (
            <div key={stg.key} className="flex flex-col gap-3 min-w-[210px] bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-white tracking-wider">{stg.label}</span>
                <Badge variant="default" className="text-[10px]">{stageLeads.length}</Badge>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono font-semibold">
                Total: ${totalVal.toLocaleString()}
              </div>

              <div className="flex flex-col gap-2.5">
                {stageLeads.map((lead) => (
                  <Card key={lead.id} className="p-3.5 hover:border-blue-500/50 cursor-pointer transition-all">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">{lead.company}</span>
                    <h4 className="text-xs font-bold text-white">{lead.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{lead.contactName}</p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                      <span className="font-mono font-bold text-emerald-400">${(lead.dealValue / 1000).toFixed(0)}k</span>
                      <span className="flex items-center gap-1 font-mono text-purple-400">
                        <Sparkles className="w-3 h-3" /> Mari: {lead.aiScore}
                      </span>
                    </div>
                  </Card>
                ))}
                {stageLeads.length === 0 && (
                  <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-[11px] text-zinc-600">
                    No leads in stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Lead Opportunity">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Opportunity Title</label>
            <input
              type="text"
              value={newLead.title}
              onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
              placeholder="e.g. Enterprise License Contract"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Contact Name</label>
              <input
                type="text"
                value={newLead.contactName}
                onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                placeholder="e.g. Lesedi Mokgosi"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">Company</label>
              <input
                type="text"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                placeholder="e.g. Kalahari Mining"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Est. Deal Value ($)</label>
            <input
              type="number"
              value={newLead.dealValue}
              onChange={(e) => setNewLead({ ...newLead, dealValue: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateLead}>Save Lead</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
