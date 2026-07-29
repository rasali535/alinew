'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Shield, Plus, FileText, Calendar, Truck, DollarSign, UserCheck, Download, Sparkles, X } from 'lucide-react';
import { generateEnterpriseDocument } from '@ralion/core';

interface FuneralCase {
  id: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  caseNumber: string;
  deceasedName: string;
  status: string;
  serviceDate: string;
}

interface ExtendedFuneralCase extends FuneralCase {
  familyContact: string;
  phone: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  totalCost: number;
  casketSelected?: string;
  hearseAssigned?: string;
}

const sampleRalionCases: ExtendedFuneralCase[] = [
  {
    id: 'f1',
    orgId: 'ralion-funeral-parlour',
    createdBy: 'u-ralion-admin',
    createdAt: '2026-07-24',
    updatedAt: '2026-07-24',
    caseNumber: 'FC-2026-088',
    deceasedName: 'Late Kgosi Phiri',
    familyContact: 'Kagiso Phiri (Son)',
    phone: '+267 71990011',
    serviceDate: 'Jul 29, 2026',
    casketSelected: 'Oak Deluxe Executive Casket',
    hearseAssigned: 'Mercedes-Benz Hearse #H-02',
    status: 'IN_PROGRESS',
    paymentStatus: 'PARTIAL',
    totalCost: 35000
  },
  {
    id: 'f2',
    orgId: 'ralion-funeral-parlour',
    createdBy: 'u-ralion-admin',
    createdAt: '2026-07-22',
    updatedAt: '2026-07-22',
    caseNumber: 'FC-2026-087',
    deceasedName: 'Late Mpho Khama',
    familyContact: 'Tshepo Khama (Brother)',
    phone: '+267 72110099',
    serviceDate: 'Jul 27, 2026',
    casketSelected: 'Mahogany Elite Casket',
    hearseAssigned: 'Cadillac Hearse #H-01',
    status: 'SCHEDULED',
    paymentStatus: 'PAID',
    totalCost: 42000
  }
];

