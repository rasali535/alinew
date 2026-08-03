'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Users, Plus, Search, Filter, Phone, Mail, DollarSign, Calendar, MessageSquare, Sparkles, X, Clock, FileText, ChevronRight } from 'lucide-react';
type DealStage = 'LEAD' | 'CONTACTED' | 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CLOSED_WON' | 'CLOSED_LOST';
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


interface ContactItem {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: 'LEAD' | 'CUSTOMER' | 'SUPPLIER' | 'PARTNER';
  dealValue: number;
  stage: DealStage;
  tags: string[];
  aiLeadScore: number; // 0 - 100
  timeline: Array<{ type: string; title: string; date: string; note: string }>;
}

const initialContacts: ContactItem[] = [];

export default function CRMPage() {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [activeTab, setActiveTab] = useState<'PIPELINE' | 'CONTACTS'>('PIPELINE');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', company: '', email: '', phone: '', dealValue: '10000', stage: 'LEAD' as DealStage });

  const pipelineStages: DealStage[] = ['LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

  const filteredContacts = contacts.filter(c => typeFilter === 'ALL' || c.type === typeFilter);

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) return;
    const created: ContactItem = {
      id: Date.now().toString(),
      name: newContact.name,
      company: newContact.company || 'Independent',
      email: newContact.email,
      phone: newContact.phone || '+267 70000000',
      type: 'LEAD',
      dealValue: parseFloat(newContact.dealValue) || 10000,
      stage: newContact.stage,
      tags: ['New Lead'],
      aiLeadScore: 80,
      timeline: [{ type: 'NOTE', title: 'Lead Ingested', date: 'Today', note: 'Added via CRM Lead Form' }]
    };
    setContacts(prev => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewContact({ name: '', company: '', email: '', phone: '', dealValue: '10000', stage: 'LEAD' });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Universal CRM & Sales Pipeline</h1>
            <Badge variant="primary">Build Prompt 2</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ralion Business — Empowered to Prosper: Run your business smarter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('PIPELINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'PIPELINE' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              Sales Pipeline
            </button>
            <button
              onClick={() => setActiveTab('CONTACTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'CONTACTS' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              Contacts Directory
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add Lead / Contact
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter Type:
        </span>
        {['ALL', 'LEAD', 'CUSTOMER', 'SUPPLIER', 'PARTNER'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              typeFilter === t ? 'bg-blue-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sales Pipeline View */}
      {activeTab === 'PIPELINE' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageDeals = filteredContacts.filter(c => c.stage === stage);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);

            return (
              <div key={stage} className="flex flex-col gap-3 min-w-[200px] bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white tracking-wider">{stage}</span>
                  <Badge variant="default" className="text-[10px]">{stageDeals.length}</Badge>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono font-semibold">
                  Total: ${totalStageValue.toLocaleString()}
                </div>

                <div className="flex flex-col gap-2.5">
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      onClick={() => setSelectedContact(deal)}
                      className="p-3.5 hover:border-blue-500/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">{deal.name}</span>
                        <Badge variant="primary" className="text-[9px]">${(deal.dealValue / 1000).toFixed(0)}k</Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{deal.company}</p>
                      
                      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                        <span className="flex items-center gap-1 font-mono text-purple-400">
                          <Sparkles className="w-3 h-3" /> Mari AI: {deal.aiLeadScore}
                        </span>
                        <span className="font-mono text-blue-400 font-semibold">{DEAL_STAGE_PROBABILITIES[stage]}% win</span>
                      </div>
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center text-[11px] text-zinc-600">
                      No active deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contacts Table View */}
      {activeTab === 'CONTACTS' && (
        <Card>
          <CardHeader>
            <CardTitle>Contacts Directory</CardTitle>
            <CardDescription>All leads, active customers, suppliers, and partners</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Contact Name</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Email / Phone</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Mari Lead Score</th>
                    <th className="p-4">Deal Stage</th>
                    <th className="p-4 text-right">Deal Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold text-white">{contact.name}</td>
                      <td className="p-4 text-zinc-300">{contact.company}</td>
                      <td className="p-4 text-zinc-400 font-mono">{contact.email} <br /><span className="text-[10px]">{contact.phone}</span></td>
                      <td className="p-4">
                        <Badge variant={contact.type === 'CUSTOMER' ? 'success' : 'primary'}>{contact.type}</Badge>
                      </td>
                      <td className="p-4 font-mono font-bold text-purple-400">{contact.aiLeadScore}/100</td>
                      <td className="p-4">
                        <Badge variant="purple">{contact.stage}</Badge>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white">${contact.dealValue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slide-over Contact Detail & Activity Timeline Drawer */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {selectedContact.name}
                <Badge variant="primary">{selectedContact.type}</Badge>
              </h2>
              <p className="text-xs text-zinc-400">{selectedContact.company}</p>
            </div>
            <button
              onClick={() => setSelectedContact(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
            {/* Contact Details Card */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Email: <strong className="text-white font-mono">{selectedContact.email}</strong></span>
                <span>Phone: <strong className="text-white font-mono">{selectedContact.phone}</strong></span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/80">
                <span>Pipeline Value: <strong className="text-emerald-400 font-mono font-bold">${selectedContact.dealValue.toLocaleString()}</strong></span>
                <Badge variant="purple" className="gap-1">
                  <Sparkles className="w-3 h-3" /> Mari Score: {selectedContact.aiLeadScore}/100
                </Badge>
              </div>
            </div>

            {/* Interaction Timeline Feed */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Customer Interaction Timeline
              </h3>

              {selectedContact.timeline.map((act, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {act.type === 'CALL' && <Phone className="w-3 h-3 text-blue-400" />}
                      {act.type === 'EMAIL' && <Mail className="w-3 h-3 text-purple-400" />}
                      {act.type === 'NOTE' && <FileText className="w-3 h-3 text-emerald-400" />}
                      {act.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{act.date}</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] mt-1">{act.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedContact(null)}>
              Close
            </Button>
            <Button variant="primary" size="sm">
              <Phone className="w-3.5 h-3.5" /> Log Call / Activity
            </Button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Lead / Contact">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Full Name</label>
            <input
              type="text"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              placeholder="e.g. Kagiso Phiri"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Company Name</label>
            <input
              type="text"
              value={newContact.company}
              onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
              placeholder="e.g. Ras Ali Tech"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Email Address</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="email@company.com"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">Deal Value ($)</label>
              <input
                type="number"
                value={newContact.dealValue}
                onChange={(e) => setNewContact({ ...newContact, dealValue: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddContact}>Save Contact</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