export default function FuneralPluginPage() {
  const [cases, setCases] = useState<ExtendedFuneralCase[]>(sampleRalionCases);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    deceasedName: '',
    familyContact: '',
    phone: '+267 70000000',
    serviceDate: '2026-08-02',
    casketSelected: 'Oak Deluxe Executive Casket',
    totalCost: '35000'
  });

  const handleCreateCase = () => {
    if (!newCase.deceasedName || !newCase.familyContact) return;
    const created: ExtendedFuneralCase = {
      id: `f-${Date.now()}`,
      orgId: 'ralion-funeral-parlour',
      createdBy: 'u-admin',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      caseNumber: `FC-2026-0${cases.length + 89}`,
      deceasedName: newCase.deceasedName,
      familyContact: newCase.familyContact,
      phone: newCase.phone,
      serviceDate: newCase.serviceDate,
      casketSelected: newCase.casketSelected,
      hearseAssigned: 'Mercedes-Benz Hearse #H-03',
      status: 'SCHEDULED',
      paymentStatus: 'PENDING',
      totalCost: parseFloat(newCase.totalCost) || 35000
    };
    setCases(prev => [created, ...prev]);
    setIsModalOpen(false);
    setNewCase({ deceasedName: '', familyContact: '', phone: '+267 70000000', serviceDate: '2026-08-02', casketSelected: 'Oak Deluxe Executive Casket', totalCost: '35000' });
  };

  const handleExportPDF = (c: ExtendedFuneralCase) => {
    const docRes = generateEnterpriseDocument({
      templateType: 'FUNERAL_CONTRACT',
      orgName: 'Ralion Funeral Services',
      clientName: c.familyContact,
      clientEmail: c.phone,
      items: [
        { description: `Funeral Service Package — ${c.casketSelected}`, qty: 1, unitPrice: c.totalCost * 0.8 },
        { description: `Hearse Dispatch (${c.hearseAssigned})`, qty: 1, unitPrice: c.totalCost * 0.2 }
      ],
      notes: `Case Number: ${c.caseNumber}\nDeceased: ${c.deceasedName}\nService Date: ${c.serviceDate}`
    });

    const element = document.createElement('a');
    const file = new Blob([docRes.formattedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = docRes.fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Funeral OS</h1>
            <Badge variant="primary" className="gap-1 font-mono">
              <Shield className="w-3.5 h-3.5" /> Ralion Industry Vertical
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            "Empowered to Prosper" — Professional Bereavement Operations & Fleet Dispatch.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Create Funeral Case File
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase">Active Cases</span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{cases.length} Cases</div>
          <p className="text-[10px] text-zinc-500 mt-1">Ralion Funeral Registry</p>
        </Card>

        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase">Hearse Fleet Dispatches</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">2 Vehicles Active</div>
          <p className="text-[10px] text-zinc-500 mt-1">Mercedes & Cadillac Fleet</p>
        </Card>

        <Card className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase">Contract Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            ${cases.reduce((s, c) => s + c.totalCost, 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Total Case Contract Value</p>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ralion Funeral Case Registry</CardTitle>
          <CardDescription>Bereavement cases, casket selection, and family payment status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Case #</th>
                  <th className="p-4">Deceased Name</th>
                  <th className="p-4">Family Contact</th>
                  <th className="p-4">Casket Selected</th>
                  <th className="p-4">Hearse Fleet</th>
                  <th className="p-4">Service Date</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/40">
                    <td className="p-4 font-mono font-bold text-blue-400">{c.caseNumber}</td>
                    <td className="p-4 font-bold text-white">{c.deceasedName}</td>
                    <td className="p-4">
                      <div>{c.familyContact}</div>
                      <div className="text-[10px] text-zinc-500">{c.phone}</div>
                    </td>
                    <td className="p-4">{c.casketSelected}</td>
                    <td className="p-4 font-mono text-[11px] text-zinc-400">{c.hearseAssigned}</td>
                    <td className="p-4 font-mono text-zinc-400">{c.serviceDate}</td>
                    <td className="p-4">
                      <Badge variant={c.paymentStatus === 'PAID' ? 'success' : c.paymentStatus === 'PARTIAL' ? 'warning' : 'danger'}>
                        {c.paymentStatus} (${c.totalCost.toLocaleString()})
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleExportPDF(c)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Export Contract
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Create Ralion Funeral Case File</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-400 mb-1">Deceased Name</label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  value={newCase.deceasedName}
                  onChange={(e) => setNewCase({ ...newCase, deceasedName: e.target.value })}
                  placeholder="e.g. Late Kgosi Phiri"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">Family Representative</label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  value={newCase.familyContact}
                  onChange={(e) => setNewCase({ ...newCase, familyContact: e.target.value })}
                  placeholder="e.g. Kagiso Phiri (Son)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                    value={newCase.phone}
                    onChange={(e) => setNewCase({ ...newCase, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">Service Date</label>
                  <input
                    type="date"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                    value={newCase.serviceDate}
                    onChange={(e) => setNewCase({ ...newCase, serviceDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">Casket Package</label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  value={newCase.casketSelected}
                  onChange={(e) => setNewCase({ ...newCase, casketSelected: e.target.value })}
                >
                  <option value="Oak Deluxe Executive Casket">Oak Deluxe Executive Casket ($35,000)</option>
                  <option value="Mahogany Elite Casket">Mahogany Elite Casket ($42,000)</option>
                  <option value="Standard Cedar Casket">Standard Cedar Casket ($18,000)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">Total Contract Cost ($)</label>
                <input
                  type="number"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  value={newCase.totalCost}
                  onChange={(e) => setNewCase({ ...newCase, totalCost: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateCase}>
                  Create Case File
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
